# lite-hl

**A Universal, Heuristic-Based Syntax Highlighter for the Modern Web.**

`lite-hl` is a high-performance, zero-config code tokenizer designed to provide high-fidelity syntax highlighting without the overhead of traditional grammar-based engines. It is built for environments where performance, bundle size, and total language coverage are critical.

## Technical Specifications

- **Runtime**: Node.js (ESM), Browser (Modern), Edge/Cloudflare Workers.
- **Language**: Written in native TypeScript.
- **Distribution**: Pure ESM (CommonJS not supported).
- **Size**: Under 10KB (Gzipped).

## The Architecture: Heuristic vs. Grammar

Traditional highlighters like `highlight.js` or `Prism` rely on hundreds of massive, language-specific grammar files (regex sets). To support 50 languages, you must load and parse 50 grammar sets, which leads to significant bundle bloat and increased time-to-interactive (TTI).

`lite-hl` utilizes a **Universal Heuristic Engine**. Instead of strictly enforcing language rules, it identifies universal programming patterns—comments, strings, numbers, keywords, and function invocations—using an optimized single-pass lexical scanner.

### Technical Limitations (Design Choices)

To maintain its ultra-light footprint, `lite-hl` makes specific engineering trade-offs:

1.  **Heuristic Tokenization**: Unlike `highlight.js` which performs full semantic parsing, `lite-hl` uses high-fidelity regex heuristics. This means it may not capture extremely complex, multi-line language-specific edge cases that require a full state-machine parser.
2.  **No Language Detection**: `lite-hl` does not attempt to guess the language of a code block. It treats all code as universal programming structures.
3.  **ESM Only**: This package is a pure ES Module. Legacy `require()` environments are not supported natively without a bundler.
4.  **No Line Numbering**: Standard logic focuses on tokenization only; line numbering should be handled by your UI layer or CSS.

*   **Ultra-Lightweight**: At under 10KB, it is a fraction of the size of `highlight.js`.
*   **Zero-Config Coverage**: Supports every programming language automatically. There is no need to "register" or import language definitions.
*   **Smart Plaintext Bypass**: Native passthrough for plain text code blocks (`plaintext`, `text`, `txt`, `none`, `raw`, `nohighlight`, `no-highlight`), safely escaping HTML without injecting false keyword styling.
*   **Structural Markdown Highlighting**: Intelligent tokenization for `markdown` / `md` code blocks (headings, bold, italic, code spans, quotes, bullets, links) without false-positive keyword matches on normal prose.
*   **Deep Shell Script Support**: Robust parsing of Bash/Shell conventions, recognizing 60+ common utilities (`grep`, `awk`, `docker`, etc.) and dynamic variables (`$VAR`, `${VAR}`).
*   **High Performance**: Tokenization happens in a single regex pass. It is optimized for large-scale documentation generators and real-time previews.
*   **Legacy Compatibility**: Natively supports a `mimicHljs` mode, allowing you to use existing `highlight.js` CSS themes (like GitHub, Atom, or Monokai) exactly as they are without modification.
*   **Runtime Agnostic**: Works perfectly in Node.js, the browser, and Edge environments.

## Installation

```bash
npm install lite-hl
```

## Quick Start

### Basic Output

```javascript
import { highlight } from 'lite-hl';

const code = `function init() { console.log("System Ready"); }`;
const { value } = highlight(code);
```

### highlight.js Drop-in Replacement

To use your existing CSS themes, enable `mimicHljs`:

```javascript
import { highlight } from 'lite-hl';

const { value } = highlight(code, { mimicHljs: true });
// Generates spans with 'hljs-' prefixed classes.
```

## Smart Language Handling

### Plaintext & Unstyled Blocks

When displaying logs, terminal output, configuration snippets, or raw plain text, traditional heuristic engines often mistakenly highlight English words like `while`, `for`, `in`, or `to` as programming keywords.

`lite-hl` provides a native bypass for plain text languages:
```javascript
import { highlight } from 'lite-hl';

const output = highlight('for each item in our report, while pending...', {
  language: 'plaintext'
});
// Safely HTML-escapes content and emits 0 token spans (no false keyword colors).
```

Recognized plain text aliases:
- `plaintext`, `text`, `txt`, `none`, `raw`, `nohighlight`, `no-highlight`

### Structural Markdown Highlighting

When `language: 'markdown'` or `language: 'md'` is specified, `lite-hl` activates a specialized structural Markdown scanner instead of programming heuristics:
- **Headings** (`# Title`) → `hljs-section`
- **Bold text** (`**text**`) → `hljs-strong`
- **Italic text** (`*text*`) → `hljs-emphasis`
- **Inline code** (`` `code` ``) → `hljs-code`
- **Blockquotes** (`> quote`) → `hljs-quote`
- **Bullet lists** (`- item`, `* item`) → `hljs-bullet`
- **Hyperlinks** (`[text](url)`) → `hljs-link`
- **Containers / Tags** (`::: tag`, `<tag>`) → `hljs-tag`

Normal sentence structure within Markdown documents remains uncolored, eliminating false-positive programming keyword styling across your documentation.

## Comparisons

| Feature | highlight.js | lite-hl |
| :--- | :--- | :--- |
| **Size (approx)** | ~1.2MB (all languages) | **<10KB** |
| **Logic** | Grammar-based | **Heuristic-based** |
| **Setup** | Require language imports | **Zero configuration** |
| **Async Support** | Limited | **Native** |

## API Reference

### `highlight(code, options)`

**Arguments:**
- `code` (string): The raw source code to tokenize.
- `options` (object):
    - `language` (string, optional): Language identifier. Supports programming languages (e.g. `javascript`, `python`, `rust`, `bash`), Markdown (`markdown`, `md`), or plaintext variants (`plaintext`, `text`, `txt`, `none`, `raw`, `nohighlight`, `no-highlight`).
    - `mimicHljs` (boolean, default `true`): Use `hljs-` class prefixes for drop-in CSS theme compatibility. When set to `false`, raw token class names (e.g. `token-keyword`, `token-string`) are emitted.

**Returns:**
- `value` (string): Securely escaped HTML with tokenized spans.
- `language` (string): The detected or provided language.

## Default Theme

`lite-hl` ships an optional CSS theme with built-in light/dark mode support. It uses CSS custom properties, so you can recolour any single token without importing a whole theme file.

```html
<link rel="stylesheet" href="node_modules/lite-hl/dist/lite-hl.css">
```

Or in a bundler:

```javascript
import 'lite-hl/theme.css';
```

The theme honours the user's OS preference via `@media (prefers-color-scheme: dark)` and switches automatically. Override any token inline:

```css
:root { --lite-hl-keyword: #c586c0; }
```

Both `mimicHljs` mode (default) and the bundled theme use the standard `hljs-*` class names, so any existing highlight.js CSS theme remains a drop-in replacement if you prefer your own palette.

## License

MIT - Developed under the docmd ecosystem.