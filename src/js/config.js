jQuery.noConflict();

(function($) {
    "use strict";
    $(function() {
        var DEBUG = 0;
        var PLUGIN_ID;
        var API_BASE_PATH;
        
        if (DEBUG) {
            PLUGIN_ID = 'kpebgfdkfoaojokponjncnmcdlgeabck';
            API_BASE_PATH = 'https://localetest.kintoneapp.com/';
        } else {
            PLUGIN_ID = 'mddhpfmiepehgchogoffiaaibbhimlfm';
            API_BASE_PATH = 'https://print.kintoneapp.com/';
        }
        
        var terms = {
            'en':{
                'appcode': 'App Code',
                'appcode_description': 'Enter the app code retrieved from your Invoice Creator.',
                'invalid_appcode': 'Cannot access Invoice Creator. Check the app code.',
                'error': 'Error: ',
                'plugin_submit': '     Save   ',
                'plugin_cancel': '     Cancel   ',
                'required_field': 'Required field is empty.',
                'not_available_in_guest_space': 'Invoice Creator is not available in the guest space.'
            },
            'ja':{
                'appcode': 'アプリコード',
                'appcode_description': 'プリントクリエイターで取得したアプリコードを入力してください。',
                'invalid_appcode': 'プリントクリエイターに接続できません。アプリコードを確認してください。',
                'error': 'エラー: ',
                'plugin_submit': '     保存   ',
                'plugin_cancel': '  キャンセル   ',
                'required_field': '必須項目が入力されていません。',
                'not_available_in_guest_space': 'ゲストスペースでは、プリントクリエイターを利用できません。'
            }
        };

        var getGuestSpacePath = function() {
            return location.pathname.match(/^\/k\/(guest\/\d+\/)/);
        };
        
        var api = function(url, method, data, success, error) {
            
            url = API_BASE_PATH + url;
            
            // 'GET' method
            if (method === 'GET') {
                url = [url, '?', $.param(data)].join('');
                data = {};
            }

            var onProxySuccess = (function(success, error) {
                return function(body, status, headers) {
                    if (status >= 200 && status < 300) {
                        success(body);
                    } else if (typeof error === 'function') {
                        error(body);
                    }
                };
            })(success, error);

            // Translate kintone proxy error
            var onProxyError = (function(error) {
                return function(body) {
                    if (typeof error === 'function') {
                        error(body);
                    }
                };
            })(error);

            return kintone.proxy(url, method, {}, data, onProxySuccess, onProxyError);
        };
        
        var html = '\
<div class="garoonPlugin-config-cybozu">\
    <div class="app-plugin-admin-message-gaia" id="not_available_in_guest_space" style="display:none;">\
      {{>terms.not_available_in_guest_space}}\
    </div>\
    <div class="formRow-cybozu">\
        <label class="input-label-cybozu"><span id="appcode_label">{{>terms.appcode}}</span><span class="require-cybozu">*</span></label>\
        <div id="appcode_description">{{>terms.appcode_description}}</div>\
        <div class="input-text-outer-cybozu" style="width: 300px;"><input type="text" id="appcode" class="input-text-cybozu"/></div>\
    </div>\
    <div class="form-submit">\
        <button id="plugin_submit" class="button-normal-cybozu button-disabled-cybozu dialog-ok-button-cybozu" type="button">{{>terms.plugin_submit}}</button>\
        <button id="plugin_cancel" class="button-normal-cybozu dialog-close-button-cybozu" type="button">{{>terms.plugin_cancel}}</button>\
    </div>\
</div>\
';
        var storable = false;
        var lang = kintone.getLoginUser().language;
        var i18n = (lang in terms) ? terms[lang]: terms['en'];
            
        var tmpl = $.templates(html);
        $('div#printcreator-plugin').html(tmpl.render({'terms': i18n }));
        
        if (getGuestSpacePath()) {
            $('#not_available_in_guest_space').show();
        } else {
            $('#plugin_submit').removeClass('button-disabled-cybozu');
            storable = true;
        }
        
        var config = kintone.plugin.app.getConfig(PLUGIN_ID);
        config['appCode'] && $('#appcode').val(config['appCode']);

        $('#plugin_submit').click(function() {
            if (!storable) return;
            var appcode = $('#appcode').val();
            if (!appcode) {
                alert(i18n.required_field);
                return;
            }
            
            $('#plugin_submit').addClass('button-disabled-cybozu');
            
            function errorHandler(message) {
                if (message) {
                    alert(i18n.invalid_appcode + '\n' + i18n.error + message);
                } else {
                    alert(i18n.invalid_appcode);
                }
                
                $('#plugin_submit').removeClass('button-disabled-cybozu');
            }

            api('api/v1/ext-sheets', 'GET', {'appCode': appcode}, function(body, status, header) {
                try {
                    var json = $.parseJSON(body);
                    var config = {};
                    config['appCode'] = appcode;
                    kintone.plugin.app.setConfig(config);
                } catch(e) {
                    errorHandler();
                    return;
                }
                
            }, function(body) {
                var message;
                try {
                    var json = $.parseJSON(body);
                    if (json.error ) {
                        message = json.error.message;
                    }
                } catch(e) {
                }
                errorHandler(message);
            });
            
        });

        $('#plugin_cancel').click(function() {
            history.back();
        });

    });

})(jQuery);
