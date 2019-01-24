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
    a.href = a.href.replace(/[/]\w\w-\w\w(?=[/])/g, '');
  }
};

const abs = (aElem) => {
  // Make an A element's href attribute absolute
  const a = aElem;

  // An element's href property returns an absolute URL, but innerHTML seralizes a relative URL.
  // The next line looks like it does nothing, but it replaces a relative URL with an absolute.
  a.href = a.href;
};

const domTransforms = {
  cleanLinks: (dom) => {
    dom.window.document.querySelectorAll('BODY A').forEach((elem) => {
      abs(elem);
      delocalize(elem);
    });

    return dom;
  },

  stripUnwantedAttrs: (dom) => {
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

  toHTML: dom => dom.window.document.querySelector('BODY').innerHTML,
};

const htmlTransforms = {
  replaceDoubleQuotes: html => html.replace(/"/g, "'"),
  removeNbsps: html => html.replace(/&nbsp;/g, ' '),
};

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
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
};

const main = (args) => {
  const props = args.length === 0 ? allProperties : args;

  props.forEach((propName, index) => {
    const url = properties[propName].mdn_url;

    if (url === undefined) {
      console.warn(`WARNING: ${propName} has no \`mdn_url\` value. Skipping.`);
      return;
    }

    delay(index * 500)
      .then(() => jsdom.JSDOM.fromURL(summarize(url)))
      .then(domTransforms.cleanLinks)
      .then(domTransforms.stripUnwantedAttrs)
      .then(domTransforms.toHTML)
      .then(htmlTransforms.replaceDoubleQuotes)
      .then(htmlTransforms.removeNbsps)
      .then(html => writeToFile(propName, html))
      .catch(console.trace);
  });
};

const cli = () => {
  main(process.argv.slice(2));
};

cli();
