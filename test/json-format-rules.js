const assert = require('assert');

const ok = { passes: true, errors: [] };

const jsonFormatRules = [
  {
    name: 'parseable',
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
    name: 'formatted',
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
  jsonFormatRules.forEach((rule) => {
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

module.exports = { jsonFormatRules };
