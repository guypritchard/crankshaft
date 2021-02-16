// eslint-disable-next-line @typescript-eslint/no-var-requires
const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
});
