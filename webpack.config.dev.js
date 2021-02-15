const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');
const path = require('path');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'source-map',
    watch: true,
});
