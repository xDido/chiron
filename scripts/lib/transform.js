const fs = require('fs');
const path = require('path');

/**
 * Parse a SKILL.md into frontmatter lines + body.
 * Returns { fmLines: string[], fmKeys: string[], body: string }.
 * fmLines preserves original formatting; fmKeys tracks which YAML key each line belongs to.
 */
function parseSkill(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  if (lines[0].trim() !== '---') {
    return { fmLines: [], fmKeys: [], body: content.replace(/\r\n/g, '\n') };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { fmLines: [], fmKeys: [], body: content.replace(/\r\n/g, '\n') };
  }

  const fmLines = lines.slice(1, endIndex);
  const fmKeys = [];
  for (const line of fmLines) {
    const match = line.match(/^([\w-]+):/);
    fmKeys.push(match ? match[1] : null);
  }

  const body = lines.slice(endIndex + 1).join('\n');
  return { fmLines, fmKeys, body };
}

/**
 * Replace {{placeholder}} tokens in text with platform-specific values.
 */
function replacePlaceholders(text, placeholders) {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Build frontmatter string, keeping original line formatting.
 * Filters fields to only those the platform supports (name + description always kept).
 * Replaces placeholders in each line's value.
 */
function buildFrontmatter(fmLines, fmKeys, allowedFields, placeholders) {
  const alwaysInclude = ['name', 'description'];
  const kept = [];

  for (let i = 0; i < fmLines.length; i++) {
    const key = fmKeys[i];
    if (key && !alwaysInclude.includes(key) && !allowedFields.includes(key)) {
      continue;
    }
    kept.push(replacePlaceholders(fmLines[i], placeholders));
  }

  return '---\n' + kept.join('\n') + '\n---';
}

/**
 * Transform a single skill for a target platform.
 * Returns the full file content ready to write.
 */
function transformSkill(content, providerConfig, placeholders) {
  const { fmLines, fmKeys, body } = parseSkill(content);

  const fm = buildFrontmatter(fmLines, fmKeys, providerConfig.frontmatterFields, placeholders);
  const transformedBody = replacePlaceholders(body, placeholders);

  return fm + '\n' + transformedBody;
}

/**
 * Read all skills from source/skills/ directory.
 * Returns array of { name, content, packs } objects.
 * packs is a Map of filename → content for any files in a packs/ subdirectory.
 */
function readSourceSkills(sourceDir) {
  const skills = [];
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(sourceDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    // Check for packs/ subdirectory
    const packsDir = path.join(sourceDir, entry.name, 'packs');
    let packs = null;
    if (fs.existsSync(packsDir)) {
      packs = {};
      for (const packFile of fs.readdirSync(packsDir)) {
        if (!packFile.endsWith('.md')) continue;
        packs[packFile] = fs.readFileSync(path.join(packsDir, packFile), 'utf8');
      }
    }

    // Check for references/ subdirectory
    const refsDir = path.join(sourceDir, entry.name, 'references');
    let references = null;
    if (fs.existsSync(refsDir)) {
      references = {};
      for (const refFile of fs.readdirSync(refsDir)) {
        if (!refFile.endsWith('.md')) continue;
        references[refFile] = fs.readFileSync(path.join(refsDir, refFile), 'utf8');
      }
    }

    skills.push({
      name: entry.name,
      content: fs.readFileSync(skillFile, 'utf8'),
      packs,
      references
    });
  }

  return skills;
}

/**
 * Write a transformed skill to the platform's output directory.
 * If packs is provided, also writes pack files to a packs/ subdirectory.
 */
function writeSkill(rootDir, configDir, skillName, content, packs, references) {
  const outDir = path.join(rootDir, configDir, 'skills', skillName);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'SKILL.md'), content, 'utf8');

  if (packs) {
    const packsDir = path.join(outDir, 'packs');
    fs.mkdirSync(packsDir, { recursive: true });
    for (const [filename, packContent] of Object.entries(packs)) {
      fs.writeFileSync(path.join(packsDir, filename), packContent, 'utf8');
    }
  }

  if (references) {
    const refsDir = path.join(outDir, 'references');
    fs.mkdirSync(refsDir, { recursive: true });
    for (const [filename, refContent] of Object.entries(references)) {
      fs.writeFileSync(path.join(refsDir, filename), refContent, 'utf8');
    }
  }
}

module.exports = {
  parseSkill,
  replacePlaceholders,
  buildFrontmatter,
  transformSkill,
  readSourceSkills,
  writeSkill
};
