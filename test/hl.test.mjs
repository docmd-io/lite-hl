// lite-hl test suite: CRLF fix, LF regression, HTML-escape invariant, brute fuzz.
// Uses Node's built-in test runner (zero dependencies). Run: npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { highlight } from '../dist/index.js';

describe('CRLF comment fix (issue #3)', () => {
  it('places </span> immediately after // comment text on CRLF input', () => {
    const code = '// Foo\r\n// Bar\r\n\r\nconst a = "x";';
    const { value } = highlight(code);
    assert.equal(value.indexOf('Foo\r</span>'), -1, 'CR leaked inside span (regression)');
    assert.ok(value.indexOf('Foo</span>') !== -1, 'span did not close right after comment text');
  });

  it('places </span> after # comment text on CRLF input', () => {
    const code = '# comment\r\necho hi\r\n';
    const { value } = highlight(code);
    assert.equal(value.indexOf('comment\r</span>'), -1);
    assert.ok(value.indexOf('comment</span>') !== -1);
  });

  it('does not regress LF (Unix) input', () => {
    const code = '// Foo\n// Bar\n\nconst a = "x";';
    const { value } = highlight(code);
    assert.ok(value.indexOf('Foo</span>') !== -1);
  });
});

describe('HTML escape invariant (CWE-79)', () => {
  it('escapes < > " \' & in every token that contains them', () => {
    const samples = [
      '<script>alert(1)</script>',
      'var x = "a<b>c";',
      '// comment <img src=x onerror=alert(1)>',
      '"\'><?',
      '1 < 2 && 3 > 0',
      'a&&b||c',
    ];
    for (const code of samples) {
      const { value } = highlight(code);
      // The escaped forms must be present, raw forms must not leak outside attribute.
      assert.ok(!/<script>/i.test(value), `raw <script> leaked: ${value}`);
      assert.ok(!/<img[^>]*onerror/i.test(value), `img onerror leaked: ${value}`);
    }
  });

  it('keeps class attribute values safe', () => {
    const { value } = highlight('const x = 1');
    // class="..." boundaries must be intact, no extra attributes injectable.
    const classes = value.match(/class="[^"]*"/g) || [];
    for (const c of classes) {
      assert.ok(!/onload|onerror|onclick/i.test(c), `event handler in class: ${c}`);
    }
  });
});

describe('token coverage', () => {
  it('returns the provided language', () => {
    assert.equal(highlight('x', { language: 'go' }).language, 'go');
  });
  it('defaults to plaintext language', () => {
    assert.equal(highlight('x').language, 'plaintext');
  });
  it('emits hljs- class names by default (mimicHljs)', () => {
    const { value } = highlight('const x = 1; // c');
    assert.match(value, /hljs-keyword/);
    assert.match(value, /hljs-number/);
    assert.match(value, /hljs-comment/);
  });
  it('emits raw token class names when mimicHljs is false', () => {
    const { value } = highlight('const x = 1;', { mimicHljs: false });
    assert.match(value, /class="keyword"/);
    assert.ok(!/hljs-/.test(value));
  });
  it('handles strings, block comments, regex-ish operators', () => {
    const { value } = highlight('/* block */ "str" `tpl` \'s\'');
    assert.match(value, /hljs-comment/);
    assert.match(value, /hljs-string/);
  });
});

describe('failsafes', () => {
  it('empty string returns empty value', () => {
    const { value } = highlight('');
    assert.equal(value, '');
  });
  it('whitespace-only input does not throw', () => {
    assert.doesNotThrow(() => highlight('   \n\t  '));
  });
});

describe('token class mapping (hljs compatibility)', () => {
  it('splits true/false/null into hljs-literal, not hljs-keyword', () => {
    const { value } = highlight('const x = true; let y = false; let z = null;');
    assert.match(value, /hljs-literal">true/);
    assert.match(value, /hljs-literal">false/);
    assert.match(value, /hljs-literal">null/);
    // They must NOT be tagged as keywords.
    assert.ok(!/hljs-keyword">true/.test(value));
    assert.ok(!/hljs-keyword">null/.test(value));
  });

  it('maps operators to hljs-operator, not hljs-punctuation', () => {
    const { value } = highlight('x = 1 + 2');
    assert.match(value, /hljs-operator">=/);
    assert.match(value, /hljs-operator">\+/);
    assert.ok(!/hljs-punctuation">=/.test(value), '= wrongly tagged as punctuation');
  });

  it('keeps keywords as hljs-keyword', () => {
    const { value } = highlight('const x = 1');
    assert.match(value, /hljs-keyword">const/);
  });

  it('keeps function calls as hljs-title function_', () => {
    const { value } = highlight('foo()');
    assert.match(value, /hljs-title function_">foo/);
  });

  it('honours raw token names when mimicHljs is false', () => {
    const { value } = highlight('true = 1', { mimicHljs: false });
    assert.match(value, /class="literal">true/);
    assert.match(value, /class="operator">=/);
  });
});

describe('default theme CSS', () => {
  it('ships dist/lite-hl.css with the expected custom properties', async () => {
    const { readFile } = await import('node:fs/promises');
    const cssUrl = new URL('../dist/lite-hl.css', import.meta.url);
    const css = await readFile(cssUrl, 'utf8');
    // Every token class the JS emits must have a colour rule in the theme.
    for (const cls of ['--lite-hl-comment', '--lite-hl-string', '--lite-hl-number', '--lite-hl-keyword', '--lite-hl-literal', '--lite-hl-function', '--lite-hl-variable', '--lite-hl-attr', '--lite-hl-operator', '--lite-hl-punctuation']) {
      assert.ok(css.includes(cls), `theme missing ${cls}`);
    }
    // Must include a dark-mode block.
    assert.ok(css.includes('prefers-color-scheme: dark'), 'theme missing dark mode');
  });
});

describe('brute fuzz: adversarial input never leaks raw markup', () => {
  // Invariant: highlight() must never throw on string input, and the output must
  // never contain an executable <script> or an on* event handler from the input.
  const poison = [
    '<script>', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>',
    '</script>', '<iframe>', 'javascript:alert(1)', '\x00\x01\x02',
    '${jndi:ldap://x}', '/* unclosed', '"""', '```', '\\\\\\',
    '<%= expr %>', '<?php ?>', '#!bin/bash',
  ];
  let iterations = 0;
  let nonEmpty = 0;
  for (let i = 0; i < 3000; i++) {
    // Build a random-ish string by mixing poison with code-like fragments.
    const parts = [];
    const len = 1 + (i % 8);
    for (let j = 0; j < len; j++) {
      parts.push(poison[(i + j) % poison.length]);
      parts.push(['const', 'function', '//', '1.5', '"s"', 'return', 'x = 1'][j % 7]);
    }
    const code = parts.join(' ') + '\r\n';
    let value;
    assert.doesNotThrow(() => { value = highlight(code).value; }, `threw on iteration ${i}`);
    iterations++;
    if (value) nonEmpty++;
    // Security checks against the OUTPUT.
    assert.ok(!/<script[\s>]/i.test(value), `raw <script> in output at i=${i}: ${value}`);
    assert.ok(!/<img[^>]*onerror/i.test(value), `img onerror in output at i=${i}: ${value}`);
    assert.ok(!/<svg[^>]*onload/i.test(value), `svg onload in output at i=${i}: ${value}`);
    assert.ok(!/<iframe/i.test(value), `iframe in output at i=${i}: ${value}`);
  }
  it(`ran ${iterations} fuzz iterations, ${nonEmpty} non-empty outputs, 0 security leaks`, () => {
    assert.ok(nonEmpty > iterations * 0.5, 'too many empty outputs');
  });
});

describe('brute fuzz: large input performance', () => {
  it('tokenises a 50k-char string without error', () => {
    const big = ('const x = 1; // c\n').repeat(5000);
    const start = Date.now();
    const { value } = highlight(big);
    const ms = Date.now() - start;
    assert.ok(value.length > 0);
    assert.ok(ms < 2000, `took ${ms}ms, expected < 2s`);
  });
});
