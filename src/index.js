// 引入依赖
const $ = require('./libs/jquery-1.12.4.min.js');
const {  CLIENT_TAG, WEBAPP_PATHS, APIS } = require('./sdk/configs.js');
const { LocalWS } = require('./sdk/local_ws.js');

// 页面类
function HomePage(page_id) {
	var obj = this;
	obj.page_id = page_id;

	var get_registration_status = function() {
		var registration_status = false;
		$.ajax({
			url: APIS.get_registration_status,
			type: 'POST',
			cache: false,
			async: false,
			contentType: 'application/json',
			dataType: 'json',
			success: function(data){
				if (data.status == 1) {
					registration_status = data.data;
				}
				else {
					console.error(data.message);
				}
			}
		});
		return registration_status;
	}

	// 获取设备配置
	var get_device_config = function() {
		var device_config = {};
		$.ajax({
			url: APIS.get_device_config,
			type: 'GET',
			cache: false,
			async: false,
			contentType: 'application/json',
			dataType: 'json',
			success: function(data){
				if (data.status == 1) {
					device_config = data.data;
				}
				else {
					console.error(data.message);
				}
			}
		});
		return device_config;
	}

	obj.init = function() {
		// 判断是否已经注册
		//var registration_status = get_registration_status();
		var device_config = localStorage.getItem("device_config");
		device_config = JSON.parse(device_config);
		
		// 默认加载注册app
		let next_app = 'register';

		// 若已经注册，加载轮播模块
		if (device_config && device_config.device_location) {
			// 获取设备配置
			//var device_config = get_device_config();
			console.log("device_location is " + device_config.device_location);
			next_app = device_config.default_app || 'playloop';
		}
		
		// 加载模块
		var next_app_path = WEBAPP_PATHS[next_app] + '?time=' + (new Date()).getTime();
		var webapp_container = $('#container iframe');
		webapp_container.attr('src', next_app_path);
	}
}

// 页面主程序
window.local_ws = new LocalWS(CLIENT_TAG);

var local_ws = window.local_ws;
sessionStorage.clear();  // 清理缓存
$.ajaxSetup({cache: false});  // 全局ajax设置，jQuery load本质是使用ajax

// 绑定更新轮播列表事件
local_ws.onUpdateDisplayList = function(data) {
	// 是否需要强制重载？
	// 想了想，不需要强制重载轮播webapp
	// 原因1：耦合性高
	// 原因2：设备不一定注册了
	// 原因3：当前页面不一定在轮播webapp

	sessionStorage.removeItem('playloop');
	// 判断当前是否在轮播webapp
	if (local_ws.current_page_name == 'playloop') {
		webapp_frame.location.reload();  // 重新加载轮播webapp
	}
}

// 刷新页面事件
local_ws.onRefresh = function(data) {
	window.location.reload();
}

// 全屏插播事件
local_ws.onFullInsert = function(data) {
	// 只有在轮播app的时候才插播，这个可能需要强制插播
	if (local_ws.current_page_name == 'playloop') {
		webapp_frame.full_inserter.insert(data);
	}
}


// 监听webapp iframe加载事件
var webapp_container = $('#container iframe');
var webapp_frame = window.frames['webapp'];
webapp_container[0].onload = function() {
	var webapp_pathnames = webapp_frame.location.pathname.split('/');
	var webapp_name = webapp_pathnames[webapp_pathnames.length - 2];
	local_ws.current_page(webapp_name);
}

function local_ws_init() {
	local_ws.open().then(function(){
		home_page.init();
	}).catch(function(err){
		console.log(err);
		setTimeout(local_ws_init, 1000);
	});    
}

// HomePage 初始化
var home_page = new HomePage('home');
home_page.init();

// Local WS 初始化
local_ws_init();