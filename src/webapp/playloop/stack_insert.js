const $ = require('../../libs/jquery-1.12.4.min.js');

// 浮窗插播类，需要playlooper全屏播放器
function StackInsert(playlooper) {
    var obj = this;
    obj.playlooper = playlooper;
    obj.stack_container = playlooper.page.find('.stack_container');
    obj.insertings = {};  // 已经插播的内容

    // 判断当前是否在插播对应的内容
    var check_display_inserting = function(display_id) {
        return display_id in obj.insertings;
    }

    // 判断sessionStorage是否已经渲染对应的模板
    var is_rendered_display = function(display_id) {
        var key = 'stack_insert_' + display_id;
        return key in sessionStorage;
    }

    // 从sessionStorage中获取已经渲染好的display内容
    var get_display_from_cache = function(display_id) {
        var key = 'stack_insert_' + display_id;
        var display_html = sessionStorage.getItem(key);
        var display = $(display_html);
        return display;
    }

    // 保存display到sessionStorage
    var set_display_to_cache = function(display_id, display) {
        var key = 'stack_insert_' + display_id;
        var display_html = $('<div>').append(display).html();
        sessionStorage.setItem(key, display_html);
    }

    // 插播
    obj.insert = async function(display_data) {
        var display_id = display_data.display_id || '';
        var update_while_playing = display_data.update_while_playing || false; // 强制插播，就算现在已经插播同样内容

        if (!check_display_inserting(display_id) || update_while_playing) {
            var display;
            /* // 缓存机制
            if (is_rendered_display(display_id)) {
                // 已经渲染
                display = get_display_from_cache(display_id);
            }
            else {
                // 尚未渲染
                display = await obj.playlooper.render_display(display_data);

                // 写入缓存
                set_display_to_cache(display_id, display);
            }
            */
            // 不使用缓存机制
            display = await obj.playlooper.render_display(display_data);
            var old_display = obj.stack_container.find('[display_id=' + display_id + ']');
            old_display.remove();

            // 插播
            clearTimeout(obj.insertings[display_id]);
            obj.stack_container.append(display);

            // 设置超时
            var display_time = display_data.display_time;
            if (display_time > -1) {
                var inserting_timeout_handle = setTimeout(() => {
                    delete obj.insertings[display_id];
                    display.remove();
                }, display_time * 1000);
                obj.insertings[display_id] = inserting_timeout_handle;
            }
            else {
                obj.insertings[display_id] = null;
            }
        }
        else {
            console.log(display_data.display_name + ' is playing');
        }
    }
}

module.exports = {
  StackInsert: StackInsert
}