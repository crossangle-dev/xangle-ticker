const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");




module.exports = {
  entry: {
    app: ['./src/xi-ticker.js', './src/xi-ticker.css']
  },
  output: {
    filename: 'xi-ticker.min.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/test.html',
      inject: 'head',
      filename: 'test.html'
    }),
    // new ExtractTextPlugin("xi-ticker.css")
    new MiniCssExtractPlugin({
      filename: 'xi-ticker.min.css'
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        sourceMap: true, // Must be set to true if using source-maps in production
        terserOptions: {
          compress: {
            drop_console: true
          }
        },
      }),
      new OptimizeCSSAssetsPlugin({})
    ],
  },
}
