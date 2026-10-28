const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('JSON restore UI validates MAL backup data', () => {
  assert.match(html, /accept="\.xml,\.csv,\.xml\.gz,\.json"/);
  assert.match(html, /OBNOVI JSON/);
  assert.match(html, /validateBackupPayload\(JSON\.parse\(text\)\)/);
  assert.match(html, /valjanih MAL ID-jeva/);
});
test('CSV import checks MAL ID and title headers', () => {
  assert.match(html, /series_animedb_id', 'mal_id/);
  assert.match(html, /series_title', 'title/);
  assert.match(html, /preskočeno nevaljanih redaka/);
});
test('AniList rating scale and gap are explained', () => {
  assert.match(html, /AniList prosjek \(0–100\) preračunat je na skalu 0–10/);
  assert.match(html, /najvećih razlika/);
});
test('PWA paths resolve within deployed repository subpath', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(new URL(manifest.start_url, 'https://example.github.io/nitro-app/').pathname, '/nitro-app/index.html');
  assert.equal(manifest.scope, './');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /self\.registration\.scope/);
  assert.match(sw, /SHELL_URL/);
});
test('XML validation and offline app fallback are present', () => {
  assert.match(html, /new DOMParser/);
  assert.match(html, /XML datoteka nije ispravna/);
  assert.match(html, /XML ne sadrži anime zapise/);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /Aplikacija nije dostupna offline/);
  assert.match(sw, /cache.match\(SHELL_URL\)/);
});
