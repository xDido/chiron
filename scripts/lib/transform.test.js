const { test, expect, describe } = require('bun:test');
const {
  parseSkill,
  replacePlaceholders,
  buildFrontmatter,
  transformSkill,
  validateSkill,
  VALID_FRONTMATTER_KEYS,
  VALID_ALLOWED_TOOLS,
} = require('./transform');
const { PROVIDERS } = require('./providers');
const { PLACEHOLDERS } = require('./placeholders');

describe('parseSkill', () => {
  test('extracts frontmatter lines, keys, and body on valid input', () => {
    const content = [
      '---',
      'name: sample',
      'description: a skill',
      'allowed-tools: Read, Grep',
      '---',
      '# Heading',
      'Body text.',
    ].join('\n');
    const { fmLines, fmKeys, body } = parseSkill(content);
    expect(fmLines).toEqual([
      'name: sample',
      'description: a skill',
      'allowed-tools: Read, Grep',
    ]);
    expect(fmKeys).toEqual(['name', 'description', 'allowed-tools']);
    expect(body).toBe('# Heading\nBody text.');
  });

  test('returns empty frontmatter when no leading ---', () => {
    const content = '# just a heading\nno frontmatter here';
    const { fmLines, fmKeys, body } = parseSkill(content);
    expect(fmLines).toEqual([]);
    expect(fmKeys).toEqual([]);
    expect(body).toBe(content);
  });

  test('returns empty frontmatter when closing --- is missing', () => {
    const content = '---\nname: stuck\ndescription: no close\n# body';
    const { fmLines, fmKeys, body } = parseSkill(content);
    expect(fmLines).toEqual([]);
    expect(fmKeys).toEqual([]);
    expect(body).toBe(content);
  });

  test('normalizes CRLF line endings', () => {
    const content = '---\r\nname: crlf\r\ndescription: x\r\n---\r\nbody\r\nmore';
    const { fmLines, body } = parseSkill(content);
    expect(fmLines).toEqual(['name: crlf', 'description: x']);
    expect(body).toBe('body\nmore');
  });

  test('handles blank lines and comments inside frontmatter', () => {
    const content = [
      '---',
      'name: sample',
      '',
      '# yaml comment',
      'description: a skill',
      '---',
      'body',
    ].join('\n');
    const { fmKeys } = parseSkill(content);
    // Blank lines and comments yield null key entries
    expect(fmKeys).toEqual(['name', null, null, 'description']);
  });
});

describe('replacePlaceholders', () => {
  test('substitutes a single token', () => {
    expect(replacePlaceholders('hello {{name}}', { name: 'world' })).toBe('hello world');
  });

  test('substitutes repeated occurrences', () => {
    const out = replacePlaceholders('{{x}}-{{x}}-{{x}}', { x: 'a' });
    expect(out).toBe('a-a-a');
  });

  test('leaves unmatched tokens as-is', () => {
    expect(replacePlaceholders('hi {{other}}', { name: 'x' })).toBe('hi {{other}}');
  });

  test('is a no-op with empty placeholder map', () => {
    expect(replacePlaceholders('plain text', {})).toBe('plain text');
  });

  test('substitutes values that contain special characters safely', () => {
    const out = replacePlaceholders('{{cmd}}', { cmd: '`$foo`' });
    expect(out).toBe('`$foo`');
  });
});

describe('buildFrontmatter', () => {
  test('always includes name and description even when not in allowedFields', () => {
    const fmLines = ['name: x', 'description: y', 'license: MIT'];
    const fmKeys = ['name', 'description', 'license'];
    const out = buildFrontmatter(fmLines, fmKeys, [], {});
    expect(out).toBe('---\nname: x\ndescription: y\n---');
  });

  test('includes allowed fields and strips disallowed ones', () => {
    const fmLines = [
      'name: x',
      'description: y',
      'license: MIT',
      'allowed-tools: Read',
      'user-invocable: true',
    ];
    const fmKeys = ['name', 'description', 'license', 'allowed-tools', 'user-invocable'];
    const out = buildFrontmatter(fmLines, fmKeys, ['license'], {});
    expect(out).toBe('---\nname: x\ndescription: y\nlicense: MIT\n---');
  });

  test('replaces placeholders inside frontmatter values', () => {
    const fmLines = ['name: foo', 'description: run {{command_prefix}}foo first'];
    const fmKeys = ['name', 'description'];
    const out = buildFrontmatter(fmLines, fmKeys, [], { command_prefix: '/' });
    expect(out).toBe('---\nname: foo\ndescription: run /foo first\n---');
  });
});

describe('transformSkill', () => {
  const source = [
    '---',
    'name: demo',
    'description: d',
    'allowed-tools: Read, Grep',
    'user-invocable: true',
    '---',
    '# {{command_prefix}}demo',
    'Runs on {{product_name}}.',
  ].join('\n');

  test('produces body with placeholders substituted for Claude Code', () => {
    const out = transformSkill(source, PROVIDERS['claude-code'], PLACEHOLDERS['claude-code']);
    expect(out).toContain('name: demo');
    expect(out).toContain('allowed-tools: Read, Grep');
    expect(out).toContain('user-invocable: true');
    expect(out).toContain('# /demo');
    expect(out).toContain('Runs on Claude Code.');
  });

  test('strips allowed-tools and user-invocable for Cursor', () => {
    const out = transformSkill(source, PROVIDERS['cursor'], PLACEHOLDERS['cursor']);
    expect(out).toContain('name: demo');
    expect(out).not.toContain('allowed-tools:');
    expect(out).not.toContain('user-invocable:');
    expect(out).toContain('Runs on Cursor.');
  });

  test('keeps only name+description for Gemini (empty frontmatterFields)', () => {
    const out = transformSkill(source, PROVIDERS['gemini'], PLACEHOLDERS['gemini']);
    expect(out).toContain('name: demo');
    expect(out).toContain('description: d');
    expect(out).not.toContain('allowed-tools:');
    expect(out).not.toContain('user-invocable:');
    expect(out).toContain('Runs on Gemini CLI.');
  });

  test('uses $ command prefix for Codex', () => {
    const out = transformSkill(source, PROVIDERS['codex'], PLACEHOLDERS['codex']);
    expect(out).toContain('# $demo');
  });
});

describe('validateSkill', () => {
  function parse(content) { return parseSkill(content); }

  test('valid skill yields no errors', () => {
    const errs = validateSkill('ok', parse([
      '---',
      'name: ok',
      'description: a skill',
      'allowed-tools: Read, Grep',
      '---',
      'body',
    ].join('\n')));
    expect(errs).toEqual([]);
  });

  test('reports missing frontmatter block', () => {
    const errs = validateSkill('noFront', parse('just body text'));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('missing frontmatter block');
  });

  test('reports missing name', () => {
    const errs = validateSkill('noName', parse([
      '---',
      'description: x',
      '---',
      'body',
    ].join('\n')));
    expect(errs.some(e => e.includes("missing required frontmatter field 'name'"))).toBe(true);
  });

  test('reports missing description', () => {
    const errs = validateSkill('noDesc', parse([
      '---',
      'name: x',
      '---',
      'body',
    ].join('\n')));
    expect(errs.some(e => e.includes("missing required frontmatter field 'description'"))).toBe(true);
  });

  test('reports typo in frontmatter field name', () => {
    const errs = validateSkill('typo', parse([
      '---',
      'name: x',
      'description: y',
      'allowed-toolz: Read',
      '---',
    ].join('\n')));
    expect(errs.some(e => e.includes("unknown frontmatter field 'allowed-toolz'"))).toBe(true);
  });

  test('reports unknown tool in allowed-tools', () => {
    const errs = validateSkill('badTool', parse([
      '---',
      'name: x',
      'description: y',
      'allowed-tools: Read, Gerp',
      '---',
    ].join('\n')));
    expect(errs.some(e => e.includes("unknown tool 'Gerp'"))).toBe(true);
  });

  test('accepts every tool in VALID_ALLOWED_TOOLS', () => {
    const tools = [...VALID_ALLOWED_TOOLS].join(', ');
    const errs = validateSkill('allTools', parse([
      '---',
      'name: x',
      'description: y',
      `allowed-tools: ${tools}`,
      '---',
    ].join('\n')));
    expect(errs).toEqual([]);
  });

  test('collects multiple errors from the same skill', () => {
    const errs = validateSkill('many', parse([
      '---',
      'weirdo: yes',
      'allowed-tools: Gerp, Nope',
      '---',
    ].join('\n')));
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });
});

describe('provider/placeholder consistency', () => {
  test('every PROVIDER has a matching PLACEHOLDERS entry', () => {
    for (const key of Object.keys(PROVIDERS)) {
      expect(PLACEHOLDERS[key], `missing placeholders for ${key}`).toBeDefined();
    }
  });

  test('every PLACEHOLDERS entry maps to a PROVIDER', () => {
    for (const key of Object.keys(PLACEHOLDERS)) {
      expect(PROVIDERS[key], `orphan placeholders entry for ${key}`).toBeDefined();
    }
  });

  test('every provider frontmatterFields value is a known key', () => {
    for (const [key, cfg] of Object.entries(PROVIDERS)) {
      for (const field of cfg.frontmatterFields) {
        expect(VALID_FRONTMATTER_KEYS.has(field), `${key} lists unknown field '${field}'`).toBe(true);
      }
    }
  });
});

describe('all source skills pass validation', () => {
  const fs = require('fs');
  const path = require('path');
  const SOURCE_DIR = path.resolve(__dirname, '..', '..', 'source', 'skills');

  test('every source/skills/*/SKILL.md validates cleanly', () => {
    if (!fs.existsSync(SOURCE_DIR)) {
      // In a checkout without source/, treat as skip.
      return;
    }
    const allErrors = [];
    for (const entry of fs.readdirSync(SOURCE_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(SOURCE_DIR, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const content = fs.readFileSync(skillFile, 'utf8');
      allErrors.push(...validateSkill(entry.name, parseSkill(content)));
    }
    expect(allErrors).toEqual([]);
  });
});
