var path = require('path')
var webpack = require('webpack')

module.exports = {
    entry: './vue/index.js',
    cache:true,
    output: {
      path: path.resolve(__dirname, './dist'),
      publicPath: 'dist/',
      filename: 'bundle.js'
    },
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      }
    },
    devtool: '#eval-source-map',
    target:'node',
    module: {
      loaders: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          test: /\.css$/,
          loader: 'style-loader!css-loader'
        },
        {
          test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
          loader: 'file-loader'
        },
        {
          test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
          loader: 'file-loader',
          query: {
            name: '[name].[ext]?[hash]'
          }
        }
      ]
    }
};