// eslint-disable-next-line @typescript-eslint/no-var-requires
const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
    plugins: [
        new CopyPlugin([{ from: 'src/index.html', to: 'index.html' }]),
        new CopyPlugin([{ from: 'src/images/favicon.ico', to: 'favicon.ico' }]),
    ],
});
