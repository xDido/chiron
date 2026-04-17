#!/usr/bin/env node

const path = require('path');
const { verifyManifest, MANIFEST_PATH } = require('./lib/integrity');

const ROOT = path.resolve(__dirname, '..');
const result = verifyManifest(ROOT);

if (result.ok) {
  console.log(`OK  ${MANIFEST_PATH} matches the working tree.`);
  process.exit(0);
}

console.error(`FAIL ${MANIFEST_PATH} does not match the working tree.\n`);

if (result.missingManifest) {
  console.error(`  ${MANIFEST_PATH} is missing. Run \`bun run build\` to generate it.`);
  process.exit(1);
}

if (result.reason === 'version') {
  console.error(`  manifest_version ${result.manifestVersion} != expected ${result.expectedVersion}.`);
  console.error(`  This build of chiron is newer or older than the manifest. Rebuild from the matching source.`);
  process.exit(1);
}

if (result.mismatches.length > 0) {
  console.error(`  ${result.mismatches.length} file(s) have unexpected content:`);
  for (const m of result.mismatches) {
    console.error(`    ${m.path}`);
    console.error(`      expected sha256: ${m.expected}`);
    console.error(`      actual   sha256: ${m.actual}`);
  }
}

if (result.missing.length > 0) {
  console.error(`  ${result.missing.length} file(s) listed in manifest but missing on disk:`);
  for (const rel of result.missing) console.error(`    ${rel}`);
}

if (result.extra.length > 0) {
  console.error(`  ${result.extra.length} file(s) on disk but not in manifest:`);
  for (const rel of result.extra) console.error(`    ${rel}`);
  console.error(`  Run \`bun run build\` to regenerate the manifest, or remove these files.`);
}

process.exit(1);
