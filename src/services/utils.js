'use strict';

const zeroPad = (num, places) => String(num).padStart(places, '0');

module.exports = {
    zeroPad,
};