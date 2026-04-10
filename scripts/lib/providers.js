/**
 * Platform provider configurations.
 * Each entry defines where skills go and which frontmatter fields the platform supports.
 *
 * Source of truth: HARNESSES.md from impeccable (last verified 2026-03-24).
 * Fields marked with * are Agent Skills spec-standard.
 * All platforms silently ignore unrecognized fields.
 */
const PROVIDERS = {
  'claude-code': {
    configDir: '.claude',
    displayName: 'Claude Code',
    frontmatterFields: [
      'user-invocable', 'argument-hint', 'license',
      'compatibility', 'metadata', 'allowed-tools'
    ]
  },
  'cursor': {
    configDir: '.cursor',
    displayName: 'Cursor',
    // Cursor does NOT support user-invocable or argument-hint
    frontmatterFields: [
      'license', 'compatibility', 'metadata'
    ]
  },
  'gemini': {
    configDir: '.gemini',
    displayName: 'Gemini CLI',
    // Gemini validates only name + description; other fields parsed but ignored
    frontmatterFields: []
  },
  'codex': {
    configDir: '.codex',
    displayName: 'Codex CLI',
    // Codex native dir is .agents/skills/ but we use .codex/ to avoid collision
    // Codex uses separate sidecar config for extended metadata
    frontmatterFields: []
  },
  'opencode': {
    configDir: '.opencode',
    displayName: 'OpenCode',
    frontmatterFields: [
      'user-invocable', 'argument-hint', 'allowed-tools',
      'license', 'compatibility', 'metadata'
    ]
  },
  'agents': {
    configDir: '.agents',
    displayName: 'GitHub Copilot Agents',
    frontmatterFields: [
      'user-invocable', 'argument-hint',
      'license', 'compatibility', 'metadata'
    ]
  },
  'kiro': {
    configDir: '.kiro',
    displayName: 'Kiro',
    // Kiro recognizes some community-reported properties but no formal docs
    frontmatterFields: []
  },
  'pi': {
    configDir: '.pi',
    displayName: 'Pi',
    // Pi supports allowed-tools but not user-invocable/argument-hint
    frontmatterFields: ['allowed-tools']
  },
  'openai': {
    configDir: '.openai',
    displayName: 'OpenAI',
    frontmatterFields: []
  },
  'trae': {
    configDir: '.trae',
    displayName: 'Trae',
    // TBD — no official skills docs found yet
    frontmatterFields: []
  },
  'trae-cn': {
    configDir: '.trae-cn',
    displayName: 'Trae CN',
    frontmatterFields: []
  },
  'rovodev': {
    configDir: '.rovodev',
    displayName: 'Rovo Dev',
    frontmatterFields: [
      'user-invocable', 'argument-hint', 'allowed-tools',
      'license', 'compatibility', 'metadata'
    ]
  },
  'github-copilot': {
    configDir: '.github',
    displayName: 'VS Code Copilot',
    // Also reads .agents/skills/ and .claude/skills/ as fallback
    frontmatterFields: [
      'user-invocable', 'argument-hint',
      'license', 'compatibility', 'metadata'
    ]
  }
};

module.exports = { PROVIDERS };
