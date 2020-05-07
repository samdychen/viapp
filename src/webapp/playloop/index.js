// 引入依赖
const $ = require('../../libs/jquery-1.12.4.min.js');
const { CLIENT_TAG, WEBAPP_PATHS, APIS } = require('../../sdk/configs.js');
const { UserSession } = require('../../sdk/user_session.js');
const { AiInteractor } = require('../../sdk/ai_interactor.js');
const { PlayloopApp } = require('./playloop.js');
const { FullInsert } = require('./full_insert.js');
const { StackInsert } = require('./stack_insert.js');

var local_ws = window.top.local_ws;
if (local_ws) {
	local_ws.onCaching = function(data) {
		playloop_app.show_detail(
			'资源大小：' + data.size + 'MB，下载进度：' + (data.process * 100).toFixed(2) + '%'
		);
	}
} else {
	console.log("global local_ws is not defined.")
}


// 设置播放列表
var playloop_app = new PlayloopApp('playloop');
var ai_interactor, full_inserter, stack_inserter;
playloop_app.init().then(function(){
	// 每次播放页开始播放的时候，会触发该事件
	playloop_app.onDisplayStart = function(data) {
		// 发送行为数据通知vi_service
		var behavior_type = 'playloop';
		local_ws.send_behavior(behavior_type, data);
	}

	// 初始化全屏插播器
	full_inserter = new FullInsert(playloop_app);
	full_inserter.onInsert = function(data) {
		// 发送行为数据通知vi_service
		var behavior_type = 'full_insert';
		let tic = new Date().getTime();
		local_ws.send_behavior(behavior_type, data);
		console.log("[action] onInsert Func Done: ", (new Date().getTime() - tic) );
	}

	// 初始化浮窗插播器
	stack_inserter = new StackInsert(playloop_app);

	// 添加ai互动器
	var ai_configs = playloop_app.configs.ai_conf || [];
	ai_interactor = new AiInteractor(ai_configs, playloop_app, full_inserter, stack_inserter);
	ai_interactor.init().then(function(){
		// 符合ai互动事件
		ai_interactor.onAction = function(data) {
			// 通知后端
			var msg_type = 'interact';
			local_ws.send_data(msg_type, data);
		}

		// 加载完成，开始轮播
		playloop_app.play();
	}).catch(function(err) {
		playloop_app.show_tip(err, 'error');
		setTimeout(playloop.play, 3000);
	});
});


// User Session管理
var user_sessioner = new UserSession(CLIENT_TAG);
var user_sessions = {};
// 一个user session开始
user_sessioner.onUserSessionOn = function(data) {
	var session_id = data.session_id || 'unkown';
	user_sessions[session_id] = data;  // 添加数据
	data.cur_user_sessions_counts = Object.keys(user_sessions).length;

	// 执行ai互动器
	ai_interactor.exec(data);
}
// user session持续
user_sessioner.onUserSessionKeep = function(data) {
	var session_id = data.session_id || 'unkown';
	user_sessions[session_id] = data;  // 更新数据
	data.cur_user_sessions_counts = Object.keys(user_sessions).length;

	// 执行ai互动器
	ai_interactor.exec(data);
}
// 一个user session结束
user_sessioner.onUserSessionOff = function(data) {
	var session_id = data.session_id || 'unkown';
	delete user_sessions[session_id];  // 移除数据
	data.cur_user_sessions_counts = Object.keys(user_sessions).length;

	// 执行ai互动器
	ai_interactor.exec(data);
}
user_sessioner.open();

// 设置点击屏幕行为（注意，上面执行出错，也会继续执行）
$('body').click(function(){
	user_sessioner.send_screen_clicked_event();
});
