function EnodefService(client_tag) {
    var obj = this;
	var host;
	if (window.location.host == '') {
		host = '127.0.0.1:5000';
	} else {
		host = window.location.host;
	}
    obj.service_id = "enodef_1";
    obj.client_tag = client_tag;
    obj.ws_url = "ws://" + host + "/service/page_ws/" + obj.service_id + "/" + obj.client_tag;
    obj.ws = null;

    // 事件声明
    var events = ['onFaceOn', 'onFaceKeep', 'onFaceOff', 'onGetCameraFrame'];
    // 服务事件关联
    var service_event_mapping = {
        EVENT_FACE_ON: 'onFaceOn',
        EVENT_FACE_KEEP: 'onFaceKeep',
        EVENT_FACE_OFF: 'onFaceOff',
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
        });
        return promise;
    }

    // 关闭服务
    obj.close = function() {
        obj.user_close = true;
        obj.ws.close();
        // 初始化事件
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

    // 人脸属性识别
    obj.face_detect = function(face_img_b64) {
        var promise = new Promise(function(resolve, reject){
            var post_data = {
                'uuid': guid(),
                'type': 'FACE_DETECT',
                'data': {
                    'img_b64': face_img_b64
                }
            }

            var face_detect_data = null;
            $.ajax({
                url: '/service/face',
                type: 'POST',
                contentType: 'application/json',
                cache: false,
                dataType: 'json',
                data: JSON.stringify(post_data),
                success: function(data) {
                    if (data.data.status == 1) {
                        face_detect_data = data.data.result;
                        resolve(face_detect_data);
                    }
                    else {
                        console.error(data.data.message);
                        reject(data.data.message);
                    }
                },
                error: function(xhr) {
                    console.error(xhr);
                    reject('未知错误');
                }
            });
        });
        return promise;
    }

    // 初始化事件
    init_events();
}

module.exports = {
  EnodefService: EnodefService
}