
const webpack = require('webpack');
const path = require('path');

const devmode = false;
if('--debug' in process.argv){devmode = 'inline-source-map';}

module.exports = {
    context: path.resolve(__dirname, 'src'),
    entry: {
        script: './script.js'
    },
    output: {
        path: path.resolve(__dirname, 'build/js'),
        publicPath: './',
        filename: 'main.js'
    },
    module: {
        rules: [{
            test: /\.js$/,
            include: path.resolve(__dirname, 'src'),
            use: [{
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['es2015']
                    ]
                }
            }]
        }]
    },
    cache: true,
    devtool: devmode
};
