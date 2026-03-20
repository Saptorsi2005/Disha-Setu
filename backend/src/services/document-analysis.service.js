/**
 * src/services/document-analysis.service.js
 * Document-Aware Flow Navigation — AI-assisted intent extraction
 * EXTENSION ONLY: Does NOT modify any existing service or routing logic.
 */
const { query } = require('../config/db');
const { findRoute, getRoomDetails } = require('./indoor-navigation.service');

// ── Intent → Room Type Mapping ──────────────────────────────────
const INTENT_TO_ROOM_TYPE = {
    // Blood / Lab
    'blood test': 'medical',
    'lab test': 'medical',
    'laboratory': 'medical',
    'sample collection': 'medical',
    'pathology': 'medical',
    'haemogram': 'medical',
    'cbc': 'medical',
    'radiology': 'medical',
    'x-ray': 'medical',
    'xray': 'medical',
    'mri': 'medical',
    'ct scan': 'medical',
    'ultrasound': 'medical',
    'ecg': 'medical',
    'echo': 'medical',

    // Consultation / OPD
    'consultation': 'office',
    'opd': 'office',
    'outpatient': 'office',
    'doctor': 'office',
    'appointment': 'office',
    'specialist': 'office',

    // Medicine / Pharmacy
    'medicine': 'shop',
    'pharmacy': 'shop',
    'prescription': 'shop',
    'tablet': 'shop',
    'capsule': 'shop',
    'syrup': 'shop',
    'drug': 'shop',
    'medication': 'shop',

    // Emergency
    'emergency': 'emergency',
    'accident': 'emergency',
    'critical': 'emergency',
    'urgent': 'emergency',

    // Admission / Registration
    'admission': 'reception',
    'registration': 'reception',
    'token': 'reception',
    'reception': 'reception',
    'counter': 'reception',
    'billing': 'reception',
    'payment': 'reception',
    'discharge': 'reception',

    // Wards / Inpatient
    'ward': 'waiting',
    'icu': 'waiting',
    'bed': 'waiting',
    'inpatient': 'waiting',

    // Facilities
    'cafeteria': 'cafeteria',
    'canteen': 'cafeteria',
    'food': 'cafeteria',
    'restroom': 'restroom',
    'washroom': 'restroom',
    'toilet': 'restroom',
    'atm': 'atm',
    'cash': 'atm',
};

// Standard navigation flow — always start from entrance and end when steps done
const FLOW_PREFIX = ['entrance'];

/**
 * Extract text from uploaded file buffer
 * @param {Buffer} buffer 
 * @param {string} mimetype
 */
async function extractTextFromBuffer(buffer, mimetype) {
    if (mimetype === 'application/pdf') {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            return data.text;
        } catch (err) {
            console.warn('[DocAnalysis] PDF parse failed:', err.message);
            return '';
        }
    }

    // For images or plain text — convert buffer to string directly
    // (OCR is skipped for now; if a Gemini key is present, it will handle images)
    try {
        return buffer.toString('utf-8');
    } catch {
        return '';
    }
}

/**
 * Keyword-based intent extraction (primary, no external API needed)
 * @param {string} text
 * @returns {string[]} list of matched intents
 */
function extractIntentsFromText(text) {
    const lower = text.toLowerCase();
    const found = new Set();
    for (const keyword of Object.keys(INTENT_TO_ROOM_TYPE)) {
        if (lower.includes(keyword)) {
            found.add(keyword);
        }
    }
    return Array.from(found);
}

/**
 * Optional: If GEMINI_API_KEY is in env, use it for richer intent extraction
 * Falls back gracefully if not configured.
 */
async function extractIntentsWithAI(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are a hospital navigation assistant. Analyze the following medical document text and extract the list of services the patient needs.

Document text:
"""${text.slice(0, 2000)}"""

Return a JSON array of intent strings only, nothing else. Example: ["blood test", "consultation", "pharmacy"]
Only include intents from this list: blood test, lab test, consultation, opd, medicine, pharmacy, prescription, emergency, registration, admission, radiology, x-ray, ecg, ultrasound, mri, ward, cafeteria, restroom
`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        const match = raw.match(/\[.*?\]/s);
        if (match) return JSON.parse(match[0]);
        return null;
    } catch (err) {
        console.warn('[DocAnalysis] Gemini AI extraction failed, using keyword fallback:', err.message);
        return null;
    }
}

/**
 * Map intents to room types with deduplication and ordering
 */
function mapIntentsToRoomTypes(intents) {
    const seen = new Set();
    const result = [];

    // Always start with entrance and reception for flow
    for (const intent of intents) {
        const roomType = INTENT_TO_ROOM_TYPE[intent];
        if (roomType && !seen.has(roomType)) {
            seen.add(roomType);
            result.push({ intent, roomType });
        }
    }
    return result;
}

/**
 * Find best matching room for a given type in a building
 */
async function findRoomForType(buildingId, roomType) {
    const result = await query(
        `SELECT r.id, r.name, r.type, f.floor_number
         FROM rooms r
         JOIN floors f ON r.floor_id = f.id
         JOIN buildings b ON f.building_id = b.id
         WHERE b.id = $1 AND r.type = $2
         ORDER BY r.is_landmark DESC, r.name
         LIMIT 1`,
        [buildingId, roomType]
    );
    return result.rows[0] || null;
}

/**
 * Build a multi-step route through an ordered list of rooms
 */
async function buildMultiStepRoute(orderedRooms, accessibleOnly = false) {
    if (orderedRooms.length < 2) {
        return { found: false, message: 'Not enough rooms to build a route.' };
    }

    let combinedPath = [];
    let combinedDirections = [];
    let totalDistance = 0;
    const legs = [];

    for (let i = 0; i < orderedRooms.length - 1; i++) {
        const fromRoom = orderedRooms[i];
        const toRoom = orderedRooms[i + 1];

        try {
            const route = await findRoute(fromRoom.id, toRoom.id, { accessibleOnly });
            if (route.found) {
                if (combinedPath.length > 0) {
                    combinedPath.push(...route.path.slice(1));
                } else {
                    combinedPath.push(...route.path);
                }
                totalDistance += route.distance;
                const offset = combinedDirections.length;
                combinedDirections.push(...route.directions.map(d => ({ ...d, step: d.step + offset })));
                legs.push({ from: fromRoom.name, to: toRoom.name, distance: route.distance, found: true });
            } else {
                legs.push({ from: fromRoom.name, to: toRoom.name, found: false, message: route.message });
            }
        } catch (err) {
            console.warn(`[DocAnalysis] Route leg failed ${fromRoom.name} → ${toRoom.name}:`, err.message);
            legs.push({ from: fromRoom.name, to: toRoom.name, found: false, message: err.message });
        }
    }

    if (combinedPath.length === 0) {
        return { found: false, message: 'Could not build any route from the detected intents.' };
    }

    return {
        found: true,
        totalDistance,
        path: combinedPath,
        directions: combinedDirections,
        legs,
        from: { name: orderedRooms[0].name, floor: orderedRooms[0].floor_number },
        to: { name: orderedRooms[orderedRooms.length - 1].name, floor: orderedRooms[orderedRooms.length - 1].floor_number },
    };
}

/**
 * Main entry point: analyze document buffer and return navigation plan
 */
async function analyzeDocumentAndRoute(fileBuffer, mimetype, buildingId, options = {}) {
    const { accessibleOnly = false } = options;

    // Step 1: Extract text
    const rawText = await extractTextFromBuffer(fileBuffer, mimetype);

    // Step 2: Extract intents (AI first, then keyword fallback)
    let intents = null;
    if (rawText.length > 10) {
        intents = await extractIntentsWithAI(rawText);
    }
    if (!intents || intents.length === 0) {
        intents = extractIntentsFromText(rawText || '');
    }

    // Step 3: Map intents to room types
    const mappedRooms = mapIntentsToRoomTypes(intents);

    if (mappedRooms.length === 0) {
        return {
            found: false,
            message: 'No recognizable medical intents found in the document.',
            rawText: rawText.slice(0, 300),
            intents: [],
            mappedRooms: [],
            steps: [],
            route: null,
        };
    }

    // Step 4: Find entrance first, then matched rooms
    const entranceRoom = await findRoomForType(buildingId, 'entrance');
    const roomsToVisit = [];

    if (entranceRoom) roomsToVisit.push(entranceRoom);

    for (const { roomType } of mappedRooms) {
        const room = await findRoomForType(buildingId, roomType);
        if (room && !roomsToVisit.find(r => r.id === room.id)) {
            roomsToVisit.push(room);
        }
    }

    // Step 5: Build the route
    const route = roomsToVisit.length >= 2 
        ? await buildMultiStepRoute(roomsToVisit, accessibleOnly) 
        : { found: false, message: 'Could not find enough rooms in this building for the detected intents.' };

    return {
        found: route.found,
        intents,
        mappedRooms: mappedRooms.map(m => ({ intent: m.intent, roomType: m.roomType })),
        steps: roomsToVisit.map(r => ({ id: r.id, name: r.name, type: r.type, floor: r.floor_number })),
        route: route.found ? route : null,
        message: route.found ? null : route.message,
    };
}

module.exports = { analyzeDocumentAndRoute };
