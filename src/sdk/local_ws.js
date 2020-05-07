function LocalWS(client_tag) {
	// window.location.host
    var obj = this;
	var host;
	if (window.location.host == '') {
		host = '127.0.0.1:5000';
	} else {
		host = window.location.host;
	}
    obj.service_id = 'local_ws';
    obj.client_tag = client_tag;
    obj.ws_url = 'ws://' + host + '/service/page_ws/' + obj.service_id + '/' + obj.client_tag;
    obj.ws = null;

    // 事件声明
    var events = ['onAttach', 'onBehavior', 'onUpdateDisplayList', 'onRefresh', 'onFullInsert', 'onCaching'];
    // 服务事件关联
    var service_event_mapping = {
        attach: 'onAttach',
        behavior: 'onBehavior',
        UPDATE_DISPLAY_LIST: 'onUpdateDisplayList',
        REFRESH_PAGE: 'onRefresh',
        FULLSCREEN_INSERT: 'onFullInsert',
        caching: 'onCaching',
    }
    // 初始化事件
    var init_events = function() {
        for (var i = 0; i < events.length; i ++) {
            var event = events[i];
            obj[event] = function(data) {};
        }
    }

    obj.open = function() {
        var promise = new Promise(function(resolve, reject){
            obj.user_close = false;
            obj.ws = new WebSocket(obj.ws_url);
            // 服务端消息处理
            obj.ws.onmessage = function (event) {
                var response = JSON.parse(event.data);
                console.log(obj.service_id + ' receive:', response);

                var service_event_type = response['type'];
                if (service_event_type in service_event_mapping) {
                    var event_type = service_event_mapping[service_event_type];
                    if (event_type in obj) {
                        obj[event_type](response.data);    
                    }
                }
            };
            obj.ws.onopen = function () {
                console.log('[' + obj.service_id + '] websocket connection establish successfully');
                this.send(JSON.stringify({'type':'hello','data':''})); // 发送一个hello消息表示在线
                resolve(true);
            };
            obj.ws.onclose = function (event) {
                console.log('[' + obj.service_id + '] websocket is closed');
                if (!obj.user_close) {
                    // 非用户主动关闭，3秒后重连
                    setTimeout(() => {
                        if (obj.ws) {
                            if (obj.ws.readyState != obj.ws.CLOSED) {
                                return;
                            }
                        }
                        obj.open();
                    }, 3000);
                }
            }
            obj.ws.onerror = function (event) {
                console.log('[' + obj.service_id + '] websocket connect failed');
                // 3秒后重连
                setTimeout(() => {
                    if (obj.ws) {
                        if (obj.ws.readyState != obj.ws.CLOSED) {
                            return;
                        }
                    }
                    obj.open();
                }, 1000);
                if (reject) {reject(event);}
            }
        });
        return promise;
    }

    obj.close = function() {
        obj.user_close = true;
        obj.ws.close();
        // 初始化事件
        init_events();
    }

    // 记录当前所在页
    obj.current_page = function(page_name) {
        if (obj.ws.readyState == obj.ws.OPEN) {
            obj.current_page_name = page_name;
            obj.ws.send(JSON.stringify({'type': 'status', 'data': page_name}));
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 发送数据
    obj.send_data = function(mse_type, data) {
        if (obj.ws.readyState == obj.ws.OPEN) {
            obj.ws.send(JSON.stringify({'type': mse_type, 'data': data}));
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 行为类型
    obj.behavior_types = {
        click: 'click',               // 点击屏幕
        action: 'action',             // 触发动作
        voice_keyword: 'voice',       // 语音触发关键字
        auto_jump: 'jump',            // 页面(内容)自动跳转
        playloop: 'playloop',         // 轮播播放
        full_insert: 'full_insert',   // 全屏插播
        current_page: 'current_page'  // 当前处于什么页面
    }
    obj.send_behavior = function(behavior_type, behavior_data) {
        if (obj.ws.readyState == obj.ws.OPEN) {
            var message = JSON.stringify({
                'type': 'behavior', 
                'broadcast': true,
                'data': {
                    'behavior_type': behavior_type,
                    'behavior_data': behavior_data
                }
            });
            obj.ws.send(message);
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 初始化事件
    init_events();
}

module.exports = {
  LocalWS: LocalWS
}