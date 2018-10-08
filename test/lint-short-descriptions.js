// Examples:
// Check the color property page summary on MDN Web Docs:
//    $ npm run lint-short-descriptions color
// Check the color and background-color properties' page summaries on MDN
//    $ npm run lint-short-descriptions color background-color
// Check the contents of standard input as if it were a short description
//    $ npm run lint-short-descriptions -
// Demo mode
//    $ npm run lint-short-descriptions -- --self-test

const readline = require('readline')

const request = require('request')
const jsdom = require('jsdom')
const properties = require('mdn-data').css.properties

const lengthLimit = 180
const firstSentenceLengthLimit = 150
const allowed = {
  'A': ['href'],
  'CODE': [],
  'EM': [],
  'STRONG': [],
}

const cli = async () => {
  process.argv.includes('--self-test') ? test() : main(process.argv.slice(2))
}

const main = async (args) => {
  try {
    while (args.length) {
      let prop = args.shift()
      let url = ''
      let summary = ''

      if (prop === '-') {
        prop = 'standard input'
        url = 'no URL'
        summary = await readDataFromStdin()
      }
      else {
        url = nameToURL(prop)
        summary = await readDataFromURL(url)
      }

      checkSummary(summary, prop, url)
    }
  }
  catch (e) {
    console.trace(e)
  }
}

const test = () => {
  const exampleOK = `The <strong><code>color</code></strong> CSS property sets the foreground <a href="https://developer.mozilla.org/docs/Web/CSS/color_value">color value</a> of an element's text and <a href="https://developer.mozilla.org/docs/Web/CSS/text-decoration">text decorations</a>. It also sets the <a href="https://developer.mozilla.org/docs/Web/CSS/currentcolor"><code>currentcolor</code></a> value, an indirect value on <em>other</em> properties.`
  const exampleNotOK = `The <strong><code>color</code></strong> CSS property sets the foreground <a href="/en-US/docs/Web/CSS/color_value">color value</a> of an element's text content and <a href="/en-US/docs/Web/CSS/text-decoration">text decorations</a> and also this sentence is much too long to be the first sentence of a short description. And the whole thing should be less than 180 characters. <span>And this enclosing span tag is not allowed</span>. And neither is hidden br tag <br/>.`

  console.log('-- Testing OK text --')
  checkSummary(exampleOK, 'color', 'https://developer.mozilla.example/thisIsNotARealURL')

  console.log('-- Testing not OK text --')
  checkSummary(exampleNotOK, 'color', 'https://developer.mozilla.example/thisIsNotARealURL')
}

const nameToURL = (property) => {
  // turn a CSS property name into an raw MDN page summary URL
  if (properties[property] === undefined) {
    console.error(`${property} is not a known CSS property in mdn-data`)
    process.exit(1)
  }

  if (properties[property].mdn_url === undefined) {
    console.error(`${property} does not have an MDN URL in mdn-data`)
    process.exit(1)
  }

  return `${properties[property].mdn_url}?summary&raw`
}

const readDataFromStdin = async () => {
  // read text from standard input (returns a Promise)
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    })
    const lines = []

    rl.on('line', (line) => lines.push(line))
    rl.on('close', () => resolve(lines))
  })
}

const readDataFromURL = async (url) => {
  // fetch URL (returns a Promise)
  return new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      error ? reject(error) : {}
      resolve(body)
    })
  })
}

const checkSummary = (summaryData, propertyName, url) => {
  let ok = true
  const errors = []

  const summaryDom = new jsdom.JSDOM(summaryData)
  const summaryText = summaryDom.window.document.querySelector('body').textContent

  if (!isLengthOK(summaryText)) {
    ok = false
    errors.push(`    ❌ ${propertyName} summary is too long. Expected <${lengthLimit} displayed characters, got ${summaryText.length}`)
    errors.push(`       > ${summaryText.slice(0,180)}\x1b[41m${summaryText.slice(180)}\x1b[0m`)
  }

  if (!isFirstSentenceLengthOK(summaryText)) {
    const sentence = firstSentence(summaryText)
    errors.push(`    ⁉️  ${propertyName} summary's first sentence may be too long. Expected <${firstSentenceLengthLimit} displayed characters, got ${sentence.length}`)
    errors.push(`       > ${sentence.slice(0, firstSentenceLengthLimit)}\x1b[41m${sentence.slice(firstSentenceLengthLimit)}\x1b[0m`)
  }

  const tagSet = getTagSet(summaryDom)
  if (!areTagsOK(tagSet)) {
    ok = false
    errors.push(`    ❌ ${propertyName} summary contains forbidden tags: ${forbiddenTags(tagSet).join(', ')}`)
  }

  if (!areAttrsOK(summaryDom)) {
    ok = false
    const attrs = forbiddenAttrs(summaryDom)
    errors.push(`    ❌ ${propertyName} summary contains forbidden attributes: ${attrs.join(', ')}`)
  }

  if (ok) {
    console.log(`✅ \x1b[1m${propertyName}\x1b[0m (${url}) is OK`)
  }
  else {
    console.error(`❌ \x1b[1m${propertyName}\x1b[0m (${url}) has problems`)
    while (errors.length) {
      console.error(errors.shift())
    }
  }
}

const isLengthOK = (text) => lengthLimit > text.length

const isFirstSentenceLengthOK = (text) => {
  return firstSentenceLengthLimit > firstSentence(text).length
}

const firstSentence = (text) => {
  // a very simplistic attempt to match the first sentence of the summary
  return text.replace(/\.(?!\d)/g, '.\1f').split('\1f')[0]
}

const areTagsOK = (tagSet) => forbiddenTags(tagSet).length === 0

const forbiddenTags = (tagSet) => Array.from(tagSet).filter(value => !Object.keys(allowed).includes(value))

const getTagSet = (dom) => {
  const tagSet = new Set()
  for (const elem of dom.window.document.querySelectorAll('BODY *')) {
    tagSet.add(elem.tagName)
  }
  return tagSet
}

const areAttrsOK = (dom) => 0 === forbiddenAttrs(dom).length

const forbiddenAttrs = (dom) => {
  let badAttrs = []

  for (const elem of dom.window.document.querySelectorAll('BODY *')) {
    const allowedAttrs = allowed[elem.tagName]

    if (allowedAttrs === undefined) {
      continue
    }

    const attrNames = Array.from(elem.attributes).map(value => value.name)
    attrNames.filter(attr => !allowedAttrs.includes(attr))
      .forEach(attr => badAttrs.push(`${elem.tagName}.${attr}`))
  }

  return badAttrs
}

cli()