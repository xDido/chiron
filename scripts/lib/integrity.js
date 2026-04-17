const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PROVIDERS } = require('./providers');

const MANIFEST_PATH = '.claude-plugin/INTEGRITY.json';
const MANIFEST_VERSION = 1;

const PLATFORM_SKILL_DIRS = Object.values(PROVIDERS).map(
  (p) => `${p.configDir}/skills`
);

const TRACKED_GLOBS = [
  { dir: 'source/skills', match: (p) => p.endsWith('.md') },
  { dir: '.claude-plugin', match: (p) => p === 'plugin.json' || p === 'marketplace.json' },
  { dir: 'scripts', match: (p) => p.endsWith('.js') },
  ...PLATFORM_SKILL_DIRS.map((dir) => ({ dir, match: (p) => p.endsWith('.md') })),
];

function walk(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [rel];
  if (!stat.isDirectory()) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs)) {
    out.push(...walk(root, path.join(rel, entry)));
  }
  return out;
}

function collectFiles(root) {
  const files = new Set();
  for (const { dir, match } of TRACKED_GLOBS) {
    for (const rel of walk(root, dir)) {
      const relFromDir = path.relative(dir, rel).split(path.sep).join('/');
      if (match(relFromDir)) {
        files.add(rel.split(path.sep).join('/'));
      }
    }
  }
  return [...files].sort();
}

function hashFile(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function computeManifest(root) {
  const files = collectFiles(root);
  const entries = {};
  for (const rel of files) {
    entries[rel] = hashFile(path.join(root, rel));
  }
  return {
    manifest_version: MANIFEST_VERSION,
    algorithm: 'sha256',
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    files: entries,
  };
}

function writeManifest(root, manifest) {
  const target = path.join(root, MANIFEST_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + '\n');
}

function regenerate(root) {
  const existing = readManifestRaw(root);
  const fresh = computeManifest(root);
  if (existing) {
    fresh.generated_at = existing.generated_at;
    if (stableEqual(existing, fresh)) {
      return { changed: false, manifest: existing };
    }
    fresh.generated_at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  writeManifest(root, fresh);
  return { changed: true, manifest: fresh };
}

function stableEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readManifestRaw(root) {
  const target = path.join(root, MANIFEST_PATH);
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

function verifyManifest(root) {
  const manifest = readManifestRaw(root);
  if (!manifest) {
    return { ok: false, reason: 'missing', missingManifest: true, mismatches: [], missing: [], extra: [] };
  }
  if (manifest.manifest_version !== MANIFEST_VERSION) {
    return { ok: false, reason: 'version', manifestVersion: manifest.manifest_version, expectedVersion: MANIFEST_VERSION, mismatches: [], missing: [], extra: [] };
  }

  const mismatches = [];
  const missing = [];
  const onDisk = new Set(collectFiles(root));
  const inManifest = new Set(Object.keys(manifest.files));

  for (const rel of inManifest) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    const actual = hashFile(abs);
    const expected = manifest.files[rel];
    if (actual !== expected) {
      mismatches.push({ path: rel, expected, actual });
    }
  }

  const extra = [...onDisk].filter((rel) => !inManifest.has(rel));

  const ok = mismatches.length === 0 && missing.length === 0 && extra.length === 0;
  return { ok, reason: ok ? null : 'mismatch', mismatches, missing, extra };
}

module.exports = {
  MANIFEST_PATH,
  MANIFEST_VERSION,
  computeManifest,
  writeManifest,
  regenerate,
  verifyManifest,
  collectFiles,
  hashFile,
};
