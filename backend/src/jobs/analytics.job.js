/**
 * src/jobs/analytics.job.js
 * Daily analytics pre-computation — runs at midnight
 */
const cron = require('node-cron');
const { computeAnalytics } = require('../controllers/analytics.controller');
const { query } = require('../config/db');

const runAnalyticsUpdate = async () => {
    try {
        console.log('[Analytics] Running daily cache update...');
        const analytics = await computeAnalytics();

        await query(
            `INSERT INTO analytics_cache (data) VALUES ($1)`,
            [JSON.stringify(analytics)]
        );

        // Clean up old cache entries (keep last 7 days)
        await query(
            `DELETE FROM analytics_cache
             WHERE computed_at < NOW() - INTERVAL '7 days'`
        );

        console.log('[Analytics] Cache updated successfully');
    } catch (err) {
        console.error('[Analytics] Daily job error:', err.message);
    }
};

const startAnalyticsJob = () => {
    // Run at midnight every day
    cron.schedule('0 0 * * *', runAnalyticsUpdate, { timezone: 'Asia/Kolkata' });
    console.log('[Analytics] Daily job scheduled at midnight IST');

    // Run immediately on startup to populate cache
    runAnalyticsUpdate();
};

module.exports = { startAnalyticsJob, runAnalyticsUpdate };
