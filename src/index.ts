/**
 * lite-hl: Universal Heuristic Syntax Highlighter
 * Tokenizes generic programming code without relying on language-specific grammars.
 */

// Escape HTML securely
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const COMMON_KEYWORDS = [
  'return', 'if', 'else', 'while', 'for', 'do', 'break', 'continue', 'switch', 'case', 'default',
  'try', 'catch', 'finally', 'throw', 'class', 'function', 'var', 'let', 'const', 'import', 'export', 'from',
  'public', 'private', 'protected', 'static', 'extends', 'implements', 'new', 'this', 'super',
  'typeof', 'instanceof', 'in', 'of', 'yield', 'await', 'async', 'interface', 'type', 'enum',
  'void', 'undefined', 'def', 'pass',
  'match', 'with', 'as', 'struct', 'func', 'go', 'chan', 'defer', 'select', 'fallthrough',
  'namespace', 'using', 'pkg', 'mod', 'require', 'fn', 'pub', 'mut', 'impl', 'loop', 'unsafe',
  'trait', 'where', 'macro_rules', 'use', 'int', 'float', 'double', 'char', 'bool',
  // Shell utilities (deduplicated): keeps robust Bash/Shell coverage.
  'bash', 'sh', 'sudo', 'grep', 'sed', 'awk', 'ls', 'cd', 'cp', 'mv', 'rm', 'mkdir', 'chmod', 'chown',
  'git', 'pnpm', 'npm', 'yarn', 'node', 'curl', 'wget', 'echo', 'printf', 'cat', 'find', 'xargs',
  'alias', 'export', 'set', 'unset', 'read', 'source', 'type', 'which', 'whoami', 'id', 'groups',
  'ps', 'top', 'kill', 'df', 'du', 'free', 'uname', 'hostname', 'ip', 'ping', 'ssh', 'scp', 'rsync',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'systemctl', 'journalctl', 'docker', 'kubectl',
  'apt', 'yum', 'brew', 'cargo'
].join('|');

// Languages that should render as unadorned plaintext without tokenization
const PLAIN_TEXT_LANGUAGES = new Set([
  'plaintext', 'text', 'txt', 'none', 'raw', 'nohighlight', 'no-highlight'
]);

// Languages that follow markdown formatting conventions rather than procedural code
const MARKDOWN_LANGUAGES = new Set([
  'markdown', 'md', 'mkd', 'mdx'
]);

// Boolean and null constants get their own token type so themes can colour them
// distinctly (highlight.js uses hljs-literal for true/false/null/None/nil).
const LITERALS = ['true', 'false', 'null', 'None', 'True', 'False', 'nil'].join('|');

// Markdown structure regex: highlights document structure without false-positive keyword tagging
const MARKDOWN_REGEX = new RegExp(
  '(?<comment><!--[\\s\\S]*?-->)' +
  '|(?<section>^#{1,6}[ \\t][^\\r\\n]*)' +
  '|(?<code>```[\\s\\S]*?```|`[^`\\r\\n]+`)' +
  '|(?<quote>^[ \\t]*>[ \\t]?[^\\r\\n]*)' +
  '|(?<bullet>^[ \\t]*(?:[-*+]|\\d+\\.)[ \\t])' +
  '|(?<strong>\\*\\*[^\\*\\r\\n]+\\*\\*|__[^_\\r\\n]+__)' +
  '|(?<emphasis>\\*[^\\*\\r\\n]+\\*|_[^_\\r\\n]+_)' +
  '|(?<link>\\[[^\\]\\r\\n]+\\]\\([^\\)\\r\\n]+\\))' +
  '|(?<tag><\\/?[a-zA-Z0-9_-]+(?:\\s+[^>]*?)?>)',
  'gm'
);

// We use named capture groups so we can easily map matches back to their token types.
// Order is critical: comments first, then strings, then numbers, then keywords, etc.
// [^\r\n] handles both Unix (LF) and Windows (CRLF) line endings (fixes issue #3).
const UNIVERSAL_REGEX = new RegExp(
  `(?<comment>\\/\\/[^\\r\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\r\\n]*|<!--[\\s\\S]*?-->)` +
  `|(?<string>"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)` +
  `|(?<number>\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b|\\b0x[a-fA-F0-9]+\\b)` +
  `|(?<literal>\\b(?:${LITERALS})\\b)` +
  `|(?<keyword>\\b(?:${COMMON_KEYWORDS})\\b)` +
  `|(?<variable>\\$[a-zA-Z0-9_$]+|\\$\\{[a-zA-Z0-9_$]+\\})` +
  `|(?<function>[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\())` +
  `|(?<property>(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*)` +
  `|(?<operator>[=+\\-*\\/%&|<>!^~?:]+)`,
  'g'
);

export interface HighlightOptions {
  /**
   * Target language for heuristic tokenization or bypass.
   */
  language?: string;
  /**
   * Mimic `highlight.js` class names to maintain compatibility with existing themes.
   */
  mimicHljs?: boolean;
}

export function highlight(code: string, options: HighlightOptions = {}): { value: string; language: string } {
  const rawLang = options.language ? String(options.language).trim() : '';
  const langKey = rawLang.toLowerCase();

  // 1. Plaintext bypass: return securely escaped text with zero span tags
  if (langKey && PLAIN_TEXT_LANGUAGES.has(langKey)) {
    return {
      value: escapeHtml(code),
      language: rawLang
    };
  }

  const isHljs = options.mimicHljs !== false;
  const isMarkdown = Boolean(langKey && MARKDOWN_LANGUAGES.has(langKey));
  const activeRegex = isMarkdown ? MARKDOWN_REGEX : UNIVERSAL_REGEX;

  // Reset regex state for global regexes
  activeRegex.lastIndex = 0;

  let result = '';
  let lastIndex = 0;

  for (const match of code.matchAll(activeRegex)) {
    const start = match.index!;
    const text = match[0];
    const groups = match.groups!;

    // Append un-matched text (escaped)
    if (start > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, start));
    }
    lastIndex = start + text.length;

    // Identify token
    let tokenType = '';
    for (const key in groups) {
      if (groups[key] !== undefined) {
        tokenType = key;
        break;
      }
    }

    // Process Token Class
    let className = tokenType;
    if (isHljs) {
      // Remap token types to match highlight.js CSS class names.
      // comment/string/number/keyword/literal keep their hljs-* names as-is.
      if (tokenType === 'function') className = 'title function_';
      else if (tokenType === 'property') className = 'attr';
      else if (tokenType === 'operator') className = 'operator';
      else if (tokenType === 'variable') className = 'variable';
      else if (tokenType === 'section') className = 'section';
      else if (tokenType === 'bullet') className = 'bullet';
      else if (tokenType === 'quote') className = 'quote';
      else if (tokenType === 'strong') className = 'strong';
      else if (tokenType === 'emphasis') className = 'emphasis';
      else if (tokenType === 'code') className = 'code';
      else if (tokenType === 'link') className = 'link';
      else if (tokenType === 'tag') className = 'tag';

      className = `hljs-${className}`;
    }

    result += `<span class="${className}">${escapeHtml(text)}</span>`;
  }

  // Append remaining text
  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return {
    value: result,
    language: rawLang || 'plaintext'
  };
}

// Ensure similar API signature to highlight.js
export default {
  highlight,
  getLanguage: () => true // Assume support for all languages requested!
};