'use strict';

const config = require('../config.json');
const data = require('../../static/locales/' + config.locale + '.json');
data.started = new Date().toLocaleString();
data.title = config.title;
data.locale = config.locale;
data.locale_new = config.locale;
data.body_class = config.style === 'dark' ? 'theme-dark' : '';
data.table_class = config.style === 'dark' ? 'table-dark' : '';

module.exports = data;