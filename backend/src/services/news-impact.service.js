/**
 * src/services/news-impact.service.js
 * Project News & Civic Insights Engine — Production-hardened
 *
 * Fixes applied:
 *  A. Uses Node https module (not fetch) → reliable on Render
 *  B. Project-name-first quoted query → no location contamination
 *  C. Alias-based strict filter → only project-relevant articles
 *  D. Smart fallback → always project-scoped, never area-only
 *  E. Cache poison fix → empty results are never cached
 *  F. Full debug logging → all failures visible in Render logs
 */
const https = require('https');
const http = require('http');

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ─────────────────────────────────────────────────────
// A. RELIABLE HTTP FETCH (replaces fetch())
// ─────────────────────────────────────────────────────

/**
 * HTTP GET with redirect following. Works reliably on Render.
 * fetch() in Node 18 silently fails on certain Render egress paths.
 */
function httpsGet(urlStr, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const attempt = (currentUrl, redirectsLeft) => {
            let parsedUrl;
            try { parsedUrl = new URL(currentUrl); }
            catch (e) { return reject(new Error(`Invalid URL: ${currentUrl}`)); }

            const lib = parsedUrl.protocol === 'https:' ? https : http;
            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; DishaSetu/1.0; +https://dishasetu.in)',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                    'Accept-Language': 'en-IN,en;q=0.9',
                    'Cache-Control': 'no-cache',
                },
                timeout: 12000,
            };

            const req = lib.request(options, (res) => {
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
                    return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
                }
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => resolve(data));
            });

            req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
            req.on('error', reject);
            req.end();
        };
        attempt(urlStr, maxRedirects);
    });
}

// ─────────────────────────────────────────────────────
// B. PROJECT ALIAS BUILDER
// ─────────────────────────────────────────────────────

/**
 * Build a list of search terms that must appear in a title
 * for an article to be considered relevant to this project.
 * Returns lowercase strings.
 */
function buildProjectAliases(projectName) {
    const lower = projectName.toLowerCase().trim();
    const aliases = new Set([lower]); // always include full name

    // Known hardcoded alias expansions for common projects
    const knownAliases = {
        'bharat mandapam': ['bharat mandapam', 'iecc', 'pragati maidan', 'itpo'],
        'namma metro':     ['namma metro', 'bmrcl', 'bengaluru metro', 'bangalore metro'],
        'hebbal flyover':  ['hebbal flyover', 'hebbal'],
        'whitefield metro':['whitefield metro', 'whitefield rail'],
        'kia':             ['kempegowda international airport', 'bengaluru airport', 'bangalore airport', 'kia expansion'],
        'rrts':            ['rrts', 'rapid rail', 'regional rapid transit'],
        'delhi metro':     ['delhi metro', 'dmrc'],
        'mumbai metro':    ['mumbai metro', 'mmrda metro'],
    };

    // Match any known alias group whose key is contained in the project name
    for (const [key, group] of Object.entries(knownAliases)) {
        if (lower.includes(key)) {
            group.forEach(a => aliases.add(a));
            break;
        }
    }

    // Also add significant individual words from the project name
    // (length > 3, not generic stop words) as loose aliases
    const stopWords = new Set([
        'of','the','in','and','for','to','a','an','on','with','at','by','from',
        'project','phase','new','modernization','development','infrastructure',
        'improvement','update','status','extension','construction','expansion',
    ]);
    lower.split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w))
        .forEach(w => aliases.add(w));

    return Array.from(aliases);
}

// ─────────────────────────────────────────────────────
// C. RSS PARSER
// ─────────────────────────────────────────────────────

function parseRssItems(xml) {
    const items = [];
    const seen = new Set();
    const itemRe = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/gi;
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
        let title = m[1]
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
            .replace(/ - [^-]+$/, '')   // strip " - Source Name" suffix
            .trim();
        if (!title || seen.has(title)) continue;
        seen.add(title);
        items.push({ title, link: m[2], source: m[3], published_date: m[4] });
    }
    return items;
}

// ─────────────────────────────────────────────────────
// D. INSIGHT EXTRACTION (unchanged logic, kept stable)
// ─────────────────────────────────────────────────────

function extractInsights(articles) {
    const insights = [];
    const tags = new Set();
    let mainHighlight = null;

    const keywords = {
        progress: /completed|inaugurated|opens|launched|finished|ready|starts|begins|update|speed/i,
        delays:   /delayed|stalled|postponed|halts|stops|protests|misses|snarls/i,
        benefits: /eases|reduces|saves|helps|boosts|improves/i,
        impact:   /capacity|lanes|beds|crore|km|passengers|vehicles/i,
    };

    articles.forEach(a => {
        const t = a.title;
        const lower = t.toLowerCase();
        if (!mainHighlight && (keywords.progress.test(lower) || keywords.impact.test(lower))) {
            mainHighlight = t;
            if (keywords.progress.test(lower)) tags.add('Progress');
            if (keywords.impact.test(lower))   tags.add('Impact');
        } else if (insights.length < 5) {
            if (keywords.delays.test(lower))   { insights.push(`Delay Warning: ${t}`);   tags.add('Delayed'); }
            else if (keywords.benefits.test(lower)) { insights.push(`Expected Benefit: ${t}`); tags.add('Benefit'); }
            else if (keywords.progress.test(lower)) { insights.push(`Status Update: ${t}`);    tags.add('Progress'); }
            else if (keywords.impact.test(lower))   { insights.push(`Civic Impact: ${t}`);     tags.add('Scale'); }
        }
    });

    if (!mainHighlight && articles.length > 0) mainHighlight = articles[0].title;

    for (let i = 0; insights.length < 4 && i < articles.length; i++) {
        const t = articles[i].title;
        if (t !== mainHighlight && !insights.some(ins => ins.includes(t))) {
            insights.push(t);
        }
    }

    if (tags.size === 0 && articles.length > 0) tags.add('News');

    return {
        mainHighlight: mainHighlight || 'No major news updates available recently.',
        insights,
        tags: Array.from(tags).slice(0, 3),
    };
}

// ─────────────────────────────────────────────────────
// E. NOISE FILTER (topic-level — blocks crime/sport/etc)
// ─────────────────────────────────────────────────────

const NOISE_RE = /\b(crime|crimes|criminal|murder|murders|killed|killing|death|dead|rape|suicide|covid|coronavirus|pandemic|celebrity|bollywood|hollywood|movie|movies|actor|actress|cricket|ipl|match|tournament|election|elections|party|vote|votes|politician)\b/i;

// ─────────────────────────────────────────────────────
// F. MAIN EXPORT
// ─────────────────────────────────────────────────────

exports.getProjectNews = async (projectName, area = '', category = '') => {
    const cleanName = projectName ? projectName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim() : '';
    if (!cleanName) {
        console.warn('[NewsImpact] Called with empty project name — returning empty.');
        return { articles: [], insights: [], mainHighlight: null, tags: [] };
    }

    const cacheKey = `${cleanName}::${category}`;
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`[NewsImpact] Cache HIT for "${cleanName}"`);
            return cached.data;
        }
        cache.delete(cacheKey); // expired
    }

    console.log(`[NewsImpact] Fetching news for project: "${cleanName}" | area: "${area}" | category: "${category}"`);

    // Build project aliases — the core relevance guard
    const aliases = buildProjectAliases(cleanName);
    console.log(`[NewsImpact] Aliases: ${JSON.stringify(aliases)}`);

    /**
     * STRICT filter: title must mention at least one alias.
     * Category keywords are intentionally NOT used here to prevent
     * generic "Bangalore road news" from matching a road project.
     */
    const isRelevant = (title) => {
        const t = title.toLowerCase();
        if (NOISE_RE.test(t)) return false;
        return aliases.some(alias => t.includes(alias));
    };

    const fetchAndFilter = async (queryStr) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(queryStr)}&hl=en-IN&gl=IN&ceid=IN:en`;
        console.log(`[NewsImpact] RSS query: "${queryStr}"`);
        const xml = await httpsGet(url);
        const raw = parseRssItems(xml);
        console.log(`[NewsImpact] RSS returned ${raw.length} raw items`);
        const filtered = raw.filter(item => isRelevant(item.title));
        console.log(`[NewsImpact] After alias filter: ${filtered.length} relevant items`);
        if (filtered.length > 0) {
            console.log(`[NewsImpact] Sample titles:`, filtered.slice(0, 3).map(a => a.title));
        }
        return filtered;
    };

    try {
        // ── Bharat Mandapam hardcoded path (unchanged, still alias-guarded) ──
        if (cleanName.toLowerCase().includes('bharat mandapam')) {
            const allItems = [];
            const seenLinks = new Set();

            for (const q of ['"Bharat Mandapam"', '"Pragati Maidan" IECC']) {
                try {
                    const fetched = await fetchAndFilter(q);
                    for (const item of fetched) {
                        if (!seenLinks.has(item.link)) {
                            seenLinks.add(item.link);
                            allItems.push(item);
                        }
                    }
                } catch (err) {
                    console.warn(`[NewsImpact] Bharat Mandapam query "${q}" failed: ${err.message}`);
                }
            }

            allItems.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
            const top = allItems.slice(0, 8);

            const finalData = {
                articles: top,
                ...extractInsights(top),
                mainHighlight: "India's largest convention centre at Pragati Maidan, inaugurated July 2023",
            };
            finalData.insights = [
                'Built 2017–2023 as part of Pragati Maidan integrated redevelopment',
                'Core Purpose: Hosts G20, international summits, trade fairs, and cultural events',
                ...finalData.insights,
            ].slice(0, 5);

            // E. Only cache if we have articles
            if (top.length > 0) {
                cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
            }
            return finalData;
        }

        // ── B. PROJECT-FIRST QUERY (quoted name = exact match in RSS) ──
        // Example: '"Namma Metro Phase 2" India'
        let items = await fetchAndFilter(`"${cleanName}" India`);

        // ── D. SMART FALLBACK — project-scoped, never area-only ──
        if (items.length < 3) {
            console.log(`[NewsImpact] Strict query yielded ${items.length} — trying relaxed fallback`);
            // Use significant words from name, no quotes (broader match)
            const stopWords = new Set(['of','the','in','and','for','to','a','an','on','with','at','by',
                'project','phase','new','modernization','development','infrastructure','improvement']);
            const majorWords = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

            if (majorWords.length > 0) {
                // Still project-scoped — uses project's own keywords
                const fallbackQuery = `${majorWords.join(' ')} infrastructure India`;
                try {
                    const fallbackItems = await fetchAndFilter(fallbackQuery);
                    const existingLinks = new Set(items.map(i => i.link));
                    for (const item of fallbackItems) {
                        if (!existingLinks.has(item.link)) {
                            items.push(item);
                            existingLinks.add(item.link);
                        }
                    }
                    console.log(`[NewsImpact] After fallback merge: ${items.length} items`);
                } catch (err) {
                    console.warn(`[NewsImpact] Fallback query failed: ${err.message}`);
                }
            }
        }

        // Sort DESC by date
        items.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
        items = items.slice(0, 8);

        const finalData = {
            articles: items,
            ...extractInsights(items),
        };

        // E. CACHE SAFETY — never cache empty results
        if (items.length > 0) {
            cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
            console.log(`[NewsImpact] Cached ${items.length} articles for "${cleanName}"`);
        } else {
            console.warn(`[NewsImpact] No articles found for "${cleanName}" — skipping cache`);
        }

        return finalData;

    } catch (err) {
        // F. FULL ERROR VISIBILITY — no silent failures
        console.error(`[NewsImpact] FATAL error fetching news for "${cleanName}":`, err.message);
        console.error(err.stack);
        return { articles: [], insights: [], mainHighlight: null, tags: [] };
    }
};
