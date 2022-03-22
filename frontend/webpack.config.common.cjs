const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './index.tsx',
    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist',
    },

    resolve: {
        // Add ".ts" and ".tsx" as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },

    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'index.html', to: 'index.html' },
                { from: 'images/favicon.ico', to: 'favicon.ico' },
        ]}),
    ],

    module: {
        rules: [
            // All files with a ".ts" or ".tsx" extension will be handled by "ts-loader".
            { test: /\.tsx?$/, use: { loader: 'ts-loader' } },

            // // All output ".js" files will have any sourcemaps re-processed by "source-map-loader".
            // { enforce: 'pre', test: /\.js$/, use: { loader: 'source-map-loader' } },

            { test: /\.(s*)css$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
            { test: /\.(jpg|png)$/, use: { loader: 'url-loader' } },
            // { test: /\.ico$/, loader: 'file-loader' },
            // { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?mimetype=image/svg+xml' },
            // { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?mimetype=application/font-woff' },
            // { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?mimetype=application/font-woff' },
            // { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?mimetype=application/octet-stream' },
            // { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
        ],
    },
};
