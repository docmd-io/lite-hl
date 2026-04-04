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
*   **Deep Shell Script Support**: Robust parsing of Bash/Shell conventions, recognizing 60+ common utilities (`grep`, `awk`, `docker`, etc.) and dynamic variables (`$VAR`, `${VAR}`).
*   **High Performance**: Tokenization happens in a single regex pass. It is optimized for large-scale documentation generators and real-time previews.
*   **Legacy Compatibility**: natively supports a `mimicHljs` mode, allowing you to use existing `highlight.js` CSS themes (like GitHub, Atom, or Monokai) exactly as they are without modification.
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
    - `language` (string): Metadata for attribution (optional).
    - `mimicHljs` (boolean, default `true`): Use `hljs-` class prefixes.

**Returns:**
- `value` (string): Securely escaped HTML with tokenized spans.
- `language` (string): The detected or provided language.

## License

MIT - Developed under the docmd ecosystem by [Ghazi](https://mgks.dev).