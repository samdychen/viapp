function UserSession(client_tag) {
	// window.location.host
    var obj = this;
	var host;
	if (window.location.host == '') {
		host = '127.0.0.1:5000';
	} else {
		host = window.location.host;
	}
    obj.service_id = 'user_session';
    obj.ws_url = 'ws://' + host + '/service/page_ws/' + obj.service_id + '/' + client_tag;
    obj.ws = null;

    // 事件声明
    var events = ['onUserSessionOn', 'onUserSessionKeep', 'onUserSessionOff'];
    // 服务事件关联
    var service_event_mapping = {
        EVENT_USER_SESSION_ON: 'onUserSessionOn',
        EVENT_USER_SESSION_KEEP: 'onUserSessionKeep',
        EVENT_USER_SESSION_OFF: 'onUserSessionOff'
    }
    // 初始化事件
    var init_events = function() {
        for (var i = 0; i < events.length; i ++) {
            var event = events[i];
            obj[event] = (data) => {console.log(event)};
        }
    }

    // 生成uuid
    var guid = function() {
        return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
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
                }, 3000);
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

    // 发送点击数据
    var send_clicked_event = function(click_data) {
        if (obj.ws.readyState == obj.ws.OPEN) {
            var message = JSON.stringify({
                'uuid': guid(),
                'type': 'EVENT_CLICK', 
                'data': click_data
            });
            obj.ws.send(message);
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }
    obj.send_screen_clicked_event = function() {
        if (obj.ws.readyState == obj.ws.OPEN) {
            var click_data = {
                'type': 'screen',
                'time': (new Date()).getTime() / 1000
            }
            send_clicked_event(click_data);
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }
    obj.send_product_clicked_event = function(product_id) {
        if (obj.ws.readyState == obj.ws.OPEN) {
            var click_data = {
                'type': 'product',
                'product_id': [product_id],
                'time': (new Date()).getTime() / 1000
            }
            send_clicked_event(click_data);
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 初始化事件
    init_events();
}

module.exports = {
  UserSession: UserSession
}