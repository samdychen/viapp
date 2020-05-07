// 引入模块
const $ = require('./libs/jquery-1.12.4.min.js');
const { EnodebService } = require('../../sdk/enodeb_service.js');
const { EnodefService } = require('../../sdk/enodef_service.js');
const { HvdService }    = require('../../sdk/hvd_service.js');
const { HvsService }    = require('../../sdk/hvs_service');
const { LocalWS }       = require('../../sdk/local_ws.js');

// window location host
var host;
if (window.location.host == '') {
	host = '127.0.0.1:5000';
} else {
	host = window.location.host;
}
var get_realtime_config_url = 'http://' + host + '/webapp/realtime/config';

// 人脸模块
function FaceModule(module_id) {
	var obj = this;
	obj.module_id = module_id;
	obj.module_obj = $('#' + module_id);

	// 通过模板，获取face的element html
	function get_face_element(face_data) {
		var face_template = `
			<div class="col-md-4 col-sm-12 col-xs-12" face_id="${face_data.face_id}">
				<div class="customer_panel">
					<div class="new_tip">
						<img src="./media/new.png">
					</div>
					<div class="col-md-6 col-sm-6 col-xs-6">
						<div class="customer_face">
							<img src="${face_data.img_src || './media/nobody.png'}">
						</div>
					</div>
					<div class="col-md-6 col-sm-6 col-xs-6">
						<div class="customer_info">
							<div class="item">
								<div class="item_name">
									<p class="zh">性别</p>
									<p class="en">GENDER</p>
								</div>
								<div class="item_content sex">
									<img src="./media/${face_data.sex || 'man'}.png">
								</div>
							</div>
							<div class="item">
								<div class="item_name">
									<p class="zh">年龄</p>
									<p class="en">AGE</p>
								</div>
								<div class="item_content age ${face_data.sex == 'female' ? 'female' : 'male'}">
									<span>${face_data.age || '??'}</span>
								</div>
							</div>
							<div class="item">
								<div class="item_name">
									<p class="zh">表情</p>
									<p class="en">EXPRESSION</p>
								</div>
								<div class="item_content expression">
									<img src="./media/${face_data.mood || 'mood'}.png">
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>`;
		return face_template;
	}

	// 添加人脸
	obj.add_face = function(face_data) {
		var face_element = get_face_element(face_data);
		var face = $(face_element);

		// 判断是否是nobody
		if (face.attr('face_id') == 'nobody') {
			// 容器少于3张人脸，才能添加nobody
			if (obj.module_obj.find('[face_id]').length < 3) {
				obj.module_obj.append(face);
			}
		}
		else {
			// 如果存在nobody，则替换第1张nobody为face
			var nobodys = obj.module_obj.find('[face_id="nobody"]');
			if (nobodys.length > 0) {
				$(nobodys[0]).replaceWith(face);
			}
			// 否则直接添加face
			else {
				if (obj.module_obj.find('[face_id]').length >= 3) {
					obj.module_obj.find('[face_id]:last').remove();
				}
				obj.module_obj.append(face);   
			}

			// 更新new标记
			obj.module_obj.find('[face_id]').removeClass('new_face');
			face.addClass('new_face');
		}
	}

	// 添加nobody
	obj.add_nobody = function() {
		var nobody_face_data = {face_id: 'nobody', img_src: '', name: '', sex: '', age: '', mood: ''};
		obj.add_face(nobody_face_data);
	}

	// 更新人脸
	obj.update_face = function(face_data) {
		var face_id = face_data.face_id;
		var face = obj.module_obj.find('[face_id="' + face_id + '"]');
		// 如果人脸存在，才更新
		if (face.length > 0) {
			if (face_data.img_src) {
				face.find('.customer_face').attr('src', face_data.img_src);
			}
			if (face_data.sex) {
				var src = './media/' + face_data.sex + '.png';
				face.find('.sex img').attr('src', src);
			}
			if (face_data.age) {
				face.find('.age span').text(face_data.age);
			}
			if (face_data.mood) {
				var src = './media/' + face_data.mood + '.png';
				face.find('.expression img').attr('src', src);
			}
		}
	}

	// 判断人脸是否存在
	obj.face_exists = function(face_id) {
		return obj.module_obj.find('[face_id="' + face_id + '"]').length > 0;
	}

	// 移除人脸
	obj.remove_face = function(face_id) {
		obj.module_obj.find('[face_id="' + face_id + '"]').remove();
	}

	// 获取目前人脸人数（包括nobody）
	obj.face_count = function() {
		return obj.module_obj.find('[face_id]').length;
	}

	// 初始化
	obj.init = function() {
		obj.module_obj.find('[face_id]').remove();
		for (var i = 0; i < 3; i++) {
			obj.add_nobody();
		}
	}
}

// 商品模块
function ProductModule(module_id) {
	var obj = this;
	obj.module_id = module_id;
	obj.module_obj = $('#' + module_id);
	obj.product_list = [];
	obj.product_names = {};

	// 获取商品列表
	var get_product_list = function() {
		var product_list = [];
		$.ajax({
			url: get_realtime_config_url,
			type: 'post',
			contentType: 'application/json',
			dataType: 'json',
			cache: false,
			async: false,
			success: function(data) {
				product_list = data.data.product_list;
			},
			error: function(xhr){
				console.log(xhr);
			}
		});
		return product_list;
	}

	// 获取商品element
	var get_product_element = function(product_data) {
		var product_element = `
			<div class="row product_rank" product_id="${product_data.product_id}">
				<div class="col-md-3 col-sm-3 col-xs-3">
					<span class="took_count">${product_data.took_count || 0}</span>
				</div>
				<div class="col-md-6 col-sm-6 col-xs-6">
					<div class="product">
						<img src="${product_data.product_img}">
					</div>
				</div>
				<div class="col-md-3 col-sm-3 col-xs-3">
					<span class="clicked_count">${product_data.clicked_count || 0}</span>
				</div>
			</div>`;
		return product_element;
	}

	// 添加商品
	obj.add_product = function(product_data) {
		// 最多添加5个商品
		if (obj.module_obj.find('[product_id]').length < 5) {
			var product_element = get_product_element(product_data);
			var product_obj = $(product_element);
			obj.module_obj.append(product_obj);
		}
	}

	// 增加商品拿放次数
	obj.add_product_tooktimes = function(product_id) {
		// 找到对应的product
		for (var i = 0; i < obj.product_list.length; i++) {
			if (obj.product_list[i].product_id == product_id) {
				break;
			}
		}
		// 更新数据
		if (i < obj.product_list.length) {
			obj.product_list[i].took_count ++;
			obj.product_list[i].total_count ++;
		}

		// 重新排序
		obj.product_list.sort((a, b) => {
			return b.total_count - a.total_count;
		});

		// 重新绘制
		obj.module_obj.find('[product_id]').remove();
		for (var i = 0; i < obj.product_list.length; i++) {
			var product_data = obj.product_list[i];
			obj.add_product(product_data);
		}
	}

	// 增加商品点击次数
	obj.add_product_clickedtimes = function(product_id) {
		// 找到对应的product
		for (var i = 0; i < obj.product_list.length; i++) {
			if (obj.product_list[i].product_id == product_id) {
				break;
			}
		}
		// 更新数据
		if (i < obj.product_list.length) {
			obj.product_list[i].clicked_count ++;
			obj.product_list[i].total_count ++;
		}

		// 重新排序
		obj.product_list.sort((a, b) => {
			return b.total_count - a.total_count;
		});

		// 重新绘制
		obj.module_obj.find('[product_id]').remove();
		for (var i = 0; i < obj.product_list.length; i++) {
			var product_data = obj.product_list[i];
			obj.add_product(product_data);
		}
	}

	// 初始化
	obj.init = function() {
		var product_list = get_product_list();
		for (var i = 0; i < product_list.length; i++) {
			product_list[i].took_count = 0;
			product_list[i].clicked_count = 0;
			product_list[i].total_count = 0;

			var product_data = product_list[i];
			obj.add_product(product_data);
			obj.product_names[product_data.product_id] = product_data.product_name;
		}
		// 记录product_list
		obj.product_list = product_list;
	}
}

// 语音聊天模块
function VoiceChatModule(module_id) {
	var obj = this;
	obj.module_id = module_id;
	obj.module_obj = $('#' + module_id);

	// 获取用户说话的element
	var get_user_said_element = function(text) {
		var said_element = `
			<li class="customer_say">
				<img src="./media/customer.png" class="chat_head pull-left">
				<div class="chat_content content_left">
					<div class="tail tail_left"></div>
					<p class="content">${text}</p>
				</div>
			</li>`;
		return said_element;
	}

	// 获取机器人说话的element
	var get_bot_said_element = function(text) {
		var said_element = `
			<li class="voice_chat_say">
				<div class="chat_content content_right">
					<div class="tail tail_right"></div>
					<p class="content">${text}</p>
				</div>
				<img src="./media/robot_service.png" class="chat_head pull-right">
			</li>`;
		return said_element;
	}

	// 滚动到底部动画
	var moving_to_bottom = function() {
		var scrollHeight = obj.module_obj.prop("scrollHeight");
		obj.module_obj.parent().animate({scrollTop: scrollHeight}, 400);
	}

	// 添加用户说话内容
	obj.add_user_said = function(text) {
		var said_element = get_user_said_element(text);
		obj.module_obj.append(said_element);
		moving_to_bottom();
	}

	// 添加机器人说话内容
	obj.add_bot_said = function(text) {
		var said_element = get_bot_said_element(text);
		obj.module_obj.append(said_element);
		moving_to_bottom();
	}
}

// 行为数据模块
function BehaviorModule(module_id) {
	var obj = this;
	obj.module_id = module_id;
	obj.module_obj = $('#' + module_id);

	// 时间格式化
	Date.prototype.format = function(format) {
		var o = {
			"M+" : this.getMonth()+1, //month
			"d+" : this.getDate(),    //day
			"h+" : this.getHours(),   //hour
			"m+" : this.getMinutes(), //minute
			"s+" : this.getSeconds(), //second
			"q+" : Math.floor((this.getMonth()+3)/3),  //quarter
			"S" : this.getMilliseconds() //millisecond
		}
		if (/(y+)/.test(format)) {
			format = format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
		}
		for(var k in o) {
			if(new RegExp("("+ k +")").test(format)) {
				format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
			}
		}
		return format;
	}

	// 获取记录的element
	var get_log_element = function(log_data) {
		var time = new Date().format('yyyy-MM-dd hh:mm:ss');
		var log_element = `
			<div class="row logger">
				<div class="circle new_circle"></div>
				<div class="description">
					<span class="action_type">${log_data.action_type || ''}</span>
					<span class="action_description new_action_description">${log_data.action_description || ''}</span>
				</div>
				<div class="logger_time">
					<span class="time">${time}</span>
				</div>
			</div>`;
		return log_element;
	}

	// 新日志动画
	var new_log_animate = function(log_obj) {
		var show_animated = 'heartBeat';
		log_obj.addClass('animated').addClass(show_animated);
		log_obj.one('animationend', function(){
			log_obj.removeClass('animated').removeClass(show_animated);
		});
	}

	// 添加记录
	obj.add_log = function(log_data, icon_src) {
		// 添加log
		var log_element = get_log_element(log_data);
		var log_obj = $(log_element);
		if (icon_src) {
			log_obj.find('.description').append($('<img>').attr('src', icon_src));
		}

		obj.module_obj.prepend(log_obj);

		// 移动到最前
		obj.module_obj[0].scrollTop = 0;

		// 添加动画
		new_log_animate(log_obj);
	}

	// 清除new_circle
	obj.clear_new_circle = function() {
		obj.module_obj.find('.new_circle').removeClass('new_circle');
	}
}

// 人脸模块
var face_module = new FaceModule('face_module');
face_module.init();

// 商品模块
var product_module = new ProductModule('product_module');
product_module.init();

// 语音模块
var vchat_module = new VoiceChatModule('voice_chat_module');

// 行为记录模块
var behavior_module = new BehaviorModule('behavior_module');


var REALTIME_CLIENT_TAG = 'realtime_v1';

// 人脸服务
{
	var enodef = new EnodefService(REALTIME_CLIENT_TAG);

	enodef.onFaceOn = function (data) {
		// 人脸出现
		var faces_data = JSON.parse(data);
		for (var i = 0; i < faces_data.face_list.length; i ++){
			var face = JSON.parse(faces_data.face_list[i]);
			var face_id = face.face_tr_id;
			var face_data = {
				face_id: face_id,
				img_src: "data:image/jpeg;base64," + face.face_img,
			}
			face_module.add_face(face_data);

			// 人脸属性识别
			enodef.face_detect(face.face_img).then((face_detect_data)=>{
				var face_data = {
					face_id: face_id,
					mood: face_detect_data.emotion.type,
					sex: face_detect_data.gender.type,
					age: face_detect_data.age,
				};
				face_module.update_face(face_data);
			});
		}
	}
	enodef.onFaceKeep = function (data) {
		// 更新人脸
		var faces_data = JSON.parse(data);
		for (var i = 0; i < faces_data.face_list.length; i ++){
			var face = JSON.parse(faces_data.face_list[i]);
			var face_id = face.face_tr_id;

			// 判断人脸是否存在
			if (face.face_status == 'SHOW_OFF') {
				face_module.remove_face(face_id);
			}
			else {
				var face_data = {
					face_id: face_id,
					img_src: "data:image/jpeg;base64," + face.face_img,
				}
				// 判断对应face是否存在
				if (face_module.face_exists(face_id)) {
					face_module.update_face(face_data);
				}
				else {
					face_module.add_face(face_data);
				}

				// 人脸属性识别
				enodef.face_detect(face.face_img).then((face_detect_data)=>{
					var face_data = {
						face_id: face_id,
						mood: face_detect_data.emotion.type,
						sex: face_detect_data.gender.type,
						age: face_detect_data.age,
					};
					if (face_module.face_exists(face_id)) {
						face_module.update_face(face_data);
					}
				});
			}
		}

		// 补充nobody，让人脸个数达到3人
		var need_face_count = 3 - face_module.face_count();
		for (var i = 0; i < need_face_count; i++) {
			face_module.add_nobody();
		}
	}
	enodef.onFaceOff = function (data) {
		face_module.init();  // 初始化，清除全部人脸
	}
	enodef.open();
}

// 语音识别服务
{
	var hvd_service = new HvdService(REALTIME_CLIENT_TAG);

	// 识别到一句话结束
	hvd_service.onVoiceOff = function (data) {
		var hvd_data = JSON.parse(data);
		var voice_text = hvd_data.voice_text;
		if (voice_text != '') {
			vchat_module.add_user_said(voice_text);
			var log_data = {
				action_type: '发起了',
				action_description: '语音咨询',
			};
			var icon_src = './media/chat.png';
			behavior_module.clear_new_circle();
			behavior_module.add_log(log_data, icon_src);
		}
	}
	hvd_service.open();
}

// 语音合成服务
{
	var hvs_service = new HvsService(REALTIME_CLIENT_TAG);

	// 开始合成
	hvs_service.onStartHvs = function (data) {
		var voice_text = data.result.voice_text;
		vchat_module.add_bot_said(voice_text);
	}
	hvs_service.open();
}

// 商品拿起服务
{
	var enodeb = new EnodebService(REALTIME_CLIENT_TAG);
	enodeb.open();
	enodeb.onHandOff = function(data) {
		var hand_data = JSON.parse(data);
		var moving_product_id = hand_data.moving_product_id;
		if ((hand_data.moving_product_id.length > 0) && (hand_data.frame_counter >= 3)) {
			behavior_module.clear_new_circle();

			for (var i = 0; i < moving_product_id.length; i++) {
				// 更新拿放次数
				var product_id = moving_product_id[i];
				product_module.add_product_tooktimes(product_id)
				var log_data = {
					action_type: '拿放了',
					action_description: product_module.product_names[product_id],
				};
				var icon_src = './media/product/' + product_id + '.png';
				behavior_module.add_log(log_data, icon_src);
			}
		}
	}
}

// 商品点击
{
	var local_ws = new LocalWS(REALTIME_CLIENT_TAG);
	local_ws.open();
	local_ws.onBehavior = function(data) {
		var product_id = data.behavior_data.product_id;
		if (data.behavior_type == 'click' && product_id) {
			// 更新点击次数
			product_module.add_product_clickedtimes(product_id);
			// 添加日志
			var log_data = {
				action_type: '点击了',
				action_description: product_module.product_names[product_id],
			};
			var icon_src = './media/product/' + product_id + '.png';
			behavior_module.clear_new_circle();
			behavior_module.add_log(log_data, icon_src);
		}
	}
}