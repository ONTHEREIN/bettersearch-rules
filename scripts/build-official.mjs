// Build the generated lists from public data:
//
//   official.txt  "brand -> official site", from Wikidata's "official
//                 website" (P856). Wikidata is CC0, like this repository.
//   popular.txt   The most-linked domains, from the Majestic Million
//                 (CC BY 3.0, which travels with that file).
//
//   node scripts/build-official.mjs
//
// official.txt lines are `keyword = site site ...`, one per keyword, sorted by
// UTF-16 code units (JavaScript's default order) so the userscript can binary
// search the raw text instead of parsing it. A site is a host, or a host plus
// path on code-hosting platforms, where the host alone belongs to everyone
// (github.com/7zip/7zip, not github.com). popular.txt is sorted the same way.

import { writeFile } from 'node:fs/promises';

// QLever answers the broad scans in seconds where query.wikidata.org times out.
// Its copy of Wikidata trails by days, which is fine for a weekly build.
const ENDPOINT = 'https://qlever.dev/api/wikidata';
const PREFIXES = [
  'PREFIX wd: <http://www.wikidata.org/entity/>',
  'PREFIX wdt: <http://www.wikidata.org/prop/direct/>',
  'PREFIX wikibase: <http://wikiba.se/ontology#>',
  'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
  'PREFIX skos: <http://www.w3.org/2004/02/skos/core#>',
].join('\n');
const MAJESTIC = 'https://downloads.majestic.com/majestic_million.csv';
const USER_AGENT = 'bettersearch-rules/0.1 (https://github.com/ONTHEREIN/bettersearch-rules)';
const NAME_LANGS = ['mul', 'en', 'zh', 'zh-hans', 'zh-cn', 'zh-hant', 'zh-tw', 'zh-hk'];
const BATCH = 2000;
/** Domains written to popular.txt. */
const POPULAR_COUNT = 200_000;
/** A broad-query item is kept only if its site ranks this high. */
const BROAD_RANK = 100_000;

/**
 * Things people download or sign in to. `path` is the SPARQL path from an item
 * to `class`; `minLinks` is the fewest Wikipedia articles an item needs, which
 * keeps out entries nobody searches for.
 */
const CATEGORIES = [
  { name: 'software', class: 'Q7397', path: 'wdt:P31/wdt:P279*', minLinks: 3 },
  { name: 'website', class: 'Q35127', path: 'wdt:P31/wdt:P279*', minLinks: 3 },
  { name: 'online service', class: 'Q19967801', path: 'wdt:P31/wdt:P279*', minLinks: 3 },
  { name: 'programming language', class: 'Q9143', path: 'wdt:P31/wdt:P279*', minLinks: 3 },
  { name: 'business', class: 'Q4830453', path: 'wdt:P31', minLinks: 10 },
  { name: 'enterprise', class: 'Q6881511', path: 'wdt:P31', minLinks: 10 },
  { name: 'public company', class: 'Q891723', path: 'wdt:P31', minLinks: 10 },
  { name: 'company', class: 'Q783794', path: 'wdt:P31', minLinks: 10 },
  { name: 'bank', class: 'Q22687', path: 'wdt:P31', minLinks: 5 },
  { name: 'brand', class: 'Q431289', path: 'wdt:P31', minLinks: 5 },
];
/**
 * Everything else with an official site and this many articles, which catches
 * what the categories miss (Steam is a "video game distribution platform").
 * Kept only when the site is popular, and never places or people.
 */
const BROAD_MIN_LINKS = 20;

/** Archives hold copies of any site, so they are nobody's official site. */
const ARCHIVE_HOSTS = new Set(['web.archive.org', 'archive.org', 'archive.today', 'archive.ph', 'webcitation.org']);

/** Hosts shared by many unrelated projects, and how many path segments name one. */
const SHARED_HOSTS = new Map([
  ['github.com', 2], ['gitlab.com', 2], ['gitee.com', 2], ['bitbucket.org', 2], ['codeberg.org', 2],
  ['sourceforge.net', 2], ['apps.apple.com', 3], ['play.google.com', 0],
]);

// The same stand-in for the Public Suffix List as the userscript's url.ts.
const SUFFIXES = new Set([
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'com.hk', 'org.hk', 'com.tw', 'org.tw', 'com.sg', 'com.my',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'co.kr', 'or.kr',
  'co.uk', 'org.uk', 'ac.uk', 'com.au', 'net.au', 'org.au',
  'co.nz', 'co.in', 'com.br', 'com.mx', 'co.za',
]);

function registrableDomain(host) {
  const labels = host.split('.');
  if (labels.length <= 2) return host;
  return SUFFIXES.has(labels.slice(-2).join('.')) ? labels.slice(-3).join('.') : labels.slice(-2).join('.');
}

/**
 * Rows of a SELECT whose variables are all URIs or plain strings, as objects.
 * TSV is far smaller than JSON. An endpoint can cut a large answer off
 * mid-stream after sending 200, so that is retried too.
 */
async function sparql(query) {
  for (let attempt = 1; ; attempt++) {
    let error;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/tab-separated-values',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ query: `${PREFIXES}\n${query}` }),
      });
      const text = await res.text();
      if (!res.ok) {
        error = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        if (res.status !== 429 && res.status < 500) throw error;
      } else if (/(^|\n)SPARQL-QUERY:|TimeoutException/.test(text)) {
        error = new Error('timed out mid-answer');
      } else {
        return parseTsv(text);
      }
    } catch (e) {
      error ??= e;
      if (error.message.startsWith('HTTP 4') && !error.message.startsWith('HTTP 429')) throw error;
    }
    if (attempt === 3) throw error;
    console.error(`retrying: ${error.message.slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 10_000 * attempt));
  }
}

/** `<http://www.wikidata.org/entity/Q1>` -> the URI; `"7-Zip"@en` -> `7-Zip`. */
function tsvValue(cell) {
  if (cell.startsWith('<') && cell.endsWith('>')) return cell.slice(1, -1);
  const m = cell.match(/^"((?:[^"\\]|\\.)*)"/);
  if (!m) return cell;
  return m[1].replace(/\\(.)/g, (_, c) => ({ t: '\t', n: '\n', r: '\r' })[c] ?? c);
}

function parseTsv(text) {
  const [head, ...lines] = text.split('\n');
  const vars = head.split('\t').map((v) => v.replace(/^\?/, ''));
  return lines.filter(Boolean).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(vars.map((v, i) => [v, { value: tsvValue(cells[i] ?? '') }]));
  });
}

/** Run `query(values)` over `ids` in batches; `values` is a SPARQL VALUES list. */
async function batched(ids, label, query) {
  const rows = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    rows.push(...(await sparql(query(ids.slice(i, i + BATCH).map((id) => `wd:${id}`).join(' ')))));
    console.error(`${label}: ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
  }
  return rows;
}

const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

/** `https://www.7-zip.org/download.html` -> `7-zip.org`; null for sites we cannot match on. */
function siteKey(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.includes('.') || /^[\d.]+$/.test(host) || ARCHIVE_HOSTS.has(host)) return null;
  if (!SHARED_HOSTS.has(host)) return host;
  const depth = SHARED_HOSTS.get(host);
  // Play Store pages are identified by a query parameter, not the path.
  if (depth === 0) return null;
  const segments = u.pathname.split('/').filter(Boolean).slice(0, depth);
  return segments.length === depth ? `${host}/${segments.join('/').toLowerCase()}` : null;
}

/** A name worth matching in a query, normalized; null when too short or too long to be useful. */
function keyword(name) {
  const k = name
    .toLowerCase()
    .replace(/["“”「」『』]/g, '')
    // Disambiguators: `python (programming language)`, `k（编程语言）`.
    .replace(/\s*[(（][^()（）]*[)）]\s*$/, '')
    .replace(/[|=\s]+/g, ' ')
    .trim()
    // `#` starts a comment line; hashtags are names without it.
    .replace(/^#+/, '');
  if (k.length > 40) return null;
  // Latin names need three characters (`go`, `qq` are too common in text); CJK two.
  if (/^[\x00-\x7f]*$/.test(k) ? k.replace(/[^a-z0-9]/g, '').length < 3 : k.length < 2) return null;
  return k;
}

/** Registrable domains from the Majestic Million, most linked first. */
async function majestic() {
  const res = await fetch(MAJESTIC, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Majestic: HTTP ${res.status}`);
  const domains = [];
  for (const line of (await res.text()).split('\n').slice(1)) {
    const domain = line.split(',')[2];
    if (domain) domains.push(domain.toLowerCase());
  }
  console.error(`majestic: ${domains.length} domains`);
  return domains;
}

function header(lines, extra) {
  return [...extra, `# Updated: ${new Date().toISOString().slice(0, 10)}`, `# Entries: ${lines.length}`];
}

async function main() {
  const ranked = await majestic();
  const rank = new Map(ranked.slice(0, BROAD_RANK).map((d, i) => [d, i]));

  /** @type {Map<string, Set<string>>} item -> sites */
  const sites = new Map();
  const add = (row) => {
    const key = siteKey(row.site.value);
    if (!key) return false;
    const id = qid(row.item.value);
    const isNew = !sites.has(id);
    if (isNew) sites.set(id, new Set());
    sites.get(id).add(key);
    return isNew;
  };

  for (const c of CATEGORIES) {
    const rows = await sparql(
      `SELECT ?item ?site WHERE { ?item ${c.path} wd:${c.class}; wdt:P856 ?site; wikibase:sitelinks ?l. FILTER(?l >= ${c.minLinks}) }`,
    );
    console.error(`${c.name}: ${rows.length} rows, ${rows.filter(add).length} new items`);
  }

  const broadRows = await sparql(
    `SELECT ?item ?site WHERE { ?item wdt:P856 ?site; wikibase:sitelinks ?l. FILTER(?l >= ${BROAD_MIN_LINKS}) }`,
  );
  const broad = broadRows.filter((row) => {
    if (sites.has(qid(row.item.value))) return false;
    const key = siteKey(row.site.value);
    return key !== null && rank.has(registrableDomain(key.split('/')[0]));
  });
  const broadIds = [...new Set(broad.map((row) => qid(row.item.value)))];
  const excluded = new Set(
    (
      await batched(
        broadIds,
        'places and people',
        (values) => `SELECT DISTINCT ?item WHERE { VALUES ?item { ${values} } { ?item wdt:P625 [] } UNION { ?item wdt:P31 wd:Q5 } }`,
      )
    ).map((row) => qid(row.item.value)),
  );
  const kept = broad.filter((row) => !excluded.has(qid(row.item.value)));
  console.error(`broad: ${broadIds.length} popular items, ${excluded.size} places or people, ${kept.filter(add).length} kept`);

  /** @type {Map<string, Set<string>>} item -> keywords */
  const names = new Map();
  const langs = NAME_LANGS.map((l) => `"${l}"`).join(',');
  const nameRows = await batched(
    [...sites.keys()],
    'names',
    (values) =>
      `SELECT ?item ?name WHERE { VALUES ?item { ${values} } { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name } FILTER(LANG(?name) IN (${langs})) }`,
  );
  for (const row of nameRows) {
    const k = keyword(row.name.value);
    if (!k) continue;
    const id = qid(row.item.value);
    if (!names.has(id)) names.set(id, new Set());
    names.get(id).add(k);
  }

  /** @type {Map<string, Set<string>>} keyword -> sites of every item it names */
  const byKeyword = new Map();
  for (const [id, keys] of names) {
    for (const k of keys) {
      if (!byKeyword.has(k)) byKeyword.set(k, new Set());
      for (const site of sites.get(id)) byKeyword.get(k).add(site);
    }
  }
  const official = [...byKeyword.keys()].sort().map((k) => `${k} = ${[...byKeyword.get(k)].sort().join(' ')}`);
  await writeFile(
    'official.txt',
    [
      ...header(official, [
        '# BetterSearch official-site registry: keyword = official sites.',
        '# Generated from Wikidata "official website" (P856), which is CC0.',
        '# Fix a wrong entry on Wikidata itself; this file is rebuilt every week.',
      ]),
      ...official,
      '',
    ].join('\n'),
  );

  const popular = ranked.slice(0, POPULAR_COUNT).sort();
  await writeFile(
    'popular.txt',
    [
      ...header(popular, [
        '# The most-linked domains, sorted by name.',
        '# From the Majestic Million by Majestic (https://majestic.com/reports/majestic-million),',
        '# licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).',
      ]),
      ...popular,
      '',
    ].join('\n'),
  );
  console.error(`official.txt: ${official.length} entries; popular.txt: ${popular.length} domains`);
}

await main();
