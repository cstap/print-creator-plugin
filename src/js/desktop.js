jQuery.noConflict();

(function($) {
    "use strict";

    $(function() {
        var DEBUG = 0;
        var PLUGIN_ID;
        var API_BASE_PATH;

        var IF_MODIFIED_SINCE = "Thu, 01 Jun 1970 00:00:00 GMT";
        
        if (DEBUG) {
            PLUGIN_ID = 'kpebgfdkfoaojokponjncnmcdlgeabck';
            API_BASE_PATH = 'https://localetest.kintoneapp.com/';
        } else {
            PLUGIN_ID = 'mddhpfmiepehgchogoffiaaibbhimlfm';
            API_BASE_PATH = 'https://print.kintoneapp.com/';
        }
        
        var terms = {
            'en':{
                'submit': 'Output',
                'no_sheet': 'No invoice to be output',
                'bulk_request_failed': 'An error occurred while sending the request of batch PDF output.',
                'error': 'Error: ',
                'invalid_email': 'Your e-mail address has not been registered to your kintone account.',
                'toomany_records': 'The total number of records to be output exceeds the maximum limit of 500. Change the criteria to reduce it.',
                'send_confirm': 'Are you sure to output invoices in batch?'
            },
            'ja':{
                'submit': '出力',
                'no_sheet': '帳票がありません',
                'bulk_request_failed': '一括出力のリクエスト送信時にエラーが発生しました。',
                'error': 'エラー: ',
                'invalid_email': 'メールアドレスが登録されていません。',
                'toomany_records': '対象となるレコードの件数が500件未満になるように、検索条件を変更してください。',
                'send_confirm': '一括で帳票を出力します。よろしいですか？'
            }
        };
        var config_;
        
        var lang = kintone.getLoginUser().language;
        var i18n = (lang in terms) ? terms[lang]: terms['en'];

        var getStaticUrl = function() {
            var url = window.location.protocol + '//';
            var host = window.location.host.replace(/^.+?\./, 'static.');
            url += host + '/contents/k/plugin/';
            return url;
        };
        
        var getGuestSpacePath = function() {
            return location.pathname.match(/^\/k\/(guest\/\d+\/)/);
        };
        
        var validateConfig = function(record) {
            try {
                config_ = kintone.plugin.app.getConfig(PLUGIN_ID);
            } catch (x) {
                return false;
            }
            if (!config_) return false;

            if (!config_['appCode']) {
                console.log('required field is empty');
                return false;
            }
            
            return true;
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

        var checkRecordCount = function(maxCount) {
            var d = new $.Deferred;
            var appId = kintone.app.getId();
            var query = kintone.app.getQueryCondition();
            //kintone.api('/k/v1/records', 'GET', {
            $.ajax({
                url: kintone.api.url('/k/v1/records', true),
                type: 'GET',
                headers: {
                    "If-Modified-Since": IF_MODIFIED_SINCE
                },
                data: {
                    app: appId,
                    query: query + (" limit 1 offset " + maxCount)
                }
            }).done( function(e) { 
                d.resolve(e.records.length > 0);
            });

            return d.promise();
        };

        var createForm = function(sheets, submitHandler) {
            var $code, $container, $dat, $form, $op, $select, $submit, sheet, updateAction;
            $container = $('<div id="pcreatorPlugin-container" class="pcreatorPlugin-desktop-container"></div>');
            $select = $('<select id="pcreatorPlugin-sheets" class="pcreatorPlugin-desktop-sheets-select"></select>');
            $form = $('<form id="pcreatorPlugin-form" method="POST" target="_blank"></form>');
            $dat = $('<input id="pcreatorPlugin-record" type="hidden" name="record" value=""/>');
            $code = $('<input type="hidden" name="code" value=""/>');
            $code.val(config_.appCode);
            $submit = $('<input class="pcreatorPlugin-desktop-button" id="pcreatorPlugin-button" type="submit"/>');
            $submit.val(i18n.submit);
            $dat.appendTo($form);
            $code.appendTo($form);
            $submit.appendTo($form);
            $select.appendTo($container);
            $form.appendTo($container);
            var i, len;
            for (i = 0, len = sheets.length; i < len; i++) {
                sheet = sheets[i];
                $op = $('<option></option>');
                $op.val(sheet.id);
                $op.text(sheet.title);
                $select.append($op);
                $select.removeAttr("disabled");
                $submit.removeAttr("disabled");
            }
            if (sheets.length === 0) {
                $op = $('<option value=""></option>');
                $op.text(i18n.no_sheet);
                $select.append($op);
                $select.attr({
                    disabled: "disabled"
                });
                $submit.attr({
                    disabled: "disabled"
                });
            }
            $form.submit(submitHandler);
            return $container;
        };
        var createIndexDom = function(sheets) {
            
            var $form = createForm(sheets, function() {
                var DISABLED = "pcreatorPlugin-desktop-button-disabled";
                var $button = $('#pcreatorPlugin-button');
                if ($button.hasClass(DISABLED)) {
                    return false;
                }
                $button.addClass(DISABLED);
                
                var data, record, user;
                user = kintone.getLoginUser();
                record = {};
                var $select = $('#pcreatorPlugin-sheets');
                record.user = user;
                record.query = kintone.app.getQuery().replace(/limit ([0-9]+)/, 'limit 500').replace(/offset ([0-9]+)/, 'offset 0');
                record.ledgerSheetId = $select.val();
                data = JSON.stringify(record);
                $('#pcreatorPlugin-record').val(data);
                if (!user.email) {
                    alert(i18n.invalid_email);
                    $button.removeClass(DISABLED);
                } else {
                    checkRecordCount(500).then(function(toomanyRecords) {
                        if (toomanyRecords) {
                            alert(i18n.toomany_records);
                            $button.removeClass(DISABLED);
                        } else if (confirm(i18n.send_confirm)) {
                            api('api/v1/pack-pdf/', 'GET', {'data': data, 'appCode': config_.appCode}, function(body, status, header) {
                                try {
                                    var json = $.parseJSON(body);
                                    if (json.error) {
                                        alert(i18n.bulk_request_failed + '\n' + i18n.error + json.error.message); 
                                    } else {
                                        alert(json.message);
                                    }
                                } catch(e) {
                                    alert(i18n.bulk_request_failed);
                                }
                                $button.removeClass(DISABLED);
                            }, function(body) {
                                var message;
                                try {
                                    var json = $.parseJSON(body);
                                    if (json.error) {
                                        message = json.error.message;
                                    }
                                } catch(e) {
                                }
                                if (message) {
                                    alert(i18n.bulk_request_failed + '\n' + i18n.error + message);                                    
                                } else {
                                    alert(i18n.bulk_request_failed);
                                }
                                $button.removeClass(DISABLED);
                            });
                        } else {
                            $button.removeClass(DISABLED);
                        }
                    });
                }
                return false;
            });
            return $form;
        };
        var createDetailDom = function(sheets) {
            
            var updateAction = function() {
                var sid, url;
                var $select = $('#pcreatorPlugin-sheets');
                var $form = $('#pcreatorPlugin-form');
                sid = $select.val();
                url = API_BASE_PATH + "sheet/" + sid + "/output?appCode=" + config_.appCode;
                return $form.attr('action', url);
            };
            var $form = createForm(sheets, function() {
                var data, record, recordId, user;
                updateAction();
                recordId = kintone.app.record.getId();
                user = kintone.getLoginUser();
                record = kintone.app.record.get() || {
                    record: []
                };
                record.recordId = recordId;
                record.user = user;
                data = JSON.stringify(record);
                return $('#pcreatorPlugin-record').val(data);
            });
            return $form;
        };
        var recordDetailShowHandler = function(e) {
            if (!validateConfig(e.record)) {
                return e;
            }
            
            if (getGuestSpacePath() || kintone.getLoginUser().isGuest) {
                return e;
            }
            
            if ($("#pcreatorPlugin-container").length > 0) {
                return e;
            }
            
            api('api/v1/ext-sheets', 'GET', {'appCode': config_.appCode}, function(body, status, header) {
                try {
                    var json = $.parseJSON(body);
                    
                    var $elm = createDetailDom(json);
                    var $header = $(kintone.app.record.getHeaderMenuSpaceElement());
                    $header.append($elm);
                } catch(e) {
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
                if (message) {
                    var $header = $(kintone.app.record.getHeaderMenuSpaceElement());
                    var $msg = $('<span class="pcreatorPlugin-desktop-errorMessage"></span>');
                    $msg.text(message);
                    $header.append($msg);
                }
            });
            
            return e;
        };
        
        kintone.events.on('app.record.detail.show', function(e) {
            return recordDetailShowHandler(e);
        });

        var recordIndexShowHandler = function(e) {
            if (!validateConfig(e.record)) {
                return e;
            }
            
            if (getGuestSpacePath() || kintone.getLoginUser().isGuest) {
                return e;
            }
            
            if ($("#pcreatorPlugin-container").length > 0) {
                return e;
            }
            
            api('api/v1/ext-sheets', 'GET', {'appCode': config_.appCode, 'isIndex': 1}, function(body, status, header) {
                try {
                    var json = $.parseJSON(body);
                    var $elm = createIndexDom(json);
                    var $header = $(kintone.app.getHeaderMenuSpaceElement());
                    $header.append($elm);
                } catch(e) {
                }
            });
            
            return e;
        };
        
        kintone.events.on('app.record.index.show', function(e) {
            return recordIndexShowHandler(e);
        });

    });
})(jQuery);
