// 引入依赖
const { RegisterApp } = require('./register.js');

// 设置页面信息
var local_ws = window.top.local_ws;
var reg_app = new RegisterApp('register');
reg_app.init();