const merge = require('webpack-merge');
const common = require('./webpack.config.common.cjs');
const path = require('path');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'source-map',
});
