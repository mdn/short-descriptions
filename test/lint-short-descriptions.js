// Examples:
// Check the color property page summary on MDN Web Docs:
//    $ npm run lint-short-descriptions color
// Check the color and background-color properties' page summaries on MDN
//    $ npm run lint-short-descriptions color background-color
// Check the contents of standard input as if it were a short description
//    $ npm run lint-short-descriptions -
// Demo mode
//    $ npm run lint-short-descriptions -- --self-test

const readline = require('readline');

const request = require('request');
const jsdom = require('jsdom');
const { properties } = require('mdn-data').css;

const lengthLimit = 180;
const firstSentenceLengthLimit = 150;
const allowed = {
  A: ['href'],
  CODE: [],
  EM: [],
  STRONG: [],
};

const cli = async () => {
  process.argv.includes('--self-test') ? test() : main(process.argv.slice(2));
};

const main = async (args) => {
  try {
    while (args.length) {
      let prop = args.shift();
      let url = '';
      let summary = '';

      if (prop === '-') {
        prop = 'standard input';
        url = 'no URL';
        summary = await readDataFromStdin();
      } else {
        url = nameToURL(prop);
        summary = await readDataFromURL(url);
      }

      checkSummary(summary, prop, url);
    }
  } catch (e) {
    console.trace(e);
  }
};

const test = () => {
  const exampleOK = 'The <strong><code>color</code></strong> CSS property sets the foreground <a href="https://developer.mozilla.org/docs/Web/CSS/color_value">color value</a> of an element\'s text and <a href="https://developer.mozilla.org/docs/Web/CSS/text-decoration">text decorations</a>. It also sets the <a href="https://developer.mozilla.org/docs/Web/CSS/currentcolor"><code>currentcolor</code></a> value, an indirect value on <em>other</em> properties.';
  const exampleNotOK = 'The <strong><code>color</code></strong> CSS property sets the foreground <a href="/en-US/docs/Web/CSS/color_value">color value</a> of an element\'s text content and <a href="/en-US/docs/Web/CSS/text-decoration" name=\'notallowed\'>text decorations</a> and also this sentence is much too long to be the first sentence of a short description. And the whole thing should be less than 180 characters. <span>And this enclosing span tag is not allowed</span>. And neither is hidden br tag <br/>.';

  console.log('-- Testing OK text --');
  checkSummary(exampleOK, 'color', 'https://developer.mozilla.example/thisIsNotARealURL');

  console.log('-- Testing not OK text --');
  checkSummary(exampleNotOK, 'color', 'https://developer.mozilla.example/thisIsNotARealURL');
};

const checkSummary = (summaryData, propertyName, url) => {
  const checks = [
    checkLength,
    checkFirstSentenceLength,
    checkTags,
    checkAttrs,
  ];

  let ok = true;
  const messages = [];

  const summaryDom = new jsdom.JSDOM(summaryData);
  const summaryText = summaryDom.window.document.querySelector('body').textContent;

  for (const check of checks) {
    const { status, errors } = check(propertyName, summaryText, summaryDom);
    if (!status) {
      ok = false;
      messages.push(...errors);
    }
  }

  if (ok) {
    console.log(`✅ \x1b[1m${propertyName}\x1b[0m (${url}) is OK`);
  } else {
    console.error(`❌ \x1b[1m${propertyName}\x1b[0m (${url}) has problems`);
    messages.forEach(value => console.log(value));
  }
};

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

const readDataFromStdin = async () => 
  // read text from standard input (returns a Promise)
   new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    const lines = [];

    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolve(lines));
  })
;

const readDataFromURL = async (url) => 
  // fetch URL (returns a Promise)
   new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      error ? reject(error) : {};
      resolve(body);
    });
  })
;

const checkLength = (propertyName, summaryText, summaryDom) => {
  if (isLengthOK(summaryText)) {
    return {status: true};
  } 
    return {
      status: false,
      errors: [
        `    ❌ ${propertyName} summary is too long. Expected ≤${lengthLimit} displayed characters, got ${summaryText.length}`,
        `       > ${summaryText.slice(0,180)}\x1b[41m${summaryText.slice(180)}\x1b[0m`
      ]
    };
  
};

const checkFirstSentenceLength = (propertyName, summaryText, summaryDom) => {
  const sentence = firstSentence(summaryText);
  if (isFirstSentenceLengthOK(summaryText)) {
    return {status: true};
  } 
    return {
      status: false,
      errors: [
        `    ⁉️  ${propertyName} summary's first sentence may be too long. Expected ≤${firstSentenceLengthLimit} displayed characters, got ${sentence.length}`,
        `       > ${sentence.slice(0, firstSentenceLengthLimit)}\x1b[41m${sentence.slice(firstSentenceLengthLimit)}\x1b[0m`
      ]
    };
  
};

const checkTags = (propertyName, summaryText, summaryDom) => {
  const tagSet = getTagSet(summaryDom);
  if (areTagsOK(tagSet)) {
    return {status: true};
  } 
    return {
      status: false,
      errors: [
        `    ❌ ${propertyName} summary contains forbidden tags: ${forbiddenTags(tagSet).join(', ')}\x1b[0m`
      ]
    };
  
};

const checkAttrs = (propertyName, summaryText, summaryDom) => {
  if (areAttrsOK(summaryDom)) {
    return {status: true};
  } 
    return {
      status: false,
      errors: [
        `    ❌ ${propertyName} summary contains forbidden attributes: ${forbiddenAttrs(summaryDom).join(', ')}\x1b[0m`
      ]
    };
  
};

const isLengthOK = text => lengthLimit >= text.length;

const isFirstSentenceLengthOK = text => firstSentenceLengthLimit >= firstSentence(text).length;

const firstSentence = (text) => 
  // a very simplistic attempt to match the first sentence of the summary
   text.replace(/\.(?!\d)/g, '.\x1f').split('\x1f')[0]
;

const areTagsOK = tagSet => forbiddenTags(tagSet).length === 0;

const forbiddenTags = tagSet => Array.from(tagSet).filter(value => !Object.keys(allowed).includes(value));

const getTagSet = (dom) => {
  const tagSet = new Set();
  for (const elem of dom.window.document.querySelectorAll('BODY *')) {
    tagSet.add(elem.tagName);
  }
  return tagSet;
};

const areAttrsOK = dom => forbiddenAttrs(dom).length === 0;

const forbiddenAttrs = (dom) => {
  const badAttrs = [];

  for (const elem of dom.window.document.querySelectorAll('BODY *')) {
    const allowedAttrs = allowed[elem.tagName];

    if (allowedAttrs === undefined) {
      continue;
    }

    const attrNames = Array.from(elem.attributes).map(value => value.name);
    attrNames.filter(attr => !allowedAttrs.includes(attr))
      .forEach(attr => badAttrs.push(`${elem.tagName}.${attr}`));
  }

  return badAttrs;
};

cli();
