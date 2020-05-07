const $ = require('../../libs/jquery-1.12.4.min.js');
const { CLIENT_TAG, WEBAPP_PATHS, APIS } = require('../../sdk/configs.js');

function PlayloopApp(page_id) {
    var obj = this;
    obj.page_id = page_id;
    obj.page = $('#' + page_id);
    obj.display_list = [];   // 渲染后的播放列表
    obj.display_time_ranges = [];  // 播放列表对应的时间
    obj.display_total_time = 0;
    obj.onDisplayStart = function(data) {};  // 播放页开始播放回调事件

    /// 消息提示
    var ICON_SRCS = {
        'success': './media/success.png',
        'error': './media/error.png',
        'info': './media/info.png',
        'download': './media/download.png',
    };
    var tip = obj.page.find('.tip_container');
    obj.get_tip_text = function() {
        return tip.find('.tip_text').text();
    }
    obj.show_tip = function(text, icon_type) {
        setTimeout(function(){
            var icon_src = ICON_SRCS[icon_type];
            tip.find('.tip_icon').attr('src', icon_src);
            tip.find('.tip_title').text(text);
            tip.find('.tip_text').text('');
            if (obj.paused) {
                tip.show();
            }
        }, 0);
    }
    obj.hide_tip = function() {
        tip.hide();
    }
    obj.show_detail = function(text) {
        tip.find('.tip_text').text(text);
    }

    // 获取配置
    obj.get_configs = function() {
        var configs = {};
        $.ajax({
            url: APIS.get_webapp_config.replace('<app_name>', obj.page_id),
            type: 'POST',
            cache: false,
            async: false,
            dataType: 'json',
            success: function(data) {
                if (data.status == 1){
                    configs = data.data || {};
                }
                else {
                    throw(data.message);
                }
            },
            error: function(xhr) {
                throw(xhr);
            }
        });
        return configs;
    }

    /// 播放列表获取和渲染
    // 获取缓存地址
    var get_cache_url = function(url, display_page_index, display_list_length) {
        return new Promise(function(resolve, reject) {
            // 获取文件缓存地址
            $.ajax({
                url: APIS.get_cache_url,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    url: url
                }),
                dataType: 'json',
                cache: false,
                success: function(data) {
                    if (data.status == 1) {
                        resolve(data.data);
                    }
                    else {
                        reject(data.message);
                    }
                },
                error: function(xhr) {
                    reject('发生未知的错误');
                }
            });
        });
    }

    // 渲染图片组件
    var render_image_widget = function(widget_data) {
        var widget = $('<img>').attr({
            'src': widget_data.src,
        });
        widget.css({
            'position': 'absolute',
            'left': widget_data.x,
            'top': widget_data.y,
            'width': widget_data.w,
            'height': widget_data.h,
            'object-fit': widget_data.mode,
            'object-position': widget_data.position || 'center',
        });
        return widget;
    }

    // 渲染视频组件
    var render_video_widget = function(widget_data) {
        var widget = $('<video>').attr({
            'src': widget_data.src,
            'autoplay': 'autoplay',
            'loop': 'loop',
        });
        widget.css({
            'position': 'absolute',
            'left': widget_data.x,
            'top': widget_data.y,
            'width': widget_data.w,
            'height': widget_data.h,
            'object-fit': widget_data.mode,
            'object-position': widget_data.position || 'center',
        });
        return widget;
    }

    // 渲染单页
    obj.render_display = function(display_data) {
        return new Promise(async function(resolve, reject){
            // 渲染播放页
            var display = $('<div>').css({
                'position': 'relative'
            });

            // 遍历组件列表
            var widget_list = display_data.widget_list || [];
            for (var i = 0; i < widget_list.length; i++) {
                var widget_data = widget_list[i];
                var widget_obj;

                // 图片组件
                if (widget_data.type == 'image') {
                    // 缓存内容
                    var url = widget_data.src;
                    var cache_url = await get_cache_url(url).catch(function(err) {
                        reject(err);
                    });
                    widget_data.src = cache_url;
                    // 渲染组件
                    widget_obj = render_image_widget(widget_data);
                }
                // 视频组件
                else if (widget_data.type == 'video') {
                    // 缓存内容
                    var url = widget_data.src;
                    var cache_url = await get_cache_url(url).catch(function(err) {
                        reject(err);
                    });
                    widget_data.src = cache_url;
                    // 渲染组件
                    widget_obj = render_video_widget(widget_data);
                }

                if (widget_obj) {
                    display.append(widget_obj);
                }
            }

            display.attr({
                display_id: display_data.display_id,
                display_name: display_data.display_name,
            })
            resolve(display);
        });
    }

    // 计算时间
    var calc_time_ranges = function(playlist) {
        var total_time = 0;
        var time_range = [];

        for (var i = 0; i < playlist.length; i ++) {
            var display_data = playlist[i];

            // 计算对应播放时间段
            var display_time = display_data.display_time || 0;
            time_range.push([total_time, total_time + display_time]);
            total_time += display_time;
        }

        obj.display_time_ranges = time_range;
        obj.display_total_time = total_time;
    }

    // 记录内容到sessionStorage
    var save_data = function() {
        var display_html_list = [];
        for (var i = 0; i < obj.display_list.length; i++) {
            var display = obj.display_list[i];
            var display_html = $('<div>').append(display).html();
            display_html_list.push(display_html);
        }

        let playloop = {
            display_html_list: display_html_list,
            display_time_ranges: obj.display_time_ranges,
            display_total_time: obj.display_total_time
        };
        localStorage.setItem('playloop', JSON.stringify(playloop));
    }

    // 从sessionStorage中读取数据
    var load_data = function() {
        var playloop_data = localStorage.getItem('playloop');
        playloop_data = JSON.parse(playloop_data);

        var display_list = [];
        for (var i = 0; i < playloop_data.display_html_list.length; i++) {
            var display_html = playloop_data.display_html_list[i];
            display_list.push($(display_html));
        }
        
        obj.display_list = display_list;
        obj.display_time_ranges = playloop_data.display_time_ranges;
        obj.display_total_time = playloop_data.display_total_time;
    }

    // 渲染播放列表（为了解决dom及时显示问题）
    var render_display_list = async function(display_list) {
        for (var i = 0; i < display_list.length; i++) {
            var display_data = display_list[i];
            // 更新进度
            obj.show_tip('正在加载播放列表（第' + (i + 1) + '页 / 共' + display_list.length + '页）：' +  display_data.display_name, 'download');
            // 渲染
            var display = await obj.render_display(display_data);
            // 写入列表
            obj.display_list.push(display);
        }

        // 加载完成，开始轮播
        save_data();
        return true;
    }

    /// 播放控制
    obj.paused = true;
    obj.playlooper_step = 100;
    obj.current_display_index = -1;
    obj.current_display_name = '';
    obj.display_container = obj.page.find('.display_container');
    var playloop_interval;

    // 开始播放
    obj.play = function() {
        if (obj.display_list.length == 0) {
            obj.show_tip('播放列表为空，无法播放', 'error');
        }
        else {
            obj.hide_tip();
            
            // 启动循环播放器
            obj.paused = false;
            obj.display_container.find('video, audio').each(function(){
                if (this.paused) {
                    this.play(); 
                }
            });

            clearInterval(playloop_interval);
            playloop_interval = setInterval(playlooper, obj.playlooper_step);
        }
    }

    // 暂停播放
    obj.pause = function() {
        obj.paused = true;
        clearInterval(playloop_interval);
        // 暂停视频播放
        obj.display_container.find('video, audio').each(function(){
            this.pause();
        });
    }

    // 获取当前时间的秒数
    var get_current_seconds = function() {
        var date = new Date();
        var total_second = date.getUTCHours() * 60 * 60 + date.getUTCMinutes() * 60 + date.getUTCSeconds();
        return total_second;
    }

    // 获取当前需要播放的display index
    var get_next_display_index = function(current_second) {
        var next_display_index = -1;
        for(var i = 0; i < obj.display_time_ranges.length; i++) { 
            if (current_second >= obj.display_time_ranges[i][0] 
             && current_second < obj.display_time_ranges[i][1]) { 
                next_display_index = i;
                break;
            }
        }
        return next_display_index;
    }

    // 循环播放器
    var playlooper = function() {
        // 获取当前需要播放的内容
        var current_seconds = get_current_seconds();
        var current_second = current_seconds % obj.display_total_time;
        var next_display_index = get_next_display_index(current_second);
        
        // 在容器中显示
        if (next_display_index != obj.current_display_index && next_display_index >= 0) {
            var display = obj.display_list[next_display_index];
            obj.display_container.empty().append(display.clone());
            //obj.display_container.find('video, audio').each(function(){this.volume=0.2});  // 音量控制
            obj.current_display_index = next_display_index;
            obj.current_display_name = display.attr('display_name');

            // 触发开始播放回调事件
            var display_page_data = obj.configs.playlist.display_list[obj.current_display_index];
            var data = {
                index: obj.current_display_index,
                display_id: display_page_data.display_id,
                display_name: obj.current_display_name,
                display_time: display_page_data.display_time,
                thumb_uri: display_page_data.thumb_uri,
                start_time: (new Date()).getTime() / 1000
            };
            obj.onDisplayStart(data);
        }       
    }

    // 页面初始化
    obj.init = function() {
        return new Promise(async function(resolve, reject) {
            // 标记当前进入哪个页面
            window.location.hash = obj.page_id;
			
			// 未渲染过，初始化页面
			// 获取播放列表
			obj.show_tip('获取播放列表中，请稍候...', 'download');
			try {
			    // 获取配置信息
			    var configs = obj.get_configs();
			    obj.configs = configs;
				
				// 保存playloop config到local Storage
				localStorage.setItem("playloop_config", JSON.stringify(configs));
				
			    var playlist = configs.playlist || {};
			    var display_list = playlist.display_list || [];
			
			    // 获取成功
			    obj.show_tip('开始加载播放列表，请稍候...', 'download');
			
			    // 验证
			    if (display_list.length == 0) {
			        obj.show_tip('未设置播放内容', 'error');
			        throw('未设置播放内容');
			    }
			    else {
			        calc_time_ranges(display_list);
			        setTimeout(function(){
			            render_display_list(display_list).then(function(){
			                resolve();
			            });
			        }, 0);
			    }
			}
			catch(err) {
			    // 获取失败
				if ('playloop_config' in localStorage) {
				    // 获取playloop config
					obj.configs = localStorage.getItem("playloop_config");
					
					// 加载display_list 渲染数据
				    load_data();
					
				    resolve();
				}
				else {
					console.error(err);
					obj.show_tip(err, 'error');
					reject(err);
				}
			}
			
			
			
            
        });
    }
}

module.exports = {
  PlayloopApp: PlayloopApp
}