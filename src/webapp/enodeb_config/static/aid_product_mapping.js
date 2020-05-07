const $ = require('../libs/jquery-1.12.4.min.js');

function AidProductMapping(container_id) {
    var obj = this;
    obj.container = $('#' + container_id);
    obj.textarea = obj.container.find('textarea');
    obj.tip_obj = obj.container.find('.tip');

    obj.error_tip = function(err) {
        obj.tip_obj.text('Error: ' + err);
    }
    obj.show_tip = function(text) {
        obj.tip_obj.text(text);
    }

    obj.get_config = function(){
        var configs = {};
        $.ajax({
            url: '/device/aid_to_pid_mapping/config',
            type: 'GET',
            cache: false,
            async: false,
            dataType: 'json',
            success: function(data) {
                if (data.status == 1) {
                    configs = data.data;
                }
                else {
                    obj.error_tip(data.message);
                }
            },
            error: function(xhr) {
                obj.error_tip('未知错误');
            }
        });
        return configs;
    }

    var set_content = function(configs){
        var content = JSON.stringify(configs, null, 4);
        obj.textarea.val(content);
    }

    obj.save_configs = function(password) {
        var configs = obj.textarea.val();
        var is_parsed = false;
        try {
            configs = JSON.parse(configs);
            is_parsed = true;
        }
        catch (err) {
            obj.error_tip('配置格式错误：' + err);
            return false;
        }

        var is_updated = false;
        $.ajax({
            url: '/device/aid_to_pid_mapping/config',
            type: 'POST',
            contentType: 'application/json',
            cache: false,
            async: false,
            dataType: 'json',
            data: JSON.stringify({password: password, config: configs}),
            success: function(data) {
                if (data.status == 1) {
                    is_updated = true;
                }
                else {
                    obj.error_tip(data.message);
                }
            },
            error: function(xhr) {
                obj.error_tip('未知错误');
            }
        });
        return is_updated;
    }

    obj.init = function() {
        obj.configs = obj.get_config();
        set_content(obj.configs);
    }
}

module.exports = {
  AidProductMapping: AidProductMapping
}