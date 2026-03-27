/**
 * src/services/news-impact.service.js
 * Project News & Civic Insights Engine — Fast + Fault-tolerant Production Build
 *
 * Source priority:
 *  1. Google News RSS  — 2 attempts max, 8s timeout, unquoted queries
 *  2. NewsData.io API  — secondary (if NEWSDATA_API_KEY set in env)
 *  3. Structured fallback — always returns meaningful UI, cached for 10 min
 *
 * Performance goals: < 3s response time, never hangs, never empty UI
 */

'use strict';

const https = require('https');
const http  = require('http');

const cache   = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ─── USER-AGENTS — rotated per request to reduce 503 rate ─────────────────
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
];
let uaIndex = 0;
const nextUA = () => USER_AGENTS[(uaIndex++) % USER_AGENTS.length];

// ─── NOISE FILTER ──────────────────────────────────────────────────────────
const NOISE_RE = /\b(crime|murder|killed|death|rape|suicide|covid|coronavirus|pandemic|celebrity|bollywood|hollywood|movie|actor|actress|cricket|ipl|match|tournament|election|vote|politician)\b/i;

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOW-LEVEL HTTPS GET — redirect-following, timeout-aware
// ─────────────────────────────────────────────────────────────────────────────

function httpsGet(urlStr, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const attempt = (currentUrl, redirectsLeft) => {
            let parsedUrl;
            try { parsedUrl = new URL(currentUrl); }
            catch (e) { return reject(new Error(`Bad URL: ${currentUrl}`)); }

            const lib     = parsedUrl.protocol === 'https:' ? https : http;
            const options = {
                hostname: parsedUrl.hostname,
                path:     parsedUrl.pathname + parsedUrl.search,
                method:   'GET',
                headers:  {
                    'User-Agent':      nextUA(),
                    'Accept':          'application/rss+xml, text/xml, */*',
                    'Accept-Language': 'en-IN,en;q=0.9',
                    // NOTE: Do NOT set Accept-Encoding.
                    // Node's https module does not auto-decompress gzip.
                    // Omitting this header forces Google to send plain UTF-8 XML.
                    'Cache-Control':   'no-cache',
                    'Connection':      'keep-alive',
                },
                timeout: timeoutMs,
            };

            const req = lib.request(options, (res) => {
                // Follow redirects
                if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                    if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
                    const next = res.headers.location.startsWith('http')
                        ? res.headers.location
                        : `${parsedUrl.protocol}//${parsedUrl.hostname}${res.headers.location}`;
                    res.resume();
                    return attempt(next, redirectsLeft - 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP_${res.statusCode}`));
                }

                const chunks = [];
                res.on('data', c => chunks.push(Buffer.from(c)));
                res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
                res.on('error', reject);
            });

            req.on('timeout', () => { req.destroy(); reject(new Error('HTTP_TIMEOUT')); });
            req.on('error',   reject);
            req.end();
        };

        attempt(urlStr, 5);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RETRY — 2 attempts max, minimal delay (fail fast)
//    3-attempt cascades caused 10s+ waits when Google 503s every time.
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, label) {
    const DELAYS = [0, 300]; // ms — fail fast: no long back-off
    for (let attempt = 1; attempt <= 2; attempt++) {
        if (DELAYS[attempt - 1] > 0) {
            await new Promise(r => setTimeout(r, DELAYS[attempt - 1]));
        }
        try {
            const xml = await httpsGet(url);
            if (attempt > 1) console.log(`[NewsImpact] ✅ "${label}" ok on attempt ${attempt}`);
            return xml;
        } catch (err) {
            console.warn(`[NewsImpact] ⚠️  "${label}" attempt ${attempt}/2 failed: ${err.message}`);
            if (attempt === 2) throw err;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b. NEWSDATA.IO — secondary source (requires NEWSDATA_API_KEY in env)
//     Only called if Google RSS returns 0 results or fails entirely.
// ─────────────────────────────────────────────────────────────────────────────

async function fetchNewsDataApi(projectName, aliases) {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return []; // not configured — skip silently

    const t0 = Date.now();
    try {
        // Use major project keywords (not full name — better recall)
        const q = projectName.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w.toLowerCase())).slice(0, 3).join(' ') || projectName;
        const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(q)}&country=in&language=en&category=politics,business,top`;
        console.log(`[NewsImpact] 🌐 NewsData.io query: "${q}"`);

        const json = await httpsGet(url, 8000);
        const parsed = JSON.parse(json);

        if (parsed.status !== 'success' || !Array.isArray(parsed.results)) {
            console.warn('[NewsImpact] NewsData.io: unexpected response', parsed.status);
            return [];
        }

        const items = parsed.results
            .filter(r => r.title && !NOISE_RE.test(r.title.toLowerCase()))
            .filter(r => aliases.some(alias => r.title.toLowerCase().includes(alias)))
            .map(r => ({
                title:          r.title.replace(/ - [^-]+$/, '').trim(),
                link:           r.link || r.source_url || '',
                source:         r.source_id || 'NewsData',
                published_date: r.pubDate || '',
            }));

        console.log(`[NewsImpact] 🌐 NewsData.io: ${parsed.results.length} raw → ${items.length} relevant (${Date.now()-t0}ms)`);
        return items;
    } catch (err) {
        console.warn(`[NewsImpact] 🌐 NewsData.io failed: ${err.message}`);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RSS PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseRssItems(xml) {
    const items = [];
    const seen  = new Set();
    const re    = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const title = m[1]
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/ - [^-]+$/, '').trim();
        if (!title || seen.has(title)) continue;
        seen.add(title);
        items.push({ title, link: m[2], source: m[3], published_date: m[4] });
    }
    return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROJECT ALIAS BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_ALIASES = {
    'bharat mandapam':   ['bharat mandapam', 'iecc', 'pragati maidan', 'itpo'],
    'namma metro':       ['namma metro', 'bmrcl', 'bengaluru metro', 'bangalore metro'],
    'delhi metro':       ['delhi metro', 'dmrc'],
    'mumbai metro':      ['mumbai metro', 'mmrda metro'],
    'kia':               ['kempegowda airport', 'bengaluru airport', 'bangalore airport'],
    'rrts':              ['rrts', 'rapid rail', 'regional rapid transit'],
    'whitefield metro':  ['whitefield metro', 'whitefield rail'],
    'hebbal flyover':    ['hebbal flyover', 'hebbal'],
};

const STOP_WORDS = new Set([
    'of','the','in','and','for','to','a','an','on','with','at','by','from',
    'project','phase','new','modernization','development','infrastructure',
    'improvement','update','status','extension','construction','expansion',
]);

function buildAliases(projectName) {
    const lower   = projectName.toLowerCase().trim();
    const aliases = new Set([lower]);

    for (const [key, group] of Object.entries(KNOWN_ALIASES)) {
        if (lower.includes(key)) { group.forEach(a => aliases.add(a)); break; }
    }

    // significant individual words from the project name
    lower.split(/\s+/)
         .filter(w => w.length > 3 && !STOP_WORDS.has(w))
         .forEach(w => aliases.add(w));

    return Array.from(aliases);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QUERY CASCADE BUILDER
//    Unquoted queries only — quoted queries trigger more aggressive 503 blocking.
//    2 queries: specific name, then major-words fallback.
// ─────────────────────────────────────────────────────────────────────────────

function buildQueryCascade(cleanName, aliases) {
    // Q1: full unquoted name — specific but not quoted (less blocking)
    const q1 = `${cleanName} India infrastructure`;

    // Q2: major words only — broadest, no stop words, least rate-limited
    const majorWords = cleanName.toLowerCase().split(/\s+/)
        .filter(w => w.length > 3 && !STOP_WORDS.has(w));
    const q2 = majorWords.length > 0
        ? `${majorWords.join(' ')} infrastructure India`
        : null;

    return [q1, q2].filter(Boolean).filter((q, i, arr) => arr.indexOf(q) === i);
}

function rssUrl(query) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. INSIGHT EXTRACTOR (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────

function extractInsights(articles) {
    const insights = [];
    const tags     = new Set();
    let   mainHighlight = null;

    const kw = {
        progress: /completed|inaugurated|opens|launched|finished|ready|starts|begins|update|speed/i,
        delays:   /delayed|stalled|postponed|halts|stops|protests|misses|snarls/i,
        benefits: /eases|reduces|saves|helps|boosts|improves/i,
        impact:   /capacity|lanes|beds|crore|km|passengers|vehicles/i,
    };

    articles.forEach(a => {
        const lower = a.title.toLowerCase();
        if (!mainHighlight && (kw.progress.test(lower) || kw.impact.test(lower))) {
            mainHighlight = a.title;
            if (kw.progress.test(lower)) tags.add('Progress');
            if (kw.impact.test(lower))   tags.add('Impact');
        } else if (insights.length < 5) {
            if      (kw.delays.test(lower))   { insights.push(`Delay Warning: ${a.title}`);   tags.add('Delayed'); }
            else if (kw.benefits.test(lower)) { insights.push(`Expected Benefit: ${a.title}`); tags.add('Benefit'); }
            else if (kw.progress.test(lower)) { insights.push(`Status Update: ${a.title}`);    tags.add('Progress'); }
            else if (kw.impact.test(lower))   { insights.push(`Civic Impact: ${a.title}`);     tags.add('Scale'); }
        }
    });

    if (!mainHighlight && articles.length > 0) mainHighlight = articles[0].title;

    for (let i = 0; insights.length < 4 && i < articles.length; i++) {
        const t = articles[i].title;
        if (t !== mainHighlight && !insights.some(ins => ins.includes(t))) insights.push(t);
    }

    if (tags.size === 0 && articles.length > 0) tags.add('News');
    return {
        mainHighlight: mainHighlight || null,
        insights,
        tags: Array.from(tags).slice(0, 3),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. STRUCTURED FALLBACK — never returns empty UI
// ─────────────────────────────────────────────────────────────────────────────

function makeFallback(projectName) {
    return {
        articles:      [],
        mainHighlight: `${projectName} is an active civic infrastructure project`,
        insights: [
            'Live news is temporarily unavailable for this project',
            'This project is part of ongoing urban development initiatives',
            'Check back shortly — news updates are fetched every 10 minutes',
        ],
        tags: ['Info'],
        _fallback: true,  // internal marker, not shown in UI
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CORE FETCH PIPELINE — multi-query, per-query isolation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches one RSS query. Returns [] (not throws) on failure.
 * Per-query isolation: one 503 never kills sibling queries.
 */
async function safeFetchAndFilter(query, aliases, label) {
    try {
        const t0 = Date.now();
        const url = rssUrl(query);
        console.log(`[NewsImpact] 🔍 [${label}]: ${query}`);
        const xml = await fetchWithRetry(url, label);
        const raw = parseRssItems(xml);

        const filtered = raw.filter(item => {
            const t = item.title.toLowerCase();
            if (NOISE_RE.test(t)) return false;
            return aliases.some(alias => t.includes(alias));
        });

        console.log(`[NewsImpact] ✅ [${label}] raw=${raw.length} relevant=${filtered.length} (${Date.now()-t0}ms)`);
        return filtered;
    } catch (err) {
        console.error(`[NewsImpact] ❌ [${label}] failed: ${err.message}`);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

exports.getProjectNews = async (projectName, area = '', category = '') => {
    const cleanName = projectName ? projectName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim() : '';

    if (!cleanName) {
        console.warn('[NewsImpact] Called with empty project name.');
        return { articles: [], insights: [], mainHighlight: null, tags: [] };
    }

    // ── Cache check ────────────────────────────────────────────────────────
    const cacheKey = `${cleanName}::${category}`;
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`[NewsImpact] ⚡ Cache HIT: "${cleanName}"`);
            return cached.data;
        }
        cache.delete(cacheKey);
    }

    const t0 = Date.now();
    console.log(`[NewsImpact] 🚀 START: "${cleanName}" | area="${area}" | category="${category}"`);

    const aliases = buildAliases(cleanName);
    console.log(`[NewsImpact] 🏷️  Aliases: [${aliases.join(', ')}]`);

    // ──────────────────────────────────────────────────────────────────────
    // Bharat Mandapam — hardcoded high-confidence path (still with resilience)
    // ──────────────────────────────────────────────────────────────────────
    if (cleanName.toLowerCase().includes('bharat mandapam')) {
        // Unquoted queries only — quoted ones get 503'd more aggressively
        const queries = [
            { q: 'Bharat Mandapam India',  label: 'BM-name' },
            { q: 'Pragati Maidan IECC',    label: 'BM-alias' },
        ];

        const allItems = [];
        const seenLinks = new Set();

        await Promise.allSettled(
            queries.map(({ q, label }) =>
                safeFetchAndFilter(q, aliases, label).then(items => {
                    for (const item of items) {
                        if (!seenLinks.has(item.link)) {
                            seenLinks.add(item.link);
                            allItems.push(item);
                        }
                    }
                })
            )
        );

        allItems.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
        const top = allItems.slice(0, 8);

        const finalData = {
            articles: top,
            ...extractInsights(top),
            mainHighlight: "India's largest convention centre at Pragati Maidan, inaugurated July 2023",
            insights: [
                'Built 2017–2023 as part of Pragati Maidan integrated redevelopment',
                'Core Purpose: Hosts G20, international summits, trade fairs, and cultural events',
                ...(extractInsights(top).insights),
            ].slice(0, 5),
            tags: extractInsights(top).tags,
        };

        if (top.length > 0) {
            cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
            console.log(`[NewsImpact] ✅ Bharat Mandapam: ${top.length} articles cached (${Date.now()-t0}ms)`);
        } else {
            // Fallback — also cached so repeated requests don't keep hitting 503
            console.warn('[NewsImpact] ⚠️  Bharat Mandapam: 0 articles — caching structured fallback');
            const fb = makeFallback(cleanName);
            cache.set(cacheKey, { timestamp: Date.now(), data: fb });
            return fb;
        }
        return finalData;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Generic project — 2 RSS queries in parallel + NewsData.io if needed
    // ──────────────────────────────────────────────────────────────────────
    const queryCascade = buildQueryCascade(cleanName, aliases);
    console.log(`[NewsImpact] 🎯 RSS queries: ${JSON.stringify(queryCascade)}`);

    const seenLinks = new Set();
    const allItems  = [];

    // Run RSS queries in parallel (fail-fast, per-query isolated)
    const rssResults = await Promise.allSettled(
        queryCascade.map((q, i) => safeFetchAndFilter(q, aliases, `Q${i + 1}`))
    );

    for (const result of rssResults) {
        if (result.status === 'fulfilled') {
            for (const item of result.value) {
                if (!seenLinks.has(item.link)) {
                    seenLinks.add(item.link);
                    allItems.push(item);
                }
            }
        }
    }

    // ── Secondary source: NewsData.io (only if RSS returned nothing) ────────
    if (allItems.length === 0) {
        console.log(`[NewsImpact] 📡 RSS returned 0 — trying NewsData.io secondary source`);
        const ndItems = await fetchNewsDataApi(cleanName, aliases);
        for (const item of ndItems) {
            if (!seenLinks.has(item.link)) {
                seenLinks.add(item.link);
                allItems.push(item);
            }
        }
    }

    // ── All sources exhausted → structured fallback (cached) ───────────────
    if (allItems.length === 0) {
        console.warn(`[NewsImpact] ⚠️  All sources returned 0 articles for "${cleanName}" (${Date.now()-t0}ms) — caching fallback`);
        const fb = makeFallback(cleanName);
        cache.set(cacheKey, { timestamp: Date.now(), data: fb }); // cache fallback to avoid repeated slow calls
        return fb;
    }

    // Sort DESC, limit
    allItems.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
    const top = allItems.slice(0, 8);

    const finalData = {
        articles: top,
        ...extractInsights(top),
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
    console.log(`[NewsImpact] ✅ DONE: "${cleanName}" — ${top.length} articles cached (${Date.now()-t0}ms total)`);

    return finalData;
};
