const { test, expect, describe, beforeEach, afterEach } = require('bun:test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  computeManifest,
  writeManifest,
  verifyManifest,
  collectFiles,
  hashFile,
  regenerate,
  MANIFEST_PATH,
  MANIFEST_VERSION,
} = require('./integrity');

function mkTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chiron-integrity-'));
}

function write(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

/**
 * Seed a minimal file tree matching TRACKED_GLOBS so collectFiles finds files.
 */
function seedTree(root) {
  write(root, 'source/skills/foo/SKILL.md', '---\nname: foo\ndescription: d\n---\nbody');
  write(root, '.claude-plugin/plugin.json', '{"name":"foo"}\n');
  write(root, '.claude-plugin/marketplace.json', '{"plugins":[]}\n');
  write(root, 'scripts/build.js', '// stub\n');
  write(root, '.claude/skills/foo/SKILL.md', '---\nname: foo\ndescription: d\n---\nbody');
  write(root, '.cursor/skills/foo/SKILL.md', '---\nname: foo\ndescription: d\n---\nbody');
}

describe('integrity', () => {
  let root;

  beforeEach(() => { root = mkTempRoot(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test('collectFiles finds every seeded tracked file', () => {
    seedTree(root);
    const files = collectFiles(root);
    expect(files).toContain('source/skills/foo/SKILL.md');
    expect(files).toContain('.claude-plugin/plugin.json');
    expect(files).toContain('.claude-plugin/marketplace.json');
    expect(files).toContain('scripts/build.js');
    expect(files).toContain('.claude/skills/foo/SKILL.md');
    expect(files).toContain('.cursor/skills/foo/SKILL.md');
  });

  test('collectFiles ignores untracked files (e.g., .txt in source/skills)', () => {
    seedTree(root);
    write(root, 'source/skills/foo/notes.txt', 'not tracked');
    const files = collectFiles(root);
    expect(files).not.toContain('source/skills/foo/notes.txt');
  });

  test('computeManifest returns correct version and algorithm', () => {
    seedTree(root);
    const manifest = computeManifest(root);
    expect(manifest.manifest_version).toBe(MANIFEST_VERSION);
    expect(manifest.algorithm).toBe('sha256');
    expect(typeof manifest.generated_at).toBe('string');
    expect(Object.keys(manifest.files).length).toBeGreaterThan(0);
  });

  test('manifest hashes match the raw SHA-256 of each file', () => {
    seedTree(root);
    const manifest = computeManifest(root);
    for (const [rel, hash] of Object.entries(manifest.files)) {
      expect(hash).toBe(hashFile(path.join(root, rel)));
    }
  });

  test('verify round-trip: write then verify is ok=true', () => {
    seedTree(root);
    writeManifest(root, computeManifest(root));
    const result = verifyManifest(root);
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });

  test('detects hash mismatch when a tracked file is modified after manifest', () => {
    seedTree(root);
    writeManifest(root, computeManifest(root));
    write(root, 'source/skills/foo/SKILL.md', '---\nname: foo\ndescription: CHANGED\n---\nbody');
    const result = verifyManifest(root);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('mismatch');
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0].path).toBe('source/skills/foo/SKILL.md');
  });

  test('detects missing when a tracked file is deleted after manifest', () => {
    seedTree(root);
    writeManifest(root, computeManifest(root));
    fs.rmSync(path.join(root, 'source/skills/foo/SKILL.md'));
    const result = verifyManifest(root);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('source/skills/foo/SKILL.md');
  });

  test('detects extra files added after manifest', () => {
    seedTree(root);
    writeManifest(root, computeManifest(root));
    write(root, '.claude/skills/new/SKILL.md', '---\nname: new\ndescription: d\n---\n');
    const result = verifyManifest(root);
    expect(result.ok).toBe(false);
    expect(result.extra).toContain('.claude/skills/new/SKILL.md');
  });

  test('detects unsupported manifest_version', () => {
    seedTree(root);
    const stale = computeManifest(root);
    stale.manifest_version = 999;
    writeManifest(root, stale);
    const result = verifyManifest(root);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('version');
    expect(result.manifestVersion).toBe(999);
    expect(result.expectedVersion).toBe(MANIFEST_VERSION);
  });

  test('detects missing manifest file', () => {
    seedTree(root);
    // intentionally do NOT write a manifest
    const result = verifyManifest(root);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing');
    expect(result.missingManifest).toBe(true);
  });

  test('regenerate creates manifest on first call', () => {
    seedTree(root);
    const { changed, manifest } = regenerate(root);
    expect(changed).toBe(true);
    expect(manifest.manifest_version).toBe(MANIFEST_VERSION);
    expect(fs.existsSync(path.join(root, MANIFEST_PATH))).toBe(true);
  });

  test('regenerate is idempotent when the tree has not changed', () => {
    seedTree(root);
    regenerate(root);
    const { changed } = regenerate(root);
    expect(changed).toBe(false);
  });

  test('regenerate detects and rewrites after a file change', () => {
    seedTree(root);
    regenerate(root);
    write(root, 'source/skills/foo/SKILL.md', '---\nname: foo\ndescription: EDITED\n---\nbody');
    const { changed } = regenerate(root);
    expect(changed).toBe(true);
    const result = verifyManifest(root);
    expect(result.ok).toBe(true);
  });

  test('collectFiles returns a sorted, deduplicated list', () => {
    seedTree(root);
    const files = collectFiles(root);
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
    expect(files.length).toBe(new Set(files).size);
  });
});
