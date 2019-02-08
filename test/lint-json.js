const fs = require('fs');
const path = require('path');
const { jsonFormatRules } = require('./json-format-rules');
const { contentRules, fragmentToDom } = require('./content-rules');

const walk = (directory, callback) => {
  fs.readdirSync(directory).forEach((filename) => {
    const filepath = path.join(directory, filename);

    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    }
    callback(filepath);
  });
};

const collectJSON = (directory) => {
  const filepaths = [];
  walk(directory, (fp) => {
    if (path.extname(fp) === '.json') {
      filepaths.push(fp);
    }
  });
  return filepaths;
};

const lintSource = (filepath, data) => {
  let passes = true;

  for (let index = 0; index < jsonFormatRules.length; index += 1) {
    const rule = jsonFormatRules[index];
    const result = rule.check(data);

    if (!result.passes) {
      result.errors.forEach(e => console.error(`${filepath}: ${e}`));
      passes = false;
      break;
    }
  }

  return passes;
};

const lintContent = (filepath, dom) => {
  let passes = true;

  contentRules.forEach((rule) => {
    const result = rule.check(dom);

    if (!result.passes) {
      result.errors.forEach(e => console.error(`${filepath}: ${e}`));
      passes = false;
    }
  });

  return passes;
};

const main = () => {
  const jsonFiles = collectJSON('./descriptions');

  const results = jsonFiles.map((filepath) => {
    const data = fs.readFileSync(filepath, 'utf8');
    const sourcePasses = lintSource(filepath, data);

    if (!sourcePasses) {
      console.error(`${filepath}: source checks didn't pass. Skipping content checks.`);
      return {
        filepath, success: false, sourcePasses: false, contentPasses: null,
      };
    }

    const json = JSON.parse(data);
    const propName = Object.keys(json.css.properties)[0];
    // eslint-disable-next-line no-underscore-dangle
    const description = json.css.properties[propName].__short_description;

    const contentPasses = lintContent(filepath, fragmentToDom(description));
    return {
      filepath, success: sourcePasses && contentPasses, sourcePasses, contentPasses,
    };
  });

  const successes = [];
  const failures = [];
  results.forEach(result => (result.success ? successes.push(result) : failures.push(result)));

  console.log(`\nChecked ${results.length} descriptions.`);
  console.log(`${successes.length} descriptions passed all checks.`);

  if (failures.length) {
    console.log(`${failures.length} descriptions failed one or more checks:`);
    failures.forEach(result => console.log(`  ${result.filepath}`));
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}
