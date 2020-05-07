function EnodebService(client_tag) {
    var obj = this;
	var host;
	if (window.location.host == '') {
		host = '127.0.0.1:5000';
	} else {
		host = window.location.host;
	}
    obj.service_id = "enodeb_1";
    obj.client_tag = client_tag;
    obj.ws_url = "ws://" + host + "/service/page_ws/" + obj.service_id + "/" + obj.client_tag;
    obj.ws = null;

    // 事件声明
    var events = ['onHandOn', 'onHandKeep', 'onHandOff', 'onGetCameraFrame'];
    // 服务事件关联
    var service_event_mapping = {
        EVENT_HAND_ON: 'onHandOn',
        EVENT_HAND_KEEP: 'onHandKeep',
        EVENT_HAND_OFF: 'onHandOff',
        GET_CAMERA_FRAME: 'onGetCameraFrame',
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

    // 屏幕点击行为处理
    obj.is_screen_clicked = false;
    var screen_click_handler;
    var screen_click_expired = 3000;

    // 屏幕点击事件对应的处理方法
    var screen_click = function(event) {
        obj.is_screen_clicked = true;
        clearTimeout(screen_click_handler);
        screen_click_handler = setTimeout(function(){ 
            obj.is_screen_clicked = false;
        }, screen_click_expired);
    }

    // 开启服务
    obj.open = function () {
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
            }
            obj.ws.onopen = function () {
                console.log('[' + obj.service_id + '] websocket connection establish successfully');
                resolve(true);
            }
            obj.ws.onclose = function () {
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
            obj.ws.onerror = function () {
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

            // 绑定全屏点击事件
            $('html').off('click', screen_click);
            $('html').on('click', screen_click);
        });
        return promise;
    }

    // 关闭服务
    obj.close = function() {
        obj.user_close = true;
        obj.ws.close();
        // 初始化事件
        $('html').off('click', screen_click);
        init_events();
    }

    // 发送获取摄像头图片请求
    obj.get_camera_frame = function () {
        if (obj.ws.readyState == obj.ws.OPEN) {
            req_data = {
                'uuid': guid(),
                'type': 'GET_CAMERA_FRAME',
                'data': {'service_id': obj.service_id}
            }
            obj.ws.send(JSON.stringify(req_data));
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 初始化事件
    init_events();
}

module.exports = {
  EnodebService: EnodebService
}