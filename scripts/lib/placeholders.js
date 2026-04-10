/**
 * Per-platform placeholder values.
 * These replace {{placeholder}} tokens in source skill files.
 *
 * config_files       — backtick-wrapped, for use in markdown body
 * config_files_plain — bare text, for use in frontmatter descriptions
 * config_file        — single primary config file name (bare)
 * command_prefix     — / for most platforms, $ for Codex
 * product_name       — human-readable platform name
 */
const PLACEHOLDERS = {
  'claude-code': {
    config_files: '`CLAUDE.md` or `AGENTS.md`',
    config_files_plain: 'CLAUDE.md or AGENTS.md',
    config_file: 'CLAUDE.md',
    command_prefix: '/',
    product_name: 'Claude Code'
  },
  'cursor': {
    config_files: '`.cursorrules`',
    config_files_plain: '.cursorrules',
    config_file: '.cursorrules',
    command_prefix: '/',
    product_name: 'Cursor'
  },
  'gemini': {
    config_files: '`GEMINI.md`',
    config_files_plain: 'GEMINI.md',
    config_file: 'GEMINI.md',
    command_prefix: '/',
    product_name: 'Gemini CLI'
  },
  'codex': {
    config_files: '`AGENTS.md`',
    config_files_plain: 'AGENTS.md',
    config_file: 'AGENTS.md',
    command_prefix: '$',
    product_name: 'Codex CLI'
  },
  'opencode': {
    config_files: '`AGENTS.md`',
    config_files_plain: 'AGENTS.md',
    config_file: 'AGENTS.md',
    command_prefix: '/',
    product_name: 'OpenCode'
  },
  'agents': {
    config_files: '`.agents/README.md`',
    config_files_plain: '.agents/README.md',
    config_file: '.agents/README.md',
    command_prefix: '/',
    product_name: 'GitHub Copilot Agents'
  },
  'kiro': {
    config_files: '`.kiro/settings.json`',
    config_files_plain: '.kiro/settings.json',
    config_file: '.kiro/settings.json',
    command_prefix: '/',
    product_name: 'Kiro'
  },
  'pi': {
    config_files: '`.pi/settings.json`',
    config_files_plain: '.pi/settings.json',
    config_file: '.pi/settings.json',
    command_prefix: '/',
    product_name: 'Pi'
  },
  'openai': {
    config_files: '`AGENTS.md`',
    config_files_plain: 'AGENTS.md',
    config_file: 'AGENTS.md',
    command_prefix: '/',
    product_name: 'OpenAI'
  },
  'trae': {
    config_files: '`.trae/rules`',
    config_files_plain: '.trae/rules',
    config_file: '.trae/rules',
    command_prefix: '/',
    product_name: 'Trae'
  },
  'trae-cn': {
    config_files: '`.trae-cn/rules`',
    config_files_plain: '.trae-cn/rules',
    config_file: '.trae-cn/rules',
    command_prefix: '/',
    product_name: 'Trae CN'
  },
  'rovodev': {
    config_files: '`AGENTS.md`',
    config_files_plain: 'AGENTS.md',
    config_file: 'AGENTS.md',
    command_prefix: '/',
    product_name: 'Rovo Dev'
  },
  'github-copilot': {
    config_files: '`.github/copilot-instructions.md`',
    config_files_plain: '.github/copilot-instructions.md',
    config_file: '.github/copilot-instructions.md',
    command_prefix: '/',
    product_name: 'VS Code Copilot'
  }
};

module.exports = { PLACEHOLDERS };
