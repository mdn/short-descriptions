// Examples:
// Check the color property page summary on MDN Web Docs:
//    $ npm run lint-short-descriptions color
// Check the color and background-color properties' page summaries on MDN
//    $ npm run lint-short-descriptions color background-color
// Check the contents of standard input as if it were a short description
//    $ npm run lint-short-descriptions -

const readline = require('readline');

const jsdom = require('jsdom');
const { properties } = require('mdn-data').css;
const { contentRules, fragmentToDom } = require('./content-rules');

const excludedRules = ['no-nbsps', 'no-forbidden-attrs'];
const wikiRules = contentRules.filter(rule => !excludedRules.includes(rule.name));

const nameToURL = (property) => {
  // turn a CSS property name into an raw MDN page summary URL
  if (properties[property] === undefined) {
    console.error(`${property} is not a known CSS property in mdn-data`);
    process.exit(1);
  }

  if (properties[property].mdn_url === undefined) {
    console.error(`${property} does not have an MDN URL in mdn-data`);
    process.exit(1);
  }

  const cacheBuster = Math.random().toString(36).substr(2, 5);
  return `${properties[property].mdn_url}?raw&summary&${cacheBuster}`;
};

const stdinToDom = () => new Promise((resolve) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });
  const lines = [];

  rl.on('line', line => lines.push(line));
  rl.on('close', () => resolve(fragmentToDom(lines)));
});

const urlToDom = async url => (await jsdom.JSDOM.fromURL(url)).window.document.querySelector('body');

const checkSummary = (dom, propertyName, url) => {
  wikiRules.forEach((rule) => {
    const result = rule.check(dom);

    if (!result.passes) {
      result.errors.forEach(e => console.error(`${propertyName} (${url}): ${e}`));
    }
  });
};

const main = (args) => {
  const sequence = [];

  args.forEach((arg) => {
    let url;
    let dom;

    if (arg === '-') {
      url = 'no URL';
      dom = stdinToDom();
    } else {
      url = nameToURL(arg);
      dom = urlToDom(url);
    }

    sequence.push({
      prop: arg,
      url,
      dom,
    });
  });

  sequence.forEach(async (item) => {
    const dom = await item.dom;
    checkSummary(dom, item.prop, item.url);
  });
};

const cli = () => main(process.argv.slice(2));

if (require.main === module) {
  cli();
}
