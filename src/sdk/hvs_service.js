function HvsService(client_tag) {
    var obj = this;
	var host;
	if (window.location.host == '') {
		host = '127.0.0.1:5000';
	} else {
		host = window.location.host;
	}
    obj.service_id = "human_voice_synthesizer";
    obj.client_tag = client_tag;
    obj.ws_url = "ws://" + host + "/service/page_ws/" + obj.service_id + "/" + obj.client_tag;
    obj.ws = null;

    // 事件声明
    var events = ['onStartHvs', 'onStopHvs', 'onSpeechSynthesizeOngoing', 'onSpeechSynthesizeCompleted', 'onSpeechSynthesizeFailed'];
    // 服务事件关联
    var service_event_mapping = {
        EVENT_START_HVS: 'onStartHvs',
        EVENT_STOP_HVS: 'onStopHvs',
        EVENT_ON_SPEECH_SYNTHESIZE_ONGOING: 'onSpeechSynthesizeOngoing',
        EVENT_ON_SPEECH_SYNTHESIZE_COMPLETED: 'onSpeechSynthesizeCompleted',
        EVENT_ON_SPEECH_SYNTHESIZE_FAILED: 'onSpeechSynthesizeFailed',
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
    obj.close = function () {
        obj.user_close = true;
        obj.stop_hvs();
        obj.ws.close();
        // 初始化事件
        init_events();
    }

    // 开始语音合成
    obj.start_hvs = function(voice_text, voice_name='aibao') {
        if (obj.ws.readyState == obj.ws.OPEN) {
            var uuid = guid();
            req_data = {
                'uuid': uuid,
                'type': 'START_HVS',
                'data': {'voice_text': voice_text, 'voice_name': voice_name}
            }
            obj.ws.send(JSON.stringify(req_data))
            return uuid;
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 停止语音合成
    obj.stop_hvs = function() {
        if (obj.ws.readyState == obj.ws.OPEN) {
            var uuid = guid();
            req_data = {
                'uuid': uuid,
                'type': 'STOP_HVS',
                'data': {}
            }
            obj.ws.send(JSON.stringify(req_data))
            return uuid;
        }
        else {
            console.error(obj.service_id, 'is not open:', obj.ws.readyState);
        }
    }

    // 聊天
    obj.chat = function(to_character, send_text) {
        var post_data = {
            'uuid': guid(),
            'type': 'RANDOM_CHAT',
            'data': {
                'to_character': to_character,
                'send_text': send_text
            }
        }

        var resd_text = '';
        $.ajax({
            url: '/service/random_chat',
            type: 'POST',
            contentType: 'application/json',
            cache: false,
            async: false,
            data: JSON.stringify(post_data),
            dataType: 'json',
            success: function(data) {
                data = data.data;
                if (data.status == 1) {
                    resd_text = data.resd_text;
                }
                else {
                    throw(data.message);
                }
            },
            error: function(xhr) {
                throw(xhr);
            }
        });
        return resd_text;
    }

    // 初始化事件
    init_events();
}

module.exports = {
  HvsService: HvsService
}