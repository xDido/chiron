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
 * Returns array of { name, content } objects.
 */
function readSourceSkills(sourceDir) {
  const skills = [];
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(sourceDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    skills.push({
      name: entry.name,
      content: fs.readFileSync(skillFile, 'utf8')
    });
  }

  return skills;
}

/**
 * Write a transformed skill to the platform's output directory.
 */
function writeSkill(rootDir, configDir, skillName, content) {
  const outDir = path.join(rootDir, configDir, 'skills', skillName);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'SKILL.md'), content, 'utf8');
}

module.exports = {
  parseSkill,
  replacePlaceholders,
  buildFrontmatter,
  transformSkill,
  readSourceSkills,
  writeSkill
};
