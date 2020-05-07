var CLIENT_TAG = 'browser';

// WebApp路径
var WEBAPP_PATHS = {
    'register': 'webapp/register/index.html',
    'playloop': 'webapp/playloop/index.html',
};

// API接口
var host;
if (window.location.host == '') {
	host = '127.0.0.1:5000';
} else {
	host = window.location.host;
}

var APIS = {
    'get_registration_status': 'http://' + host + '/register/status',
    'get_attach_qrcode_url': 'http://' + host + '/register/get_attach_qrcode_url',
    'get_cache_url': 'http://' + host + '/cache/get_cache_url',
    'get_device_config': 'http://' + host + '/device/device/config',
    'get_webapp_config': 'http://' + host + '/webapp/<app_name>/config',
    'restart_device': 'http://' + host + '/device/restart'
};

module.exports = {
  CLIENT_TAG: CLIENT_TAG,
  WEBAPP_PATHS: WEBAPP_PATHS,
  APIS: APIS
}