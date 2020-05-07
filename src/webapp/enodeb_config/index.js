// 引入依赖
const $ = require('../../libs/jquery-1.12.4.min.js');
const { EnodebService } = require('../../sdk/enodeb_service.js');

const { EnodebConfig } = require('./static/enodeb_config.js');
const { EnodebArea } = require('./static/enodeb_area.js');
const { AidProductMapping } = require('./static/aid_product_mapping.js');


var CLIENT_TAG = 'enodeb_config';

// 初始化标签页
//$("#tabs").tabs();

// 动作服务配置
{
	var enodeb_config = new EnodebConfig('config_tab');
	enodeb_config.init();

	// 获取配置
	$('.get_config_btn').click(function(){
		enodeb_config.init();
		enodeb_config.show_tip('加载配置成功');
	});

	// 保存配置按钮
	$('.save_config_btn').click(function(){
		var is_updated = enodeb_config.save_configs('csq123456');
		if (is_updated) {
			enodeb_config.show_tip('保存配置成功');
		}
	});
}

// 动作区域划分
{
	var enodeb_area = new EnodebArea('area_tab');
	enodeb_area.init();

	// 获取图片按钮点击事件
	$('.get_camera_img_btn').click(function(){
		if (enodeb.ws.readyState != enodeb.ws.OPEN) {
			enodeb_area.error_tip('动作服务连接有问题，刷新页面重试一下');
			return;
		}
		enodeb.get_camera_frame();
	});

	// 添加区域按钮点击事件
	$('.add_area_btn').click(function(){
		var size = enodeb_area.default_area_size();
		enodeb_area.add_area(0, 0, size.width, size.height);
	});

	// 加载区域划分
	$('.load_areas_btn').click(function(){
		enodeb_area.remove_all_areas();
		var configs = enodeb_area.get_config();
		var detected_area = configs.region.detected_area || [];
		for (var i = 0; i < detected_area.length; i++) {
			var loc = detected_area[i];
			var position = enodeb_area.loc_to_position(loc[0], loc[1], loc[2], loc[3]);
			enodeb_area.add_area(position.left, position.top, position.width, position.height);
		}
	});

	// 保存区域按钮
	$('.save_areas_btn').click(function(){
		var is_updated = enodeb_area.save_areas('csq123456');
		if (is_updated) {
			enodeb_config.init();
			enodeb_area.show_tip('保存区域划分成功，同时刷新动作服务配置页面的内容');
		}
	});
}

// 区域和商品对应关系
{
	var aid_product_mapping = new AidProductMapping('aid_product_tab');
	aid_product_mapping.init();

	// 获取配置
	$('.get_aid_poduct_mapping_btn').click(function(){
		aid_product_mapping.init();
		aid_product_mapping.show_tip('加载对应关系成功');
	});

	// 保存配置按钮
	$('.save_aid_poduct_mapping_btn').click(function(){
		var is_updated = aid_product_mapping.save_configs('csq123456');
		if (is_updated) {
			aid_product_mapping.show_tip('保存对应关系成功');
		}
	});
}

// 开启动作服务
{
	var enodeb = new EnodebService(CLIENT_TAG);
	enodeb.open();
	enodeb.onGetCameraFrame = function(data){
		var img_base64 = data.camera_frame;
		enodeb_area.set_img(img_base64);
		enodeb_area.container.find('button[disabled]').removeAttr('disabled');
	}

	// 1秒后尝试获取图片
	setTimeout(function(){
		if (enodeb.ws.readyState == 1) {
			$('.get_camera_img_btn').trigger('click');
		}
	}, 1000);
}