// Examples:
// Scrape the color property page summary on MDN Web Docs to JSON:
//    $ npm run scrape color
// Scrape the color and background-color property page summaries:
//    $ npm run scrape color background-color
// Scrape all the summaries for ALL the property pages known to mdn/data:
//    $ npm run scrape

const fs = require('fs');
const path = require('path');

const { properties } = require('mdn-data').css;
const jsdom = require('jsdom');

const allProperties = Object.keys(properties);

const allowed = {
  A: ['href'],
  CODE: [],
  EM: [],
  STRONG: [],
};

// For limiting requests to the wiki, since it doesn't seem to like it when you make hundreds of
// requests at once.
const delay = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const summarize = (url) => {
  // Add raw, summary, and cache-busting query parameters to a wiki page URL
  const cacheBuster = Math.random().toString(36).substr(2, 5);
  return `${url}?raw&summary&${cacheBuster}`;
};

const delocalize = (aElem) => {
  // Remove the localization path from a wiki page URL (and only wiki page URLs)
  const a = aElem;

  if (a.hostname === 'developer.mozilla.org') {
    const pathComponents = a.pathname.split('/');
    if (pathComponents[1] !== 'docs') {
      pathComponents.splice(1, 1);
      a.pathname = pathComponents.join('/');
    }
  }
};

const abs = (aElem) => {
  // Make an A element's href attribute absolute
  const a = aElem;

  // An element's href property returns an absolute URL, but innerHTML seralizes a relative URL.
  // The next line looks like it does nothing, but it replaces a relative URL with an absolute.
  a.href = a.href;
};

const domTransforms = [
  function cleanLinks(dom) {
    dom.window.document.querySelectorAll('BODY A').forEach((elem) => {
      abs(elem);
      delocalize(elem);
    });

    return dom;
  },

  function stripUnwantedAttrs(dom) {
    dom.window.document.querySelectorAll('BODY *').forEach((elem) => {
      const allowedAttrs = allowed[elem.tagName];

      if (allowedAttrs !== undefined) {
        Array.from(elem.attributes).forEach((attr) => {
          if (!allowedAttrs.includes(attr.name)) {
            elem.removeAttribute(attr.name);
          }
        });
      }
    });
    return dom;
  },

  function toHTML(dom) { return dom.window.document.querySelector('BODY').innerHTML; },
];

const htmlTransforms = [
  function replaceDoubleQuotes(html) { return html.replace(/"/g, "'"); },
  function removeNbsps(html) { return html.replace(/&nbsp;/g, ' '); },
];

const writeToFile = (propertyName, html) => {
  const data = {
    css: {
      properties: {
        [propertyName]: {
          __short_description: html,
        },
      },
    },
  };

  const dest = path.join(__dirname, '../descriptions/css/properties/', `${propertyName}.json`);
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
  }
  fs.writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
};

const main = async (args) => {
  const props = args.length === 0 ? allProperties : args;

  const propPipelines = props.map(async (propName, index) => {
    const property = properties[propName];

    if (property === undefined) {
      return { success: false, name: propName, error: 'Property not found' };
    }

    const url = property.mdn_url;
    if (url === undefined) {
      return { success: false, name: propName, error: 'No `mdn_url` found' };
    }

    try {
      await delay(index * 500);
      const dom = await jsdom.JSDOM.fromURL(summarize(url));

      const html = domTransforms.reduce((domObj, fn) => fn(domObj), dom);
      const final = htmlTransforms.reduce((htmlObj, fn) => fn(htmlObj), html);

      writeToFile(propName, final);
      return { success: true, name: propName };
    } catch (err) {
      console.trace(err);
      return ({ success: false, name: propName, error: err });
    }
  });

  const results = await Promise.all(propPipelines);

  const successes = [];
  const failures = [];
  results.forEach(result => (result.success ? successes.push(result) : failures.push(result)));

  console.log(`\nAttempted to scrape ${results.length} properties.`);
  console.log(`Successfully scraped ${successes.length} properties.`);

  if (failures.length) {
    console.log(`Failed to scrape ${failures.length} properties:`);
    failures.forEach(result => console.log(`  ${result.name}: ${result.error}`));
  }
};

const cli = () => {
  main(process.argv.slice(2));
};

cli();
