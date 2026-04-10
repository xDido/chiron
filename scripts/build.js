#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PROVIDERS } = require('./lib/providers');
const { PLACEHOLDERS } = require('./lib/placeholders');
const { readSourceSkills, transformSkill, replacePlaceholders, writeSkill } = require('./lib/transform');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'source', 'skills');

// --clean flag: remove all platform output directories
if (process.argv.includes('--clean')) {
  let removed = 0;
  for (const config of Object.values(PROVIDERS)) {
    const skillsDir = path.join(ROOT, config.configDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true });
      removed++;
      console.log(`  cleaned ${config.configDir}/skills/`);
    }
  }
  console.log(`\nCleaned ${removed} platform output directories.`);
  process.exit(0);
}

// Verify source directory exists
if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`Error: source/skills/ directory not found at ${SOURCE_DIR}`);
  process.exit(1);
}

// Read all source skills
const skills = readSourceSkills(SOURCE_DIR);
if (skills.length === 0) {
  console.error('Error: no skills found in source/skills/');
  process.exit(1);
}

console.log(`Found ${skills.length} source skills: ${skills.map(s => s.name).join(', ')}`);

// Transform and write for each platform
let totalFiles = 0;

for (const [providerKey, providerConfig] of Object.entries(PROVIDERS)) {
  const placeholders = PLACEHOLDERS[providerKey];
  if (!placeholders) {
    console.warn(`  warning: no placeholders defined for ${providerKey}, skipping`);
    continue;
  }

  let count = 0;
  let packCount = 0;
  for (const skill of skills) {
    // Add dynamic pack_path placeholder: resolves to the skill's output directory
    const skillPlaceholders = {
      ...placeholders,
      pack_path: `${providerConfig.configDir}/skills/${skill.name}`
    };
    const output = transformSkill(skill.content, providerConfig, skillPlaceholders);

    // Transform pack files with placeholder replacement
    let transformedPacks = null;
    if (skill.packs) {
      transformedPacks = {};
      for (const [filename, packContent] of Object.entries(skill.packs)) {
        transformedPacks[filename] = replacePlaceholders(packContent, skillPlaceholders);
      }
      packCount += Object.keys(transformedPacks).length;
    }

    writeSkill(ROOT, providerConfig.configDir, skill.name, output, transformedPacks);
    count++;
  }

  totalFiles += count;
  const packNote = packCount > 0 ? ` + ${packCount} packs` : '';
  console.log(`  ${providerConfig.displayName.padEnd(25)} → ${providerConfig.configDir}/skills/ (${count} skills${packNote})`);
}

console.log(`\nBuilt ${skills.length} skills × ${Object.keys(PROVIDERS).length} platforms = ${totalFiles} files`);
