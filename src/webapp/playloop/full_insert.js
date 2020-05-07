const $ = require('../../libs/jquery-1.12.4.min.js');

// 全屏插播类，需要playlooper全屏播放器
function FullInsert(playlooper) {
    var obj = this;
    obj.playlooper = playlooper;
    obj.inserting = false;
    obj.inserted_display_id = '';
    obj.inserting_timeout_handle = null;
    obj.onInsert = function(data){};  // 开始插播事件

    // 判断当前是否在插播对应的内容
    var check_display_inserting = function(display_id) {
        return obj.inserted_display_id == display_id;
    }

    // 判断sessionStorage是否已经渲染对应的模板
    var is_rendered_display = function(display_id) {
        var key = 'full_insert_' + display_id;
        return key in sessionStorage;
    }

    // 从sessionStorage中获取已经渲染好的display内容
    var get_display_from_cache = function(display_id) {
        var key = 'full_insert_' + display_id;
        var display_html = sessionStorage.getItem(key);
        var display = $(display_html);
        return display;
    }

    // 保存display到sessionStorage
    var set_display_to_cache = function(display_id, display) {
        var key = 'full_insert_' + display_id;
        var display_html = $('<div>').append(display).html();
        sessionStorage.setItem(key, display_html);
    }

    // 插播
    obj.insert = async function(display_data) {
        var display_id = display_data.display_id || '';
        var update_while_playing = display_data.update_while_playing || false; // 强制插播，就算现在已经插播同样内容

        if (!check_display_inserting(display_id) || update_while_playing) {
            var display;
			
			// Debug Render display 时间
			let tic = new Date().getTime();
			
            // 缓存机制
            if (is_rendered_display(display_id)) {
                // 已经渲染
                display = get_display_from_cache(display_id);
            }
            else {
                // 尚未渲染
                display = await obj.playlooper.render_display(display_data);
                set_display_to_cache(display_id, display);
            }
            
            // 不使用缓存机制
            //display = await obj.playlooper.render_display(display_data, -1);
			
			// Debug Render display 时间
			console.log('[action] render display done: ', new Date().getTime() - tic);

            // 中断轮播
			tic = new Date().getTime();
            obj.playlooper.pause();
            obj.inserting = true;
            obj.inserted_display_id = display_id;
            clearTimeout(obj.inserting_timeout_handle);
            obj.playlooper.display_container.empty().append(display);
			console.log('[action] render display done: ', new Date().getTime() - tic);

            // 设置超时
            var display_time = display_data.display_time;
            if (display_time > -1) {
                obj.inserting_timeout_handle = setTimeout(() => {
                    obj.inserting = false;
                    obj.inserted_display_id = '';
                    obj.playlooper.play();
                }, display_time * 1000);
            }

            // 回调
            var data = {
                display_id: display_data.display_id,
                display_name: display_data.display_name,
                thumb_uri: display_data.thumb_uri,
                start_time: (new Date()).getTime() / 1000,
            };
            obj.onInsert(data);
        }
        else {
            console.log(display_data.display_name + ' is playing');
        }
    }
}

module.exports = {
  FullInsert: FullInsert
}