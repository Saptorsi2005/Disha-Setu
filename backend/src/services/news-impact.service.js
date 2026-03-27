/**
 * src/services/news-impact.service.js
 * Project News & Civic Insights Engine
 *
 * Strategy: FETCH BROAD → FILTER SMART → FALLBACK GRACEFULLY
 *
 *  1. Extract 1-2 meaningful keywords from project name
 *  2. One broad Google News RSS query using those keywords
 *  3. Filter fetched articles in 3 layers:
 *       L1 — project keyword match + area match + no noise  (strictest)
 *       L2 — project keyword match + no noise               (relax area)
 *       L3 — top articles by infra relevance (best-effort)
 *  4. Structured fallback if RSS fails entirely
 *  5. Everything cached 10 min (including fallback)
 *
 *  Performance: single RSS request, 8s timeout, no unnecessary retries
 */

'use strict';

const https = require('https');
const http  = require('http');

const cache     = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ── USER-AGENT ROTATION ────────────────────────────────────────────────────
const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
];
let uaIdx = 0;
const nextUA = () => UAS[(uaIdx++) % UAS.length];

// ── NOISE FILTER ────────────────────────────────────────────────────────────
const NOISE_RE = /\b(crime|murder|killed|death|rape|suicide|covid|coronavirus|pandemic|celebrity|bollywood|hollywood|movie|actor|actress|cricket|ipl|match|tournament|election|vote|politician|arrest|scam|fraud)\b/i;

// ── INFRA SIGNAL ────────────────────────────────────────────────────────────
const INFRA_RE = /\b(metro|road|highway|flyover|bridge|pipeline|infrastructure|construction|project|corridor|terminal|hospital|airport|station|rail|transit|development|facility|expansion)\b/i;

// ── STOP WORDS (stripped from project name when building keywords) ──────────
const STOP_WORDS = new Set([
    'of','the','in','and','for','to','a','an','on','with','at','by','from',
    'project','phase','new','modernization','development','infrastructure',
    'improvement','update','status','extension','construction','expansion',
    'corridor','district','municipal','city','urban','national','under',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 1. HTTPS GET — redirect-following, timeout-aware, no gzip (Node can't decompress)
// ─────────────────────────────────────────────────────────────────────────────

function httpsGet(urlStr, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const attempt = (currentUrl, hops) => {
            let parsed;
            try { parsed = new URL(currentUrl); }
            catch (e) { return reject(new Error(`Bad URL: ${currentUrl}`)); }

            const lib = parsed.protocol === 'https:' ? https : http;
            const req = lib.request({
                hostname: parsed.hostname,
                path:     parsed.pathname + parsed.search,
                method:   'GET',
                headers:  {
                    'User-Agent':      nextUA(),
                    'Accept':          'application/rss+xml, text/xml, application/json, */*',
                    'Accept-Language': 'en-IN,en;q=0.9',
                    // DO NOT set Accept-Encoding — Node https doesn't auto-decompress
                    'Cache-Control':   'no-cache',
                },
                timeout: timeoutMs,
            }, (res) => {
                if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                    if (hops <= 0) return reject(new Error('Too many redirects'));
                    const next = res.headers.location.startsWith('http')
                        ? res.headers.location
                        : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
                    res.resume();
                    return attempt(next, hops - 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP_${res.statusCode}`));
                }
                const chunks = [];
                res.on('data',  c => chunks.push(Buffer.from(c)));
                res.on('end',   () => resolve(Buffer.concat(chunks).toString('utf8')));
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
// 2. RSS PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseRss(xml) {
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
// 3. KEYWORD EXTRACTOR  ← core of the "broad fetch" strategy
//    Takes 1-3 most meaningful words from the project name.
//    These become the RSS query — broad enough to return results,
//    then filtered smartly afterwards.
// ─────────────────────────────────────────────────────────────────────────────

// Known project aliases — exact names used in news
const KNOWN_ALIASES = {
    'bharat mandapam': ['bharat mandapam', 'iecc', 'pragati maidan', 'itpo'],
    'namma metro':     ['namma metro', 'bmrcl', 'bengaluru metro', 'bangalore metro'],
    'delhi metro':     ['delhi metro', 'dmrc'],
    'mumbai metro':    ['mumbai metro', 'mmrda metro'],
    'rrts':            ['rrts', 'rapid rail', 'regional rapid transit'],
    'whitefield metro':['whitefield metro', 'whitefield rail'],
    'hebbal flyover':  ['hebbal flyover', 'hebbal'],
    'kia':             ['kempegowda airport', 'bengaluru airport', 'bangalore airport'],
};

function extractKeywords(projectName) {
    const lower = projectName.toLowerCase().trim();

    // Check known alias groups first — these are the best search terms
    for (const [key] of Object.entries(KNOWN_ALIASES)) {
        if (lower.includes(key)) return [key]; // e.g. "namma metro"
    }

    // Generic: take up to 3 meaningful words from the name
    const words = lower.split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    return words.slice(0, 3); // e.g. ["hebbal", "flyover"]
}

function buildAliases(projectName) {
    const lower   = projectName.toLowerCase().trim();
    const aliases = new Set([lower]);

    for (const [key, group] of Object.entries(KNOWN_ALIASES)) {
        if (lower.includes(key)) { group.forEach(a => aliases.add(a)); break; }
    }
    lower.split(/\s+/)
         .filter(w => w.length > 3 && !STOP_WORDS.has(w))
         .forEach(w => aliases.add(w));

    return Array.from(aliases);
}

function buildAreaAliases(area) {
    const a = (area || '').toLowerCase();
    if (!a) return [];
    if (a.includes('bangalore') || a.includes('bengaluru')) return ['bangalore','bengaluru','karnataka','blr'];
    if (a.includes('delhi'))    return ['delhi','new delhi','ncr'];
    if (a.includes('mumbai') || a.includes('bombay')) return ['mumbai','bombay','maharashtra'];
    if (a.includes('kolkata') || a.includes('calcutta')) return ['kolkata','calcutta','west bengal'];
    if (a.includes('chennai') || a.includes('madras'))   return ['chennai','madras','tamil nadu'];
    if (a.includes('hyderabad'))  return ['hyderabad','telangana'];
    if (a.includes('pune'))       return ['pune','pcmc','maharashtra'];
    if (a.includes('ahmedabad'))  return ['ahmedabad','gujarat'];
    return [a.replace(/(city|district)/g, '').trim()].filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMART 3-LAYER FILTER
//
//  L1 (strict)  — project keyword + area + no noise
//  L2 (medium)  — project keyword + no noise  (drop area condition)
//  L3 (loose)   — infra relevance + no noise  (best-effort, top 3)
// ─────────────────────────────────────────────────────────────────────────────

function filterArticles(raw, projectAliases, areaAliases) {
    const hasAlias  = t => projectAliases.some(a => t.includes(a));
    const hasArea   = t => areaAliases.length === 0 || areaAliases.some(a => t.includes(a));
    const isClean   = t => !NOISE_RE.test(t);
    const hasInfra  = t => INFRA_RE.test(t);

    // L1 — project + area + no noise
    const l1 = raw.filter(a => { const t = a.title.toLowerCase(); return isClean(t) && hasAlias(t) && hasArea(t); });
    if (l1.length >= 2) { console.log(`[NewsImpact] 🔵 L1 filter: ${l1.length} articles`); return { tier: 'L1', items: l1 }; }

    // L2 — project + no noise (relax area)
    const l2 = raw.filter(a => { const t = a.title.toLowerCase(); return isClean(t) && hasAlias(t); });
    if (l2.length >= 1) { console.log(`[NewsImpact] 🟡 L2 filter (relaxed area): ${l2.length} articles`); return { tier: 'L2', items: l2 }; }

    // L3 — infra + no noise (best-effort — at least says something useful)
    const l3 = raw.filter(a => { const t = a.title.toLowerCase(); return isClean(t) && hasInfra(t); }).slice(0, 4);
    if (l3.length >= 1) { console.log(`[NewsImpact] 🟠 L3 filter (best-effort infra): ${l3.length} articles`); return { tier: 'L3', items: l3 }; }

    console.log('[NewsImpact] ⚪ All filter layers returned 0');
    return { tier: 'NONE', items: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INSIGHT EXTRACTOR
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
            if      (kw.delays.test(lower))   { insights.push(`Delay Warning: ${a.title}`);    tags.add('Delayed'); }
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
// 6. STRUCTURED FALLBACK
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
        tags:      ['Info'],
        _fallback: true,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

exports.getProjectNews = async (projectName, area = '', category = '') => {
    const cleanName = projectName ? projectName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim() : '';

    if (!cleanName) {
        console.warn('[NewsImpact] Empty project name — returning empty.');
        return { articles: [], insights: [], mainHighlight: null, tags: [] };
    }

    // ── Cache check ──────────────────────────────────────────────────────────
    const cacheKey = `${cleanName}::${area}`;
    if (cache.has(cacheKey)) {
        const { timestamp, data } = cache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_TTL) {
            console.log(`[NewsImpact] ⚡ Cache HIT: "${cleanName}"`);
            return data;
        }
        cache.delete(cacheKey);
    }

    const t0      = Date.now();
    const aliases = buildAliases(cleanName);
    const areaAli = buildAreaAliases(area);
    const kws     = extractKeywords(cleanName);

    console.log(`[NewsImpact] 🚀 "${cleanName}" | area="${area}" | keywords=[${kws.join(', ')}] | aliases=[${aliases.slice(0,4).join(', ')}]`);

    // ── Bharat Mandapam — hardcoded high-confidence path ────────────────────
    const isBM = cleanName.toLowerCase().includes('bharat mandapam');
    const finalQueries = isBM
        ? ['Bharat Mandapam India', 'Pragati Maidan IECC']
        : [`${kws.join(' ')} India infrastructure`, `${kws.join(' ')} India`];

    // ── Single broad RSS fetch (+ one fallback if 0 raw results) ────────────
    let raw = [];
    for (const q of finalQueries) {
        if (raw.length > 0) break; // got results from first query
        try {
            const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
            console.log(`[NewsImpact] 🔍 RSS: "${q}"`);
            const xml = await httpsGet(url, 8000);
            raw = parseRss(xml);
            console.log(`[NewsImpact] 📄 Raw articles from RSS: ${raw.length}`);
        } catch (err) {
            console.warn(`[NewsImpact] ⚠️  RSS failed for "${q}": ${err.message}`);
        }
    }

    // ── NewsData.io — only if RSS returned nothing ───────────────────────────
    if (raw.length === 0 && process.env.NEWSDATA_API_KEY) {
        const apiKey = process.env.NEWSDATA_API_KEY;
        const ndQuery = kws.slice(0, 2).join(' ');
        try {
            const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(ndQuery)}&country=in&language=en&category=politics,business,top`;
            console.log(`[NewsImpact] 🌐 NewsData.io fallback: "${ndQuery}"`);
            const json = await httpsGet(url, 7000);
            const parsed = JSON.parse(json);
            if (parsed.status === 'success' && Array.isArray(parsed.results)) {
                raw = parsed.results
                    .filter(r => r.title)
                    .map(r => ({
                        title:          r.title.replace(/ - [^-]+$/, '').trim(),
                        link:           r.link || r.source_url || '',
                        source:         r.source_id || 'NewsData',
                        published_date: r.pubDate || '',
                    }));
                console.log(`[NewsImpact] 🌐 NewsData.io raw: ${raw.length}`);
            }
        } catch (err) {
            console.warn(`[NewsImpact] 🌐 NewsData.io failed: ${err.message}`);
        }
    }

    // ── No data from any source → structured fallback ────────────────────────
    if (raw.length === 0) {
        console.warn(`[NewsImpact] ⚪ All sources returned 0 raw articles for "${cleanName}" — caching fallback`);
        const fb = makeFallback(cleanName);
        cache.set(cacheKey, { timestamp: Date.now(), data: fb });
        return fb;
    }

    // ── Smart 3-layer filter ─────────────────────────────────────────────────
    const { tier, items: filtered } = filterArticles(raw, aliases, areaAli);

    // ── If all layers returned 0, use top raw articles ────────────────────────
    let finalItems = filtered.length > 0
        ? filtered
        : raw.filter(a => !NOISE_RE.test(a.title.toLowerCase())).slice(0, 4);

    if (finalItems.length === 0) {
        // Absolute last resort — unfiltered top 3
        finalItems = raw.slice(0, 3);
    }

    // Sort by date DESC, cap at 8
    finalItems.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
    finalItems = finalItems.slice(0, 8);

    // Bharat Mandapam — prepend known static insights
    let bmInsights = [];
    if (isBM) {
        bmInsights = [
            'Built 2017–2023 as part of Pragati Maidan integrated redevelopment',
            'Core Purpose: Hosts G20, international summits, trade fairs, and cultural events',
        ];
    }

    const insights = extractInsights(finalItems);
    const finalData = {
        articles:      finalItems,
        mainHighlight: isBM
            ? "India's largest convention centre at Pragati Maidan, inaugurated July 2023"
            : insights.mainHighlight,
        insights:      [...bmInsights, ...insights.insights].slice(0, 5),
        tags:          insights.tags,
        _tier:         tier, // debug only
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
    console.log(`[NewsImpact] ✅ "${cleanName}" — ${finalItems.length} articles [${tier}] cached (${Date.now() - t0}ms)`);
    return finalData;
};
