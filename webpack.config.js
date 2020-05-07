const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
	'index':  './src/index.js',
	'playloop': './src/webapp/playloop/index.js', // 轮播页
	'register': './src/webapp/register/index.js', // 轮播页
	'realtime': './src/webapp/realtime/index.js', // 轮播页
	'enodeb_config': './src/webapp/enodeb_config/index.js', // 轮播页
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
	filename: './src/js/[name]-bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin(
      {
        filename: './src/webapp/playloop/index.html',
		template: './src/webapp/playloop/index.html',
        chunks: ['playloop'],
      }
    ),
    new HtmlWebpackPlugin(
      {
        filename: './src/webapp/register/index.html',
		template: './src/webapp/register/index.html',
        chunks: ['register'],
      }
    ),
	new HtmlWebpackPlugin(
	  {
	    filename: './src/webapp/realtime/index.html',
		template: './src/webapp/realtime/index.html',
	    chunks: ['realtime'],
	  }
	),
	new HtmlWebpackPlugin(
	  {
	    filename: './src/webapp/enodeb_config/index.html',
		template: './src/webapp/enodeb_config/index.html',
	    chunks: ['enodeb_config'],
	  }
	),
	new HtmlWebpackPlugin(
	  {
	    filename: './src/index.html',
		template: './src/index.html',
	    chunks: ['index'],
	  }
	),
  ],
  optimization: {
      splitChunks: {
        cacheGroups: {
          // 打包业务中公共代码
          common: {
            name: "common",
            chunks: "initial",
            minSize: 1,
            priority: 0,
            minChunks: 2, // 同时引用了2次才打包
          },
          // 打包第三方库的文件
          vendor: {
            name: "vendor",
            test: /[\\/]node_modules[\\/]/,
            chunks: "initial",
            priority: 10,
            minChunks: 2, // 同时引用了2次才打包
          }
        }
      }
    }
};