function AiInteractor(ai_configs, playloop_app, full_inserter, stack_inserter) {
    var obj = this;
    obj.playloop_app = playloop_app;  // 轮播应用
    obj.full_inserter = full_inserter;  // 全屏插播器
    obj.stack_inserter = stack_inserter;  // 浮窗插播器
    obj.onAction = function(data) {};  // 触发的回调事件

    // 检查链接
    var _check_url = function(url) {
        var url_valid = false;
        $.get({
            url: url,
            cache: false,
            async: false,
            success: function(){
                url_valid = true;
            }   
        });
        return url_valid;
    }

    // 检查webapp
    var _check_webapp = function(webapp_name) {
        var has_webapp = false;
        $.post({
            url: '/webapp/' + webapp_name + '/check',
            cache: false,
            async: false,
            dataType: 'json',
            success: function(data){
                if (data.status == 1) {
                    has_webapp = true;
                }
            }   
        });
        return has_webapp;
    }

    // 下载webapp
    var _download_webapp = function(webapp_src, webapp_name) {
        return new Promise(function(resolve, reject) {
            $.post({
                url: '/webapp/download',
                contentType: 'application/json',
                cache: false,
                data: JSON.stringify({
                    webapp_src: webapp_src,
                    webapp_name: webapp_name,
                }),
                dataType: 'json',
                success: function(data){
                    if (data.status == 1) {
                        resolve(true);
                    }
                    else {
                        reject(data.message);
                    }
                },
                error: function(xhr) {
                    reject('发生未知错误');
                }
            });
        });
    }

    // 动作执行模块
    {
        // 全屏插播
        var full_insert_action = function(display_data) {
            obj.full_inserter.insert(display_data);
        }

        // 浮窗插播
        var stack_insert_action = function(display_data) {
            obj.stack_inserter.insert(display_data);
        }

        // 跳转应用
        var goto_webapp_action = function(webapp_data) {
            var webapp_path = webapp_data['path'];
            if (webapp_path) {
                // 准备进入主页app
                console.log('准备进入app', webapp_path);
                // 检查url是否存在？会不会404？
                if (!_check_url(webapp_path)) {
                    throw('app不存在，' + webapp_path);
                }
                // 暂停轮播
                obj.playloop_app.pause();
                // 进入主页
                window.location.href = webapp_path + '?time=' + (new Date()).getTime();
            }
            else {
                console.log('没有设置app地址');
            }
        }
    }

    // 互动类型模块
    {
        var say_hello_interaction = function(user_session, condition) {
            // 没有在插播
            //if (obj.full_inserter.inserting) {
            //    return false;
            //}
			if (obj.full_inserter.inserting && user_session.cur_user_sessions_counts > 1) {
				// 当前屏幕正在插播 同时 当前屏幕面前超过一人
			    return false;
			}

            // 判断tag
            if ('tag' in condition) {
                if (!(condition.tag in user_session.tag)) {
                    return false
                }
            }

            // 判断性别
            if ('gender' in condition) {
                var gender = (user_session.face_attribution || {}).gender;
                if (condition.gender != gender) {
                    return false;
                }
            }

            // 判断年龄
            if ('age' in condition) {
                var min_age = condition.age[0];
                var max_age = condition.age[1];
                var age = (user_session.face_attribution || {}).age || 0;
                if (!(age >= min_age && age < max_age)) {
                    return false;
                }
            }

            // 判断是否是vip
            if ('is_vip' in condition) {
                var is_vip = (user_session.face_attribution || {}).is_vip;
                if (condition.is_vip != is_vip) {
                    return false;
                }
            }
            // 以上都满足，则返回true
			console.log("say_hello_interaction will return true");
            return true;
        }

        var product_interaction = function(user_session, condition) {
            // 当前在插播某些内容的时候，不抢占
            if ('no_preemption' in condition) {
                // 检查全屏插播是否正在播放例外情况的内容
                if (obj.full_inserter.inserting) {
                    if (condition.no_preemption.indexOf(obj.full_inserter.inserted_display_id) > -1) {
                        return false;
                    }
                }
                // 检查轮播是否正在播放例外情况的内容
                else {
                    var current_display_index = obj.playloop_app.current_display_index;
                    if (current_display_index >= 0) {
                        var display_data = obj.playloop_app.configs.playlist.display_list[current_display_index];
                        var display_id = display_data.display_id;
                        if (condition.no_preemption.indexOf(display_id) > -1) {
                            return false;
                        }
                    }
                }
            }

            // 判断product_id
            if ('product_id' in condition) {
                if (condition.product_id.length == 0) {
                    return false;
                }

                for (var i = 0; i < condition.product_id.length; i++) {
                    var product_id = condition.product_id[i];
                    if (user_session.product_id.indexOf(product_id) < 0) {
                        return false;
                    }
                }
            }

            // 判断灵敏度
            if ('sensitive_type' in condition) {
                var sensitive_type = condition.sensitive_type.toLowerCase();
                if (sensitive_type == 'fast') {
                    if (['HAND_ON', 'HAND_KEEP'].indexOf(user_session.update_trigger) < 0) {
                        return false;
                    }
                }
				else if (sensitive_type == 'medium') {
				    if (user_session.update_trigger != 'HAND_KEEP') {
				        return false;
				    }
				}
                else if (sensitive_type == 'slow') {
                    if (user_session.update_trigger != 'HAND_OFF') {
                        return false;
                    }
                }
            }
            // 以上都满足，则返回true
            return true;
        }

        var screen_click_interaction = function(user_session, condition) {
            // 以上都满足，则返回true
            return true;
        }

        // 互动类型判断
        var judge_interaction_type = function(user_session) {
            var interaction_type = 'unkown';
            if (user_session.session_status == 'USER_SESSION_ON') {
                interaction_type = 'say_hello';
            }
            else if (user_session.behavior_type == 'FOCUSING_ON') {
                interaction_type = 'product_interact';
            }
            else if (user_session.behavior_type == 'SCREEN_CLICK') {
                interaction_type = 'screen_click';
            }
            return interaction_type;
        }
    }

    // 执行动作类型
    obj.action_types = {
        'full_insert': full_insert_action,  // 全屏插播
        'stack_insert': stack_insert_action,  // 浮窗插播
        'goto_webapp': goto_webapp_action  // 跳转应用
    }

    // 互动类型
    obj.interaction_types = {
        'say_hello': say_hello_interaction,       // 打招呼
        'product_interact': product_interaction,  // 商品互动
        'screen_click': screen_click_interaction  // 点击屏幕
    };

    // 执行ai互动
    obj.exec = function(user_session) {
        var interaction_type = judge_interaction_type(user_session);
		let tic = new Date().getTime();
        console.log('interaction type:', interaction_type);

        // 获取对应交互的函数
        var interact_func = obj.interaction_types[interaction_type];
        if (interact_func) {
            // 获取对应类型的交互条件
            var config_paras = obj.ai_interaction_configs[interaction_type] || [];

            // 执行交互，得到对应的执行动作参数
            var action_para = null;
            for (var i = 0; i < config_paras.length; i++) {
                var config_para = config_paras[i];
                var condition = config_para.condition_para || {};

                // 判断是符合条件
                if (interact_func(user_session, condition)) {
                    action_para = config_para.action_para;
                    break;
                }
            }
			console.log("Done For", (new Date().getTime() - tic));
            
            // 执行动作
            if (action_para) {
                var action_type = action_para['action_type'];
                var action_func = obj.action_types[action_type];

                if (action_func) {
                    var action_data = action_para['action_data'];
                    console.log('action: ' + interaction_type + ' ' + action_type, (new Date().getTime() - tic));
                    action_func(action_data);
					console.log('action done: ' + interaction_type + ' ' + action_type, (new Date().getTime() - tic));

                    // 触发回调
                    var data = {
                        interaction_type: interaction_type,
                        condition: condition,
                        action_type: action_func,
                        action_data: action_data,
                    }
                    if (action_type == 'full_insert') {
                        data['expired_time'] = action_data.display_time || 30;
                    }
                    else if (action_type == 'stack_insert') {
                        data['expired_time'] = action_data.display_time || 30;
                    }
                    else if (action_type == 'goto_webapp') {
                        data['expired_time'] = 30;
                    }
                    obj.onAction(data);
                }
                else {
                    console.error('not this action type:', action_type);
                }
            }
        }
        return action_para != null;
    }

    // 初始化加载器
    obj.init = function() {
        return new Promise(async function(resolve, reject) {
            obj.playloop_app.show_tip('解析AI交互配置中...');

            // 调整AI互动配置（归类，调整为字典，方便找到对应的类型）
            obj.ai_interaction_configs = {};
            for (var ii = 0; ii < ai_configs.length; ii++) {
                var ai_config = ai_configs[ii];
                var interaction_type = ai_config['type'];
                if (!(interaction_type in obj.ai_interaction_configs)) {
                    obj.ai_interaction_configs[interaction_type] = [];
                }

                for (var i = 0; i < ai_config['config_para'].length; i++) {
                    var action_type = ai_config['config_para'][i]['action_para']['action_type'];
                    // 找出“打开应用”的action
                    if (action_type == 'goto_webapp') {
                        var action_data = ai_config['config_para'][i]['action_para']['action_data'];

                        var webapp_src = action_data['src'];
                        var tar_name = webapp_src.split('/').pop();
                        var webapp_name = tar_name.substr(0, tar_name.length - 7);
                        var webapp_path = '/static/webapp/' + webapp_name + '/index.html';
                        ai_config['config_para'][i]['action_para']['action_data']['path'] = webapp_path;

                        // 询问vi是否有对应的webapp
                        var is_loaded = _check_webapp(webapp_name);
                        if (!is_loaded) {
                            obj.playloop_app.show_tip('下载应用：' + action_data['name'], 'download');
                            await _download_webapp(webapp_src, action_data['name']).catch(function(err) {
                                reject(err);
                            });
                        }
                    }
                    // 找出“全屏插播”的action
                    else if (action_type == 'full_insert') {
                        // 该action_data就是display的数据
                        var action_data = ai_config['config_para'][i]['action_para']['action_data'];
                        obj.playloop_app.show_tip('正在互动页：' +  action_data.display_name, 'download');
                        await obj.playloop_app.render_display(action_data).catch(function(err) {
                            reject(err);
                        });
                    }
                }

                // 合并条件，防止ai_configs配置了多个同样类型的交互
                var config_paras = obj.ai_interaction_configs[interaction_type].concat(ai_config['config_para']);
                obj.ai_interaction_configs[interaction_type] = config_paras;
            }

            // 向vi请求，判断是否已经处理
            resolve();
        });
    }
}


module.exports = {
  AiInteractor: AiInteractor
}