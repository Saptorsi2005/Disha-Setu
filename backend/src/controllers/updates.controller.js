/**
 * src/controllers/updates.controller.js
 * Project update timeline — also triggers Socket.io events
 */
const { query } = require('../config/db');
const { createNotification } = require('../services/notifications.service');
const { getIO } = require('../sockets');

// ── GET /api/projects/:id/updates ─────────────────────────────
const getProjectUpdates = async (req, res, next) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const result = await query(
            `SELECT
                pu.id, pu.title, pu.body, pu.update_type,
                pu.old_status, pu.new_status, pu.created_at
             FROM project_updates pu
             WHERE pu.project_id = $1
             ORDER BY pu.created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );

        res.json({ updates: result.rows });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/projects/:id/updates ────────────────────────────
// Admin: add an update, trigger real-time events + notifications
const addProjectUpdate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, body, update_type, new_status } = req.body;

        if (!title) return res.status(400).json({ error: 'title is required' });

        // Get current project status
        const projRes = await query(`SELECT status, name FROM projects WHERE id = $1`, [id]);
        if (projRes.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        const project = projRes.rows[0];
        const oldStatus = project.status;

        // Insert update record
        const updateResult = await query(
            `INSERT INTO project_updates
                (project_id, author_id, title, body, update_type, old_status, new_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, created_at`,
            [id, req.user?.id || null, title, body || null, update_type || 'general', oldStatus, new_status || null]
        );

        // Update project status if changed
        if (new_status && new_status !== oldStatus) {
            await query(
                `UPDATE projects SET status = $1, last_updated = NOW() WHERE id = $2`,
                [new_status, id]
            );
        } else {
            await query(`UPDATE projects SET last_updated = NOW() WHERE id = $1`, [id]);
        }

        const update = updateResult.rows[0];

        // Emit to Socket.io room: project:{id}
        const io = getIO();
        const eventPayload = {
            projectId: id,
            projectName: project.name,
            updateId: update.id,
            title,
            body: body || null,
            updateType: update_type || 'general',
            oldStatus,
            newStatus: new_status || oldStatus,
            createdAt: update.created_at,
        };
        io.to(`project:${id}`).emit('project_update', eventPayload);

        // Determine notification type
        let notifType = 'status_change';
        if (new_status === 'Completed') notifType = 'completed';
        if (new_status === 'Delayed') notifType = 'delay';

        const notifTitle = title;
        const notifMessage = body || `${project.name} has been updated.`;

        // Notify all users subscribed to this project's updates
        const subRes = await query(
            `SELECT DISTINCT user_id FROM notifications WHERE project_id = $1`,
            [id]
        );
        // Fallback: notify all users with push tokens who have viewed this project
        const usersRes = await query(
            `SELECT DISTINCT ua.user_id
             FROM user_activity ua
             INNER JOIN push_tokens pt ON pt.user_id = ua.user_id
             WHERE ua.project_id = $1`,
            [id]
        );

        const userIds = [...new Set(usersRes.rows.map(r => r.user_id))];
        for (const userId of userIds) {
            await createNotification({
                userId, projectId: id,
                type: notifType,
                title: notifTitle,
                message: notifMessage,
            });
            // Also emit to user's personal room
            io.to(`user:${userId}`).emit('new_notification', {
                type: notifType, title: notifTitle, message: notifMessage, projectId: id,
            });
        }

        res.status(201).json({ update: eventPayload });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProjectUpdates, addProjectUpdate };
