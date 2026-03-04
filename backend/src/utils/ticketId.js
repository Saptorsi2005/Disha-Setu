/**
 * src/utils/ticketId.js
 * Generate a deterministic civic ticket ID: GF-YYYY-XXXX
 */
const generateTicketId = () => {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `GF-${year}-${rand}`;
};

module.exports = { generateTicketId };
