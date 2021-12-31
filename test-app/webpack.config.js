const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.prod.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@waves/provider-keeper': path.resolve(__dirname, '../provider/src'),
    },
  },
  output: {
    libraryTarget: 'umd',
    globalObject: 'this',
    filename: 'dapp.min.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new HtmlWebpackTagsPlugin({
      tags: ['style.css'],
      append: true,
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: './src/style.css', to: 'style.css' }],
    }),
  ],
};
