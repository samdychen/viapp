const QRCode = require('../../libs/qrcode.min.js');
const $ = require('../../libs/jquery-1.12.4.min.js');
const { CLIENT_TAG, WEBAPP_PATHS, APIS } = require('../../sdk/configs.js');

var local_ws = window.top.local_ws;

function RegisterApp(page_id) {
    var obj = this;
    obj.page_id = page_id;
    obj.page = $('#' + page_id);

    // 相关的元素
    var reg_tip = obj.page.find('#reg_tip');
    var qrcode_container = obj.page.find('#qrcode_container');
    var qrcode_element = obj.page.find('#qrcode');
    var fresh_qrcode_btn = obj.page.find('#fresh_qrcode');

    // 获取rand_id
    var get_attach_qrcode = function() {
        var attach_qrcode_data = {};
        $.ajax({
            url: APIS.get_attach_qrcode_url,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            cache: false,
            async: false,
            success: function(data) {
                if (data.status == 1) {
                    attach_qrcode_data.url = data.data.attach_qrcode_url;
                    attach_qrcode_data.expired_time = data.data.expired_time || 500;
                }
                else {
                    throw('获取二维码错误：' + data.message);
                }
            },
            error: function(xhr) {
                console.error(xhr);
                throw('获取二维码错误：' + xhr.statusText);
            }
        });
        return attach_qrcode_data;
    }

    // 显示二维码
    var show_qrcode = function(url, size) {
        qrcode_element.empty();
        var qrcode_element_id = qrcode_element.attr('id');

        var qrcode = new QRCode(qrcode_element_id, {text: url, width: size, height: size});
        qrcode_element.removeAttr('title');
    }

    // 二维码有效期倒计时
    var qrcode_countdown_handler;
    var qrcode_valid_second = 500;
    obj.isvalid = true;
    obj.qrcode_countdown = function(current_second) {
        if (current_second == undefined) {current_second = 0;}
        // 在当前页面
        if (window.location.hash == '#' + obj.page_id) {
            current_second ++;
            var second = qrcode_valid_second - current_second;
            reg_tip.html('扫描二维码，开启新体验\n<small>（二维码' + second + '秒后失效）</small>');

            if (current_second < qrcode_valid_second) {
                qrcode_countdown_handler = setTimeout(function(){
                    obj.qrcode_countdown(current_second);
                }, 1000);    
            }
            else {
                reg_tip.html('二维码已经失效\n<small>（请点击二维码重新获取）</small>');
                fresh_qrcode_btn.show();
                obj.isvalid = false;
            }
        }
    }

    // 停止倒计时
    obj.stop_countdown = function(){
        clearTimeout(qrcode_countdown_handler);
    }

    // 获取二维码，并等待
    obj.get_attach_qrcode = function() {
        try {
            obj.isvalid = true;
            fresh_qrcode_btn.hide();

            // 获取attach_qrcode_url
            let attach_qrcode_data = get_attach_qrcode();
            
            // 显示二维码
            let size = qrcode_container.width() - 18;
            let reg_url = attach_qrcode_data.url;
            show_qrcode(reg_url, size);
            reg_tip.text('扫描二维码，开启新体验');

            // 二维码有效期控制
            qrcode_valid_second = attach_qrcode_data.expired_time;
            obj.qrcode_countdown();
        }
        catch(err) {
            // 获取失败，显示错误信息
            console.log(err);
            reg_tip.text(err);
        }    
    }

    // 获取设备配置
    var get_device_config = function() {
        var device_config = {};
        $.ajax({
            url: APIS.get_device_config,
            type: 'GET',
            cache: false,
            async: false,
            contentType: 'application/json',
            dataType: 'json',
            success: function(data){
                if (data.status == 1) {
                    device_config = data.data;
                }
                else {
                    console.error(data.message);
                }
            }
        });
        return device_config;
    }

    // 事件绑定
    fresh_qrcode_btn.click(function(){
        obj.get_attach_qrcode();
    });

    obj.init = function() {
        // 标记当前进入哪个页面
        window.location.hash = obj.page_id;
        // 定义注册事件
        local_ws.onAttach = function(data) {
            // 判断目前是否有效
            if (obj.isvalid) {
                // 注册
                let device_location = data.device_location;
                obj.stop_countdown();
                obj.isvalid = false;

                if (!device_location) {
                    reg_tip.text('注册信息无效，请重试');
                    fresh_qrcode_btn.show();
                }
                else {
                    reg_tip.text('注册成功，3秒后重启设备...');
					
					// 保存注册设备配置信息到浏览器本地存储
					var device_config = get_device_config();
					localStorage.setItem("device_config", JSON.stringify(device_config));
					console.log(JSON.stringify(device_config));

					/*
                    setTimeout(function(){
                        $.ajax({
                            url: APIS.restart_device,
                            type: 'POST',
                            contentType: 'application/json',
                            cache: false,
                            dataType: 'json',
                            success: function(data) {
                                console.log(data);
                            },
                            error: function(xhr) {
                                reg_tip.text('重启错误，发生未知错误。可以尝试手动重启设备');
                            }
                        });
                    }, 2500);
					*/
                    
                    /* 旧方式，进入轮播
                    // 获取设备配置
                    var device_config = get_device_config();
                    
                    // 跳转到轮播模块
                    delete local_ws.onAttach;
                    var next_app = device_config.default_app || 'playloop';
                    window.location.href = WEBAPP_PATHS[next_app] + '?time=' + (new Date()).getTime();
                    */
                }
            }
        }

        // 获取二维码
        obj.get_attach_qrcode();
    }
}

module.exports = {
  RegisterApp: RegisterApp
}