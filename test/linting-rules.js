const assert = require('assert');
const jsdom = require('jsdom');

const maxLength = 180;
const maxFirstSentenceLength = 150;
const allowedTags = {
  A: ['href'],
  CODE: [],
  EM: [],
  STRONG: [],
};

const fragmentToDom = html => (new jsdom.JSDOM(html)).window.document.querySelector('body');

const forbiddenTags = (dom) => {
  const tagSet = new Set();
  dom.querySelectorAll('*').forEach(elem => tagSet.add(elem.tagName));
  return Array.from(tagSet).filter(v => !Object.keys(allowedTags).includes(v));
};

const forbiddenAttrs = (dom) => {
  const badAttrs = [];

  dom.querySelectorAll('*').forEach((elem) => {
    const allowedAttrs = allowedTags[elem.tagName];

    if (allowedAttrs) {
      const attrNames = Array.from(elem.attributes).map(value => value.name);
      attrNames.filter(attr => !allowedAttrs.includes(attr))
        .forEach(attr => badAttrs.push(`${elem.tagName}.${attr}`));
    }
  });

  return badAttrs;
};

const ok = { passes: true, errors: [] };

const contentRules = [
  {
    description: `First sentence should not exceed ${maxFirstSentenceLength} characters`,
    bad: 'This is a very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very, very long first sentence. This is the second sentence.',
    good: 'This is a short first sentence. This is the second sentence.',
    check(dom) {
      const firstSentence = dom.textContent.replace(/\.(?!\d)/g, '.\x1f').split('\x1f')[0];

      const passes = firstSentence.length <= maxFirstSentenceLength;

      if (passes) {
        return ok;
      }
      return {
        passes,
        errors: [
          `First sentence may be too long. Expected ≤${maxFirstSentenceLength}; got ${firstSentence.length}`,
          `> ${firstSentence.slice(0, maxFirstSentenceLength)}\x1b[41m${firstSentence.slice(maxFirstSentenceLength)}\x1b[0m`,
        ],
      };
    },
  },
  {
    description: `Overall length should not exceed ${maxLength} characters`,
    bad: "This is an example. This is an example. This is an example. This is an example. This is an example. This is an example. This is an example. This is an example. This is an example. But now we've gone on too long.",
    good: 'This is short and sweet.',
    check(dom) {
      const text = dom.textContent;
      const passes = text.length <= maxLength;

      if (passes) {
        return ok;
      }
      return {
        passes,
        errors: [
          `Summary is too long. Expected ≤${maxLength} characters; got ${text.length}`,
          `> ${text.slice(0, maxLength)}\x1b[41m${text.slice(maxLength)}\x1b[0m`,
        ],
      };
    },
  },
  {
    description: '"&nbsp;" shouldn\'t be used',
    bad: 'Use&nbsp;literal&nbsp;spaces.',
    good: 'Use literal spaces.',
    wiki: false,
    check(dom) {
      const html = dom.innerHTML;

      const passes = !html.includes('&nbsp');

      if (passes) {
        return ok;
      }
      return {
        passes,
        errors: [
          'Contains `&nbsp;` instead of literal spaces.',
          `> ${html.replace(/&nbsp;/g, '\x1b[41m&nbsp;\x1b[0m')}`,
        ],
      };
    },
  },
  {
    description: 'Only use allowed tags',
    bad: "<div>I am a poet<br> and didn't even know it.</div>",
    good: "I am a poet and didn't even know it.",
    check(dom) {
      const badTags = forbiddenTags(dom);

      const passes = badTags.length === 0;

      if (passes) {
        return ok;
      }

      const badElems = dom.querySelectorAll(badTags.join(', '));
      const badHTML = [...badElems].map(elem => `> ${elem.parentNode.innerHTML}`);
      const errors = [
        `Contains forbidden tags: \x1b[41m${badTags.join(', ')}\x1b[0m`,
        ...badHTML,
      ];

      return {
        passes,
        errors,
      };
    },
  },
  {
    description: 'Only use allowed attributes',
    bad: '<a data-random="v7mm9m5c" href="https://developer.mozilla.org/">MDN Web Docs</a>',
    good: '<a href="https://developer.mozilla.org/">MDN Web Docs</a>',
    wiki: false,
    check(dom) {
      const badAttrs = forbiddenAttrs(dom);

      const passes = badAttrs.length === 0;

      if (passes) {
        return ok;
      }
      return {
        passes,
        errors: [
          `Contains forbidden attributes: \x1b[41m${badAttrs.join(', ')}\x1b[0m`,
        ],
      };
    },
  },
];

const sourceRules = [
  {
    description: 'JSON must be parseable',
    bad: '{',
    good: '{}',
    check(source) {
      try {
        JSON.parse(source);
        return ok;
      } catch (err) {
        return {
          passes: false,
          errors: [`Could not parse as JSON: ${err}`],
        };
      }
    },
  },
  {
    description: 'JSON should be formatted as in `JSON.stringify(<source>, null, 2)`',
    bad: `{
"css": {
"properties": {
"align-content": {
"__short_description": ""
}
}
}
}`,
    good: `{
  "css": {
    "properties": {
      "align-content": {
        "__short_description": ""
      }
    }
  }
}`,
    check(source) {
      const expected = `${JSON.stringify(JSON.parse(source), null, 2)}\n`;

      const actualLines = source.split('\n');
      const expectedLines = expected.split('\n');

      for (let i = 0; i < actualLines.length; i += 1) {
        if (actualLines[i] !== expectedLines[i]) {
          const result = {
            passes: false,
            errors: [
              'Unexpected JSON formatting',
              `Line ${i + 1} (Expected): ${expectedLines[i]}`,
              `Line ${i + 1} (Actual): \x1b[41m${actualLines[i]}\x1b[0m`,
            ],
          };
          return result;
        }
      }

      return ok;
    },
  },
];

const testRules = () => {
  contentRules.forEach((rule) => {
    const good = rule.check(fragmentToDom(rule.good));
    const bad = rule.check(fragmentToDom(rule.bad));

    assert.ok(good.passes, `Expected \`true\` for result of "${rule.description}" good example.`);
    assert.deepStrictEqual(good.errors, [], `Expected 0 errors for "${rule.description}" good example.`);

    assert.ok(bad.passes === false, `Expected \`false\` for result of "${rule.description}" bad example.`);
    assert.ok(bad.errors.length > 0, `Expected errors for "${rule.description}" bad example.`);
  });
  sourceRules.forEach((rule) => {
    const good = rule.check(rule.good);
    const bad = rule.check(rule.bad);

    assert.ok(good.passes, `Expected \`true\` for result of "${rule.description}" good example.`);
    assert.deepStrictEqual(good.errors, [], `Expected 0 errors for "${rule.description}" good example.`);

    assert.ok(bad.passes === false, `Expected \`false\` for result of "${rule.description}" bad example.`);
    assert.ok(bad.errors.length > 0, `Expected errors for "${rule.description}" bad example.`);
  });
};

if (require.main === module) {
  testRules();
}

module.exports = {
  sourceRules,
  contentRules,
  fragmentToDom,
};
