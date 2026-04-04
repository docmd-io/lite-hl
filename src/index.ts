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
  'void', 'null', 'undefined', 'true', 'false', 'def', 'pass', 'None', 'True', 'False',
  'match', 'with', 'as', 'struct', 'func', 'go', 'chan', 'defer', 'select', 'fallthrough',
  'namespace', 'using', 'pkg', 'mod', 'require', 'fn', 'pub', 'mut', 'impl', 'loop', 'unsafe',
  'trait', 'where', 'macro_rules', 'use', 'int', 'float', 'double', 'char', 'bool'
].join('|');

// We use named capture groups so we can easily map matches back to their token types.
// Order is critical: comments first, then strings, then numbers, then keywords, etc.
const UNIVERSAL_REGEX = new RegExp(
  `(?<comment>\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*|<!--[\\s\\S]*?-->)` +
  `|(?<string>"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)` +
  `|(?<number>\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b|\\b0x[a-fA-F0-9]+\\b)` +
  `|(?<keyword>\\b(?:${COMMON_KEYWORDS})\\b)` +
  `|(?<function>[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\())` +
  `|(?<property>(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*)` +
  `|(?<operator>[=+\\-*\\/%&|<>!^~?:]+)`,
  'g'
);

export interface HighlightOptions {
  /**
   * Used strictly for class attribution, does not change the heuristic tokenization.
   */
  language?: string;
  /**
   * Mimic `highlight.js` class names to maintain compatibility with existing themes.
   */
  mimicHljs?: boolean;
}

export function highlight(code: string, options: HighlightOptions = {}): { value: string; language: string } {
  const isHljs = options.mimicHljs !== false;
  let result = '';
  let lastIndex = 0;

  for (const match of code.matchAll(UNIVERSAL_REGEX)) {
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
      if (tokenType === 'function') className = 'title function_';
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
    language: options.language || 'plaintext'
  };
}

// Ensure similar API signature to highlight.js
export default {
  highlight,
  getLanguage: () => true // Assume support for all languages requested!
};