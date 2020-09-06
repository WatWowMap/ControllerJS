'use strict';

const config = require('../config.json');
const data = require('../../static/locales/' + config.locale + '.json');
data.title = config.title;
data.locale_new = config.locale;

module.exports = data;