/* eslint-disable no-underscore-dangle */
const assert = require('assert');

const descriptions = require('..');

// Make sure the data is importable and does something vaguely useful
assert(typeof descriptions.css.properties.opacity.__short_description === 'string');
assert(descriptions.css.properties.opacity.__short_description.length > 0);
