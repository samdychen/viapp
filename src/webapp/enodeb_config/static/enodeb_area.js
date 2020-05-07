const $ = require('../libs/jquery-1.12.4.min.js');

function EnodebArea(container_id) {
    var obj = this;
    obj.container = $('#' + container_id);
    obj.areas_container = obj.container.find('.areas_container');
    obj.img_obj = obj.container.find('.areas_container img');
    obj.tip_obj = obj.container.find('.tip');

    // 显示提示内容
    obj.error_tip = function(err) {
        obj.tip_obj.text('Error: ' + err);
    }
    obj.show_tip = function(tip_text) {
        obj.tip_obj.text(tip_text);
    }

    // 设置图片
    obj.set_img = function(img_base64) {
        obj.img_obj.attr('src', 'data:image/jpeg;base64,' + img_base64);
    }

    // 获取区域默认大小
    obj.default_area_size = function() {
        var size = {};
        size.width = obj.container.innerWidth() / 4;
        size.height = obj.container.innerHeight() / 2;
        return size;
    }

    // 获取图片缩放比例
    var get_img_rate = function(img_obj) {
        var img = img_obj[0];
        var width_rate = img.width / img.naturalWidth;
        var height_rate = img.height / img.naturalHeight;
        return {
            width_rate: width_rate,
            height_rate: height_rate,
        }
    }

    // 获取区域个数
    var get_area_count = function() {
        // 创建元素
        var count = obj.container.find('.area').length;
        return count;
    }

    // 创建区域
    obj.add_area = function(left, top, width, height) {
        if (obj.img_obj.attr('src') == '#') {
            obj.error_tip('请先获取图片');
            return;
        }

        // 创建元素
        var area_count = get_area_count();
        var area_obj = $('<div>').addClass('area').attr('index', area_count + 1);
        area_obj.append($('<span>').text(area_count + 1).addClass('index'));
        area_obj.append($('<span>').text('×').addClass('remove'));

        // 设置位置和大小
        area_obj.css({left: left, top: top, width: width, height: height });

        // 设置拖动和缩放
        area_obj.draggable({
            containment: ".areas_container",
            scroll: false,
            drag: function(event, ui) {
                reset_index();
                show_areas_size();
            },
        });
        area_obj.resizable({
            containment: ".areas_container",
            resize: function(event, ui) {
                show_areas_size();
            },
        });

        // draggable将position改成relative，会影响布局，这里调整回absolute
        area_obj.css({
            position: 'absolute',
        });

        // 添加区域
        obj.areas_container.append(area_obj);
        reset_index();
        show_areas_size();
    }

    // 移除区域
    obj.areas_container.on('click', '.area .remove', function(){
        $(this).parent().remove();
        reset_index();
        show_areas_size();
    });

    // 重新排序
    function reset_index() {
        // 根据left调整index
        var lefts = [];
        var old_indexes = [];
        obj.areas_container.find('.area').each(function(index, element){
            // 获取每个区域的left
            var element_left = $(element).position().left;
            var is_insert = false;
            for (var i = 0; i < lefts.length; i++) {
                var left = lefts[i];
                if (element_left < left) {
                    lefts.splice(i, 0, element_left);
                    is_insert = true;
                    break;
                }
            }
            if (!is_insert) {
                lefts.push(element_left);
            }

            // 排序并记录旧的index
            old_indexes.splice(i, 0, $(this).attr('index'));
            $(this).attr('old_index', $(this).attr('index'));
        });

        // 设置新的排序
        for (var i = 0; i < old_indexes.length; i++) {
            var old_index = old_indexes[i];
            var area_obj = obj.areas_container.find(".area[old_index=" + old_index + "]");
            area_obj.attr('index', i + 1);
            area_obj.find('.index').text(i + 1);
        }
    }

    // 计算区域大小
    function calc_area_size(area_obj, rates) {
        var x1 = area_obj.position().left;
        var y1 = area_obj.position().top;
        var x2 = area_obj.outerWidth() + x1;
        var y2 = area_obj.outerHeight() + y1;
        var loc = [
            parseInt(x1 / rates.width_rate),
            parseInt(y1 / rates.height_rate),
            parseInt(x2 / rates.width_rate),
            parseInt(y2 / rates.height_rate)
        ];
        return loc;
    }

    // 显示全部区域大小
    function show_areas_size() {
        var areas_length = obj.areas_container.find('.area').length;
        var locs = [];
        var rates = get_img_rate(obj.img_obj);

        for (var i = 0; i < areas_length; i ++) {
            var index = i + 1;
            var area_obj = obj.areas_container.find('.area[index=' + index + ']');
            var loc = calc_area_size(area_obj, rates);
            locs.push(loc.join(','));
        }
        obj.show_tip('区域坐标：' + locs.join(' | '));
    }

    // 移除全部区域
    obj.remove_all_areas = function() {
        obj.areas_container.find('.area').remove();
    }

    // 区域划分的坐标，转成可用的区域坐标
    obj.loc_to_position = function(x1, y1, x2, y2) {
        var rates = get_img_rate(obj.img_obj);
        var position = {
            'left': rates.width_rate * x1,
            'top': rates.height_rate * y1,
            'width': rates.width_rate * (x2 - x1) - 4,  // 减4，是因为减去边框的影响
            'height': rates.height_rate * (y2 - y1) - 4,  // 减4，是因为减去边框的影响
        };
        return position;
    }

    obj.get_config = function(){
        var configs = {};
        $.ajax({
            url: '/device/enodeb_1/config',
            type: 'GET',
            cache: false,
            async: false,
            dataType: 'json',
            success: function(data) {
                if (data.status == 1) {
                    configs = data.data;
                }
                else {
                    throw(data.message);
                }
            },
            error: function(xhr) {
                throw('未知错误');
            }
        });
        return configs;
    }

    // 保存
    obj.save_areas = function(password) {
        var configs = {};

        // 获取区域配置
        var areas_length = obj.areas_container.find('.area').length;
        var locs = [];
        var rates = get_img_rate(obj.img_obj);

        for (var i = 0; i < areas_length; i ++) {
            var index = i + 1;
            var area_obj = obj.areas_container.find('.area[index=' + index + ']');
            var loc = calc_area_size(area_obj, rates);
            locs.push(loc);
        }

        // 获取
        try {
            var configs = obj.get_config();
        }
        catch (err) {
            obj.error_tip(err);
            return false;
        }

        // 更新配置
        var is_updated = false;
        configs.region.detected_area = locs;
        $.ajax({
            url: '/device/enodeb_1/config',
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

    }
}

module.exports = {
  EnodebArea: EnodebArea
}