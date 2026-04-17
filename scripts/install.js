#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PROVIDERS } = require('./lib/providers');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--platform' || a === '-p') args.platform = argv[++i];
    else if (a === '--dest' || a === '-d') args.dest = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--list' || a === '-l') args.list = true;
    else if (a === '--dry-run') args.dryRun = true;
    else {
      console.error(`Unknown argument: ${a}`);
      args.error = true;
    }
  }
  return args;
}

function usage() {
  const platforms = Object.keys(PROVIDERS).sort().join(', ');
  console.log(`chiron install v${pkg.version}

Copies pre-built skills for one platform into a target project.

Usage:
  node scripts/install.js --platform <name> --dest <project-path> [--dry-run]
  node scripts/install.js --list
  node scripts/install.js --help

Options:
  --platform, -p   target platform: ${platforms}
  --dest, -d       destination project root (skills land in <dest>/.<platform>/skills/)
  --list, -l       list supported platforms and their target directories
  --dry-run        print what would be copied without writing
  --help, -h       show this help

Example:
  node scripts/install.js --platform cursor --dest /path/to/my-project
`);
}

function listPlatforms() {
  console.log(`chiron v${pkg.version} supports the following platforms:\n`);
  const entries = Object.entries(PROVIDERS).sort((a, b) => a[0].localeCompare(b[0]));
  const keyWidth = Math.max(...entries.map(([k]) => k.length));
  const dispWidth = Math.max(...entries.map(([, v]) => v.displayName.length));
  for (const [key, cfg] of entries) {
    console.log(`  ${key.padEnd(keyWidth)}  ${cfg.displayName.padEnd(dispWidth)}  ->  ${cfg.configDir}/skills/`);
  }
  console.log(`\nSee HARNESSES.md for per-platform frontmatter and directory-fallback details.`);
}

function copyDir(src, dst, counter) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d, counter);
    } else {
      fs.copyFileSync(s, d);
      counter.files++;
    }
  }
}

function dryRunDir(src, counter) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    if (entry.isDirectory()) {
      dryRunDir(s, counter);
    } else {
      counter.files++;
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.error) { usage(); return 2; }
  if (args.help) { usage(); return 0; }
  if (args.list) { listPlatforms(); return 0; }

  if (!args.platform || !args.dest) {
    console.error('Error: --platform and --dest are both required.\n');
    usage();
    return 2;
  }

  const provider = PROVIDERS[args.platform];
  if (!provider) {
    console.error(`Error: unknown platform "${args.platform}".`);
    console.error(`Known platforms: ${Object.keys(PROVIDERS).sort().join(', ')}`);
    return 2;
  }

  const src = path.join(ROOT, provider.configDir, 'skills');
  if (!fs.existsSync(src)) {
    console.error(`Error: source directory ${src} does not exist.`);
    console.error(`Did you run "bun run build" after cloning?`);
    return 1;
  }

  const dest = path.resolve(args.dest);
  if (!fs.existsSync(dest)) {
    console.error(`Error: destination ${dest} does not exist. Create it first or pass an existing path.`);
    return 1;
  }

  const dst = path.join(dest, provider.configDir, 'skills');
  const counter = { files: 0 };

  if (args.dryRun) {
    dryRunDir(src, counter);
    console.log(`[dry-run] would copy ${counter.files} files:`);
    console.log(`  ${src}`);
    console.log(`  -> ${dst}`);
    return 0;
  }

  copyDir(src, dst, counter);
  console.log(`Installed chiron v${pkg.version} skills for ${provider.displayName} (${counter.files} files)`);
  console.log(`  ${src}`);
  console.log(`  -> ${dst}`);
  return 0;
}

process.exit(main());
