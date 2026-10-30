const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('JSON restore UI validates MAL backup data', () => {
  assert.match(html, /accept="\.xml,\.csv,\.xml\.gz,\.json"/);
  assert.match(html, /OBNOVI JSON/);
  assert.match(app, /validateBackupPayload\(JSON\.parse\(text\)\)/);
  assert.match(app, /valjanih MAL ID-jeva/);
});
test('CSV import checks MAL ID and title headers', () => {
  assert.match(app, /series_animedb_id', 'mal_id/);
  assert.match(app, /series_title', 'title/);
  assert.match(app, /preskočeno nevaljanih redaka/);
});
test('AniList rating scale and gap are explained', () => {
  assert.match(html, /AniList prosjek \(0–100\) preračunat je na skalu 0–10/);
  assert.match(html, /najvećih razlika/);
});
test('PWA paths resolve within deployed repository subpath', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(new URL(manifest.start_url, 'https://example.github.io/nitro-app/').pathname, '/nitro-app/index.html');
  assert.equal(manifest.scope, './');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/);
  assert.match(html, /<script src="\.\/app\.js"><\/script>/);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /self\.registration\.scope/);
  assert.match(sw, /SHELL_URL/);
  assert.match(sw, /'styles.css'/);
  assert.match(sw, /'app.js'/);
});
test('XML validation and offline app fallback are present', () => {
  assert.match(app, /new DOMParser/);
  assert.match(app, /XML datoteka nije ispravna/);
  assert.match(app, /XML ne sadrži anime zapise/);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /Aplikacija nije dostupna offline/);
  assert.match(sw, /cache.match\(SHELL_URL\)/);
});
