const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function loadImportHelpers() {
  const start = source.indexOf('function parseNonNegativeInt(');
  const end = source.indexOf('function normalizeStoredAnime(', start);
  assert.ok(start >= 0 && end > start, 'import helper section exists');
  const context = {};
  vm.runInNewContext(`${source.slice(start, end)}; this.api = {parseNonNegativeInt, parseScore, extractYear, normalizeRow, normalizeStatus, validateBackupPayload};`, context);
  return context.api;
}

const api = loadImportHelpers();

test('MAL CSV rows normalize ids, scores, statuses, tags and dates', () => {
  const row = api.normalizeRow({series_animedb_id:'123', series_title:'  Sample Anime ', my_score:'9', my_status:'plan_to_watch', my_watched_episodes:'12', series_episodes:'24', my_tags:' mecha, favorite ', series_start:'2021-04-01', my_finish_date:'2022-03-03'});
  assert.deepEqual(JSON.parse(JSON.stringify(row)), {title:'Sample Anime', mal_id:123, score:9, status:'Plan to Watch', watched:12, totalEp:24, malType:'', malStartDate:'2021-04-01', malEndDate:'', releaseYear:2021, tags:['mecha','favorite'], year:2022});
});

test('invalid ids and out-of-range scores are safely normalized', () => {
  assert.equal(api.parseNonNegativeInt('-3'), 0);
  assert.equal(api.parseNonNegativeInt('1.5'), 0);
  assert.equal(api.parseScore('11'), 0);
  assert.equal(api.normalizeRow({mal_id:'bad', title:'No id'}).mal_id, null);
  assert.equal(api.normalizeStatus('currently watching'), 'Watching');
  assert.equal(api.normalizeStatus('mystery'), 'Unknown');
});

test('JSON backup restores valid records and counts invalid records', () => {
  const result = api.validateBackupPayload([{mal_id:'42', title:' Restore ', score:8, status:'completed', tags:['x']}, {title:'missing id'}, null]);
  assert.equal(result.rows.length, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.rows[0].title, 'Restore');
  assert.equal(result.rows[0].status, 'Completed');
  assert.deepEqual(JSON.parse(JSON.stringify(result.rows[0].tags)), ['x']);
});

test('JSON backup rejects empty, non-list and id-less payloads', () => {
  assert.throws(() => api.validateBackupPayload({}), /mora biti lista/);
  assert.throws(() => api.validateBackupPayload([]), /je prazna/);
  assert.throws(() => api.validateBackupPayload([{title:'no id'}]), /nema valjanih MAL ID-jeva/);
});

test('CSV and JSON import controls and IndexedDB persistence path are wired', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /accept="\.xml,\.csv,\.xml\.gz,\.json"/);
  assert.match(source, /Papa\.parse\(text,/);
  assert.match(source, /validateBackupPayload\(JSON\.parse\(text\)\)/);
  assert.match(source, /await saveAnalysis\(enriched\)/);
  assert.match(source, /indexedDB\.open\(STORAGE_DB_NAME, STORAGE_DB_VERSION\)/);
});

test('offline service worker precaches app assets and serves cached shell on navigation failure', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  for (const asset of ['index.html', 'styles.css', 'app.js', 'manifest.json']) assert.ok(sw.includes(`'${asset}'`), `precache includes ${asset}`);
  assert.match(sw, /cache\.match\(SHELL_URL\)/);
  assert.match(sw, /Aplikacija nije dostupna offline/);
});
