/**
 * src/controllers/analytics.controller.js
 * District-level civic analytics
 */
const { query } = require('../config/db');

// ── GET /api/analytics/district ────────────────────────────────
const getDistrictAnalytics = async (req, res, next) => {
    try {
        // Check analytics cache first (updated daily by the analytics job)
        const cacheResult = await query(
            `SELECT data, computed_at FROM analytics_cache
             WHERE computed_at > NOW() - INTERVAL '24 hours'
             ORDER BY computed_at DESC LIMIT 1`
        );

        if (cacheResult.rows.length > 0) {
            return res.json({
                ...cacheResult.rows[0].data,
                cached: true,
                computedAt: cacheResult.rows[0].computed_at,
            });
        }

        // Compute fresh analytics
        const analytics = await computeAnalytics();

        // Store in cache
        await query(
            `INSERT INTO analytics_cache (data) VALUES ($1)`,
            [JSON.stringify(analytics)]
        );

        res.json({ ...analytics, cached: false });
    } catch (err) {
        next(err);
    }
};

const computeAnalytics = async () => {
    // Overall counts
    const countRes = await query(
        `SELECT
            COUNT(*)                                       AS total,
            COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
            COUNT(*) FILTER (WHERE status = 'Completed')   AS completed,
            COUNT(*) FILTER (WHERE status = 'Delayed')     AS delayed,
            COUNT(*) FILTER (WHERE status = 'Planned')     AS planned,
            ROUND(AVG(progress_percentage)::numeric, 1)    AS avg_completion,
            SUM(budget)                                    AS total_budget_raw
         FROM projects`
    );
    const counts = countRes.rows[0];

    // Projects per category
    const categoryRes = await query(
        `SELECT category,
                COUNT(*) AS count,
                SUM(budget) AS budget,
                ROUND(AVG(progress_percentage)::numeric, 1) AS avg_progress
         FROM projects
         GROUP BY category
         ORDER BY count DESC`
    );

    // Most delayed category
    const delayedRes = await query(
        `SELECT category, COUNT(*) AS delayed_count
         FROM projects
         WHERE status = 'Delayed'
         GROUP BY category
         ORDER BY delayed_count DESC
         LIMIT 1`
    );

    // Status breakdown
    const statusRes = await query(
        `SELECT status, COUNT(*) AS count
         FROM projects
         GROUP BY status`
    );

    // Format budget totals
    const formatBudget = (raw) => {
        if (!raw) return '₹0';
        const crore = raw / 10_000_000;
        return crore >= 100 ? `₹${(crore / 100).toFixed(1)}k Cr` : `₹${crore.toFixed(0)} Cr`;
    };

    return {
        overview: {
            total: parseInt(counts.total),
            inProgress: parseInt(counts.in_progress),
            completed: parseInt(counts.completed),
            delayed: parseInt(counts.delayed),
            planned: parseInt(counts.planned),
            avgCompletion: parseFloat(counts.avg_completion || 0),
            totalBudget: formatBudget(counts.total_budget_raw),
        },
        byCategory: categoryRes.rows.map(r => ({
            category: r.category,
            count: parseInt(r.count),
            budget: formatBudget(r.budget),
            avgProgress: parseFloat(r.avg_progress || 0),
        })),
        byStatus: statusRes.rows.map(r => ({
            status: r.status,
            count: parseInt(r.count),
        })),
        mostDelayedCategory: delayedRes.rows[0]
            ? { category: delayedRes.rows[0].category, count: parseInt(delayedRes.rows[0].delayed_count) }
            : null,
    };
};

module.exports = { getDistrictAnalytics, computeAnalytics };
