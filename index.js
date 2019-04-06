const extend = require('extend');
const fs = require('fs');
const path = require('path');

function walk(directory, callback) {
  fs.readdirSync(directory).forEach((filename) => {
    const filepath = path.join(directory, filename);

    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    }
    callback(filepath);
  });
}

function collectJSON(directory) {
  const filepaths = [];
  walk(directory, (fp) => {
    if (path.extname(fp) === '.json') {
      filepaths.push(fp);
    }
  });
  return filepaths;
}

function loadJSON() {
  const jsons = collectJSON(path.resolve(__dirname, './descriptions'));
  const finalObj = {};

  jsons.forEach((json) => {
    const nextObj = JSON.parse(fs.readFileSync(json, 'utf8'));
    extend(true, finalObj, nextObj);
  });
  return finalObj;
}

module.exports = loadJSON();
