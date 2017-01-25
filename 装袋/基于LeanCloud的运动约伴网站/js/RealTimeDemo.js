/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * @author wangxiao
 * @date 2015-05-19
 * @homepage http://github.com/leancloud/js-realtime-sdk/
 *
 * ÿλ����ʦ���б��ִ������ŵ�����
 * Each engineer has a duty to keep the code elegant
 */

void function(win) {

    // ��ǰ�汾
    var VERSION = '2.1.0';

    // ��ȡ�����ռ�
    var AV = win.AV || {};
    win.AV = AV;

    // AMD ����֧��
    if (typeof define === 'function' && define.amd) {
        define('AV', [], function() {
            return AV;
        });
    }

    // ������
    var config = {
        // ����ʱ�䣨һ���ӣ�
        heartbeatsTime: 60 * 1000
    };

    // �����ռ䣬����һЩ���߷���
    var tool = {};

    // �����ռ䣬����˽�з���
    var engine = {};

    // realtime �����ڣ��ᱻ�ɷ���ȫ���¼���
    var eNameIndex = {
        // session ���ӽ������
        open: 'open',
        // �Ͽ�����
        reuse: 'reuse',
        // websocket ���ӹر�
        close: 'close',
        // �½�һ�� conversation ʱ�ɷ�
        create: 'create',
        // conversation �����ӳ�Ա
        join: 'join',
        // conversation ��Ա�뿪
        left: 'left',
        // conversation �ڷ��͵�����
        message: 'message',
        // conversation ��Ϣ��ִ
        receipt: 'receipt',
        // conversation ����
        update: 'update',
        // ���ִ���
        error: 'error'
    };

    // ���� conversation ���󣬹������� conversation ��ط�����ÿ�ε���ʵ����
    var newConvObject = function(cache) {

        var addOrRemove = function(cid, argument, callback, cmd) {
            var members = [];
            var options;
            var fun;
            var eventName;

            // ���� userId
            if (typeof argument === 'string') {
                members.push(argument);
            }
            // ������ userId
            else {
                members = argument;
            }
            options = {
                cid: cid,
                members: members,
                serialId: engine.getSerialId()
            };
            switch (cmd) {
                case 'add':
                    eventName = 'conv-added';
                    engine.convAdd(options);
                    break;
                case 'remove':
                    eventName = 'conv-removed';
                    engine.convRemove(options);
                    break;
            }
            fun = function(data) {
                if (data.i === options.serialId) {
                    if (callback) {
                        callback(data);
                    }
                    cache.ec.off(eventName, fun);
                }
            };
            cache.ec.on(eventName, fun);
            return this;
        };

        return {
            // cid �� conversation id
            id: '',
            // ���� Conversation ʱ��Ĭ������
            attr: {},
            add: function(argument, callback) {
                addOrRemove(this.id, argument, callback, 'add');
                return this;
            },
            remove: function(argument, callback) {
                addOrRemove(this.id, argument, callback, 'remove');
                return this;
            },
            // �Լ�����
            join: function(callback) {
                this.add(cache.options.peerId, callback);
                return this;
            },
            // �Լ��뿪
            leave: function(callback) {
                this.remove(cache.options.peerId, callback);
                return this;
            },
            send: function(data, argument1, argument2) {
                var callback;
                var options = {};
                var me = this;
                switch (arguments.length) {
                    // ֻ����������ʱ���ڶ����ǻص�����
                    case 2:
                        callback = argument1;
                        break;
                        // ��������ʱ���ڶ�������������������������ǻص�
                    case 3:
                        options = argument1;
                        callback = argument2;
                        break;
                }
                options.cid = me.id;
                options.serialId = engine.getSerialId();

                // ��� type ���ڣ����Ͷ�ý���ʽ
                if (options.type) {
                    options.data = engine.setMediaMsg(options.type, data);
                } else {
                    if (typeof data === 'string') {
                        options.data = data;
                    } else {
                        // Э����ֻ���� string ����
                        options.data = JSON.stringify(data);
                    }
                }

                // �Ƿ���Ҫ��Ϣ��ִ
                if (options.receipt) {
                    options.receipt = 1;
                }

                // �������̬��Ϣ������ص���������Ҳ���᷵�ػص�
                if (!options.transient) {
                    var fun = function(data) {
                        if (data.i === options.serialId) {
                            if (callback) {
                                callback(data);
                            }
                            cache.ec.off('ack', fun);
                        }
                    };
                    cache.ec.on('ack', fun);
                }
                engine.send(options, callback);
                return this;
            },
            log: function(argument, callback) {
                var options = {};
                switch (arguments.length) {
                    // ���ֻ��һ����������ô�� callback
                    case 1:
                        callback = argument;
                        break;
                    case 2:
                        options = argument;
                        break;
                }
                options.cid = options.cid || this.id;
                options.serialId = options.serialId || engine.getSerialId();
                var fun = function(data) {
                    if (data.i === options.serialId) {
                        if (callback) {
                            // �Բ�������ͽ��й��ˣ����ݶ��ͨ��
                            for (var i = 0, l = data.logs.length; i < l; i++) {
                                data.logs[i].data = engine.getMediaMsg(data.logs[i].data);
                                // �����ֶΣ����ݽ�����Ϣ���ֶ�
                                data.logs[i].fromPeerId = data.logs[i].from;
                                data.logs[i].msg = data.logs[i].data;
                            }
                            callback(data.logs);
                        }
                        cache.ec.off('logs', fun);
                    }
                };
                cache.ec.on('logs', fun);

                // ע�����̻�ȡ��Ϣ��ʷ�п���ȡ����
                engine.convLog(options);
                return this;
            },
            receive: function(callback) {
                var id = this.id;
                cache.ec.on(eNameIndex.message, function(data) {
                    // �Ƿ��ǵ�ǰ room ����Ϣ
                    if (id === data.cid) {
                        callback(data);
                    }
                });
                return this;
            },
            // ��ȡ��Ϣ��ִ
            receipt: function(callback) {
                var id = this.id;
                cache.ec.on(eNameIndex.receipt, function(data) {
                    // �Ƿ��ǵ�ǰ room ����Ϣ
                    if (id === data.cid) {
                        callback(data);
                    }
                });
                return this;
            },
            list: function(callback) {
                var options = {};
                var id = this.id;
                options.where = {
                    m: cache.options.peerId,
                    objectId: id
                };
                options.serialId = engine.getSerialId();
                var fun = function(data) {
                    if (data.i === options.serialId) {
                        if (callback) {
                            if (data.results.length) {
                                // ��Ϊ�ǲ�ѯ�̶��� cid�����Խ��ֻ��һ����
                                callback(data.results[0].m);
                            }
                            else {
                                callback([]);
                            }
                        }
                        cache.ec.off('conv-results', fun);
                    }
                };
                cache.ec.on('conv-results', fun);
                engine.convQuery(options);
                return this;
            },
            count: function(callback) {
                var id = this.id;
                var options = {
                    cid: id,
                    serialId: engine.getSerialId()
                };
                var fun = function(data) {
                    if (data.i === options.serialId) {
                        if (callback) {
                            callback(data.count);
                        }
                        cache.ec.off('conv-result', fun);
                    }
                };
                cache.ec.on('conv-result', fun);
                engine.convCount(options);
                return this;
            },
            update: function(data, callback) {
                var id = this.id;
                var options = {
                    cid: id,
                    data: data,
                    serialId: engine.getSerialId()
                };
                var fun = function(data) {
                    if (data.i === options.serialId) {
                        if (callback) {
                            callback(data);
                        }
                        cache.ec.off('conv-updated', fun);
                    }
                };
                cache.ec.on('conv-updated', fun);
                engine.convUpdate(options);
                return this;
            }
        };
    };

    // ����һ���µ� realtime ���󣬹������� realtime �еķ�����ÿ�ε���ʵ����һ��ʵ����֧�ֵ�ҳ��ʵ����
    var newRealtimeObject = function() {

        // ����һЩ�Ѿ�ʵ�����ı���
        var cache = {
            // �������ã����� appId��peerId ��
            options: undefined,
            // WebSocket ʵ��
            ws: undefined,
            // �¼�����
            ec: undefined,
            // ���������ɵ� conversation ���󣨻���Ҳ��û��ʹ�ã���ʱȥ����
            // convIndex: {},
            // �Ƿ��Ѿ� open ��ϣ���Ҫ�� close �����м��
            openFlag: false,
            // �Ƿ����û��رգ�������ǽ���Ͽ�����
            closeFlag: false,
            // reuse �¼������� timer
            reuseTimer: undefined,
            // resuse ״̬�����Ϊ true ��ʾ�ڲ��Ѿ���������
            resuseFlag: false,
            // ��ǰ�� serialId
            serialId: 2015
        };

        // WebSocket Open
        var wsOpen = function() {
            engine.bindEvent();
            engine.openSession({
                serialId: engine.getSerialId()
            });
            // ��������
            engine.heartbeats();
            // �����ػ�����
            engine.guard();
        };

        // WebSocket Close
        var wsClose = function(event) {
            // �ɷ�ȫ�� close �¼�����ʾ realtime �Ѿ��ر�
            cache.ec.emit(eNameIndex.close, event);
        };

        // WebSocket Message
        var wsMessage = function(msg) {
            var data = JSON.parse(msg.data);

            // �Է���˷��ص����ݽ����߼���װ
            if (data.cmd) {
                var eventName = data.cmd;
                if (data.op) {
                    eventName += '-' + data.op;
                }
                cache.ec.emit(eventName, data);
            }
        };

        var wsError = function(data) {
            cache.ec.emit(eNameIndex.error, data);
            throw(data);
        };

        // WebSocket send message
        var wsSend = function(data) {
            if (!cache.closeFlag) {
                if (!cache.ws) {
                    throw('The realtimeObject must opened first. Please listening to the "open" event.');
                }
                else {
                    cache.ws.send(JSON.stringify(data));
                }
            }
        };

        engine.createSocket = function(server) {
            if (cache.ws) {
                cache.ws.close();
            }
            var ws = new WebSocket(server);
            cache.ws = ws;
            ws.addEventListener('open', wsOpen);
            ws.addEventListener('close', wsClose);
            ws.addEventListener('message', wsMessage);
            ws.addEventListener('error', wsError);
        };

        // ��������
        engine.heartbeats = function() {
            var timer;
            cache.ws.addEventListener('message', function() {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function() {
                    wsSend({});
                }, config.heartbeatsTime);
            });

            // ��ֹ���ʵ����
            engine.heartbeats = tool.noop;
        };

        // �ػ����̣����ɷ� reuse �����¼�
        engine.guard = function() {

            // ��ʱ��������
            var timeLength = 3 * 60 * 1000;
            var timer;

            // ��������¼��������ʱ��û���յ���������������ҲҪ������������
            cache.ws.addEventListener('message', function() {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function() {
                    if (!cache.closeFlag && !cache.resuseFlag) {
                        cache.resuseFlag = true;
                        // ��ʱ���ɷ������¼�
                        cache.ec.emit(eNameIndex.reuse);
                    }
                }, timeLength);
            });

            // ���Ͽ��¼�
            cache.ec.on(eNameIndex.close + ' ' + 'session-closed', function() {
                if (!cache.closeFlag && !cache.resuseFlag) {
                    cache.resuseFlag = true;
                    cache.ec.emit(eNameIndex.reuse);
                }
            });

            // ��ֹ���ʵ����
            engine.guard = tool.noop;
        };

        engine.connect = function(options) {
            var server = options.server;
            if (server && tool.now() < server.expires) {
                engine.createSocket(server.server);
            }
            else {
                throw('WebSocket connet failed.');
            }
        };

        engine.getServer = function(options, callback) {
            var appId = options.appId;
            // �Ƿ��ȡ wss �İ�ȫ����
            var secure = options.secure;
            var url = '';
            var protocol = 'http://';
            if (win && win.location.protocol === 'https:' && secure) {
                protocol = 'https://';
            }
            url = protocol + 'router-g0-push.avoscloud.com/v1/route?_t=' + tool.now() + '&appId=' + appId;
            if (secure) {
                url += '&secure=1';
            }
            tool.ajax({
                url: url,
                form: true
            }, function(data, error) {
                if (data) {
                    data.expires = tool.now() + data.ttl * 1000;
                    cache.server = data;
                    callback(data);
                }
                else {
                    if (error.code === 403 || error.code === 404) {
                        throw(error.error);
                    }
                    else {
                        cache.ec.emit(eNameIndex.error);
                    }
                }
            });
        };

        // �� session
        engine.openSession = function(options) {
            var cmd = {
                cmd: 'session',
                op: 'open',
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                ua: 'js/' + VERSION,
                i: options.serialId
            };
            if (cache.authFun) {
                cache.authFun({
                    clientId: cache.options.peerId
                }, function(authResult) {
                    if (authResult && authResult.signature) {
                        cmd.n = authResult.nonce;
                        cmd.t = authResult.timestamp;
                        cmd.s = authResult.signature;
                        wsSend(cmd);
                    } else {
                        throw('Session open denied by application: ' + authResult);
                    }
                });
            } else {
                wsSend(cmd);
            }
        };

        engine.closeSession = function() {
            wsSend({
                cmd: 'session',
                op: 'close',
                peerId: cache.options.peerId
                        // ASK: ����ò��� appId
                        // appId: cache.options.appId
            });
        };

        engine.startConv = function(options) {
            var cmd = {
                cmd: 'conv',
                op: 'start',
                // m [] ��ʼ�ĶԻ��û�id�б�������Ĭ�ϻ���Լ�����
                m: options.members,
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                // attr json���󣬶Ի��������ʼ����
                attr: {
                    name: options.name || '',
                    attr: options.attr || {}
                },
                i: options.serialId,
                // �Ƿ��ǿ��������ң�����������
                transient: options.transient || false
            };
            if (cache.authFun) {
                cache.authFun({
                    clientId: cache.options.peerId,
                    members: options.members
                }, function(authResult) {
                    if (authResult && authResult.signature) {
                        cmd.n = authResult.nonce;
                        cmd.t = authResult.timestamp;
                        cmd.s = authResult.signature;
                        wsSend(cmd);
                    } else {
                        throw('Conversation creation denied by application: ' + authResult);
                    }
                });
            } else {
                wsSend(cmd);
            }
        };

        engine.convAdd = function(options) {
            var cmd = {
                cmd: 'conv',
                op: 'add',
                cid: options.cid,
                m: options.members,
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                i: options.serialId
            };
            if (cache.authFun) {
                cache.authFun({
                    clientId: cache.options.peerId,
                    members: options.members,
                    convId: options.cid,
                    action: 'invite'
                }, function(authResult) {
                    if (authResult && authResult.signature) {
                        cmd.n = authResult.nonce;
                        cmd.t = authResult.timestamp;
                        cmd.s = authResult.signature;
                        wsSend(cmd);
                    } else {
                        throw('Adding members to conversation denied by application: ' + authResult);
                    }
                });
            } else {
                wsSend(cmd);
            }
        };

        engine.convRemove = function(options) {
            var cmd = {
                cmd: 'conv',
                op: 'remove',
                cid: options.cid,
                m: options.members,
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                i: options.serialId
            };
            if (cache.authFun && (options.members.length > 1 || options.members[0] != cache.options.peerId)) {
                cache.authFun({
                    clientId: cache.options.peerId,
                    members: options.members,
                    convId: options.cid,
                    action: 'kick'
                }, function(authResult) {
                    if (authResult && authResult.signature) {
                        cmd.n = authResult.nonce;
                        cmd.t = authResult.timestamp;
                        cmd.s = authResult.signature;
                        wsSend(cmd);
                    } else {
                        throw('Removing members from conversation denied by application: ' + authResult);
                    }
                });
            } else {
                wsSend(cmd);
            }
        };

        engine.send = function(options) {
            wsSend({
                cmd: 'direct',
                cid: options.cid,
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                msg: options.data,
                i: options.serialId,
                // r �Ƿ���Ҫ��ִ��Ҫ��1�����򲻴�
                r: options.receipt || false,
                // transient �Ƿ���̬��Ϣ����̬��Ϣ������ ack��������������Ϣ���������� �����ͣ������򲻴�
                transient: options.transient || false
            });
        };

        engine.convQuery = function(options) {
            options = options || {};
            wsSend({
                cmd: 'conv',
                op: 'query',
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                // where ��ѡ������Ĭ��Ϊ�����Լ��Ĳ�ѯ {"m": peerId}
                where: options.where || {
                    m: cache.options.peerId
                            // conversation �� id
                            // objectId: options.cid
                },
                // sort ��ѡ���ַ�����Ĭ��Ϊ -lm������Ի�����
                sort: options.sort || '-lm',
                // limit ��ѡ�����֣�Ĭ��10
                limit: options.limit || 10,
                // skip ��ѡ�����֣�Ĭ��0
                skip: options.skip || 0,
                // i serial-id
                i: options.serialId
            });
        };

        // ��ѯ session �������
        engine.querySession = function(options) {
            wsSend({
                cmd: 'session',
                op: 'query',
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                i: options.serialId,
                sessionPeerIds: options.peerIdList
            });
        };

        // ��ѯ conversation �������¼
        engine.convLog = function(options) {
            wsSend({
                cmd: 'logs',
                cid: options.cid,
                // t ʱ������� t ��ʼ��ǰ��ѯ
                t: options.t || undefined,
                // mid ��Ϣ id������Ϣ id ��ʼ��ǰ��ѯ���� t ��ͬʹ�ã�Ϊ��ֹĳ����ʱ�����ظ���Ϣ��
                mid: options.mid || undefined,
                limit: options.limit || 20,
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                // i serial-id
                i: options.serialId
            });
        };

        engine.convUpdate = function(options) {
            wsSend({
                cmd: 'conv',
                op: 'update',
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                cid: options.cid,
                // attr Ҫ�޸ĵ�����
                attr: options.data,
                i: options.serialId
            });
        };

        engine.convAck = function(options) {
            wsSend({
                cmd: 'ack',
                cid: options.cid,
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                mid: options.mid
            });
        };

        engine.convCount = function(options) {
            wsSend({
                cmd: 'conv',
                op: 'count',
                appId: cache.options.appId,
                peerId: cache.options.peerId,
                i: options.serialId,
                cid: options.cid
            });
        };

        // ȡ����ý�����͵ĸ�ʽ������ HTML ת���߼���
        engine.getMediaMsg = function(msg) {

            // ����Ƿ��� JSON ��ʽ��һ�� String ����
            if (!tool.isJSONString(msg)) {

                // �Ƿ����Ϣ�е� HTML ����ת��
                if (cache.options.encodeHTML) {
                    msg = tool.encodeHTML(msg);
                }
                return msg;
            }

            msg = JSON.parse(msg);

            // ����Ƿ��Ƕ�ý������
            if (!msg.hasOwnProperty('_lctype')) {
                return msg;
            }

            var obj = {
                text: msg._lctext,
                attr: msg._lcattrs
            };

            // �Ƿ����Ϣ�е� HTML ����ת�壬��ý���ʽ���� text ת��
            if (cache.options.encodeHTML) {
                obj.text = tool.encodeHTML(msg._lctext);
            }

            if (msg._lcfile && msg._lcfile.url) {
                obj.url = msg._lcfile.url;
            }
            if (msg._lcfile && msg._lcfile.metaData) {
                obj.metaData = msg._lcfile.metaData;
            }

            // ��ý������
            switch (msg._lctype) {
                case -1:
                    obj.type = 'text';
                    break;
                case -2:
                    obj.type = 'image';
                    break;
                case -3:
                    obj.type = 'audio';
                    break;
                case -4:
                    obj.type = 'video';
                    break;
                case -5:
                    obj.type = 'location';
                    break;
                case -6:
                    obj.type = 'file';
                    break;
            }
            return obj;
        };

        // ���ɶ�ý���ض���ʽ������
        engine.setMediaMsg = function(type, data) {
            var obj;
            if (type !== 'text' && !data.metaData) {
                throw('Media Data must have metaData attribute.');
            }
            switch (type) {
                case 'text':
                    obj = {
                        _lctype: -1,
                        _lctext: data.text,
                        // _lcattrs �������洢�û��Զ����һЩ��ֵ��
                        _lcattrs: data.attr
                    };
                    break;
                case 'image':
                    obj = {
                        _lctype: -2,
                        _lctext: data.text,
                        // _lcattrs �������洢�û��Զ����һЩ��ֵ��
                        _lcattrs: data.attr,
                        _lcfile: {
                            url: data.url,
                            objId: data.objectId,
                            metaData: {
                                name: data.metaData.name,
                                // ��ʽ
                                format: data.metaData.format,
                                //��λ������
                                height: data.metaData.height,
                                //��λ������
                                width: data.metaData.width,
                                //��λ��b
                                size: data.metaData.size
                            }
                        }
                    };
                    break;
                case 'audio':
                    obj = {
                        _lctype: -3,
                        _lctext: data.text,
                        // _lcattrs �������洢�û��Զ����һЩ��ֵ��
                        _lcattrs: data.attr,
                        _lcfile: {
                            url: data.url,
                            objId: data.objectId,
                            metaData: {
                                name: data.metaData.name,
                                // ý���ʽ
                                format: data.metaData.format,
                                //��λ����
                                duration: data.metaData.duration,
                                //��λ��b
                                size: data.metaData.size
                            }
                        }
                    };
                    break;
                case 'video':
                    obj = {
                        _lctype: -4,
                        _lctext: data.text,
                        // _lcattrs �������洢�û��Զ����һЩ��ֵ��
                        _lcattrs: data.attr,
                        _lcfile: {
                            url: data.url,
                            objId: data.objectId,
                            metaData: {
                                name: data.metaData.name,
                                // ý���ʽ
                                format: data.metaData.format,
                                // ��λ����
                                duration: data.metaData.duration,
                                //��λ��b
                                size: data.metaData.size
                            }
                        }
                    };
                    break;
                case 'location':
                    obj = {
                        _lctype: -5,
                        _lctext: data.text,
                        // _lcattrs �������洢�û��Զ����һЩ��ֵ��
                        _lcattrs: data.attr,
                        _lcloc: {
                            // ����
                            longitude: data.metaData.longitude,
                            // ά��
                            latitude: data.metaData.latitude
                        }
                    };
                    break;
                case 'file':
                    obj = {
                        _lctype: -6,
                        _lctext: data.text,
                        // _lcattrs �������洢�û��Զ����һЩ��ֵ��
                        _lcattrs: data.attr,
                        _lcfile: {
                            name: data.metaData.name,
                            // ��λ��b
                            size: data.metaData.size
                        }
                    };
                    break;
            }
            obj = JSON.stringify(obj);
            return obj;
        };

        // ȡ������ number ����
        engine.getSerialId = function() {
            cache.serialId++;
            if (cache.serialId > 999999) {
                cache.serialId = 2015;
            }
            return cache.serialId;
        };

        // �����з��񷵻��¼�
        engine.bindEvent = function() {
            cache.ec.on('session-opened', function(data) {
                // �������״̬Ϊ false����ʾû��������
                cache.resuseFlag = false;
                cache.openFlag = true;
                // �ɷ�ȫ�� open �¼�����ʾ realtime �Ѿ�����
                cache.ec.emit(eNameIndex.open, data);
            });
            // cache.ec.on('session-closed', function() {
            // session ���رգ���رյ�ǰ websocket ����
            // });

            // ��ѯ session �������
            // cache.ec.on('session-query-result', function() {});

            cache.ec.on('session-error', function(data) {
                cache.ec.emit(eNameIndex.error, data);
            });

            // ��������ȷ���յ� conversation �������������ɹ�
            // �ڴ���ʱ�Ѿ����󶨣�����ע�͵�
            // cache.ec.on('conv-started', function(data) {});

            // �������˷����ͻ��ˣ���ʾ��ǰ�û�������ĳ���Ի������������Ի��������Ի�
            cache.ec.on('conv-joined', function(data) {
                // ���ǵ�ǰ�û��Լ�����
                if (data.peerId !== data.initBy) {
                    cache.ec.emit(eNameIndex.join, data);
                }
            });

            // �������˷����ͻ��ˣ���ʾ��ǰ�û��뿪��ĳ���Ի����������յ��Ի�����Ϣ
            cache.ec.on('conv-left', function(data) {
                cache.ec.emit(eNameIndex.left, data);
            });

            // �������˷����ͻ��ˣ���ʾ��ǰ�Ի������˼���
            cache.ec.on('conv-members-joined', function(data) {
                cache.ec.emit(eNameIndex.join, data);
            });

            // �������˷����ͻ��ˣ���ʾ��ǰ�Ի��������뿪
            cache.ec.on('conv-members-left', function(data) {
                cache.ec.emit(eNameIndex.left, data);
            });

            // �������˻ظ�����ʾ add �������
            // ��Ϊ added ֮��Ҳ�ᴥ�� members-joined������ע�͵�
            // cache.ec.on('conv-added', function(data) {});

            // ��������ȷ��ɾ���ɹ�
            // ��Ϊ removed ֮��Ҳ�ᴥ�� members-removed������ע�͵�
            // cache.ec.on('conv-removed', function() {});

            cache.ec.on('conv-error', function(data) {
                cache.ec.emit(eNameIndex.error, data);
                throw(data.code + ':' + data.reason);
            });

            // ��ѯ�Ի��Ľ��
            // cache.ec.on('conv-results', function(data) {});

            // cache.ec.on('conv-updated', function(data) {});

            cache.ec.on('direct', function(data) {

                // ���Ӷ�ý����Ϣ�����ݸ�ʽ��
                data.msg = engine.getMediaMsg(data.msg);

                // �յ���Ϣ�����̸�֪������
                engine.convAck({
                    cid: data.cid,
                    mid: data.id
                });

                cache.ec.emit(eNameIndex.message, data);
            });

            // ��Ҫ���ִ����Ϣ���������˻��ڶԷ��ͻ��˷���ack���ͻ�ִ
            cache.ec.on('rcp', function(data) {
                cache.ec.emit(eNameIndex.receipt, data);
            });

            // cache.ec.on('ack', function(data) {});

            // �û����Ի�ȡ�Լ����ڶԻ�����ʷ��¼
            // cache.ec.on('logs', function(data) {});

            // ��� bindEvent����ֹ�¼��ظ���
            engine.bindEvent = tool.noop;
        };

        return {
            cache: cache,
            open: function(callback) {
                var me = this;
                cache.closeFlag = false;
                engine.getServer(cache.options, function(data) {
                    if (data) {
                        engine.connect({
                            server: cache.server
                        });
                    }
                });
                if (callback) {
                    cache.ec.once(eNameIndex.open, callback);
                }
                // �Ͽ�����
                cache.ec.once(eNameIndex.reuse, function() {
                    if (cache.reuseTimer) {
                        clearTimeout(cache.reuseTimer);
                    }
                    cache.reuseTimer = setTimeout(function() {
                        me.open();
                    }, 5000);
                });
                return this;
            },
            // ��ʾ�رյ�ǰ�� session ���Ӻ� WebSocket ���ӣ����һ����ڴ�
            close: function() {
                if (!cache.openFlag) {
                    throw('Must call after open() has successed.');
                }
                cache.closeFlag = true;
                engine.closeSession();
                cache.ws.close();
                return this;
            },
            on: function(eventName, callback) {
                this.cache.ec.on(eventName, callback);
                return this;
            },
            once: function(eventName, callback) {
                this.cache.ec.once(eventName, callback);
                return this;
            },
            emit: function(eventName, data) {
                this.cache.ec.emit(eventName, data);
                return this;
            },
            off: function(eventName, callback) {
                this.cache.ec.off(eventName, callback);
                return this;
            },
            room: function(argument, callback) {
                if (!cache.openFlag) {
                    throw('Must call after open() has successed.');
                }
                var convObject = newConvObject(cache);
                // ���� convId
                if (typeof argument === 'string') {
                    // cache.convIndex[convObject.id] = convObject;

                    // ȥ���������ж��µ�ǰ room id �Ƿ����
                    this.query({
                        where: {
                            objectId: argument
                        }
                    }, function(data) {

                        // ���������������� id
                        if (data.length) {
                            convObject.id = argument;
                            convObject.name = data[0].name;
                            // ��ȡ��ʼ��ʱ������
                            convObject.attr = data[0].attr;
                        }

                        if (callback) {
                            // ����������˴��ھ�ֱ�ӷ��� roomObject
                            if (data.length) {
                                callback(convObject);
                            }
                            // ����������˲�������� room id
                            else {
                                callback(null);
                            }
                        }
                    });
                }
                // ���� options
                else {
                    // ���û�д�����������һ��������ʾ
                    if (!argument) {
                        throw('Createing room must have a callback function.');
                    }

                    var options;

                    // ֻ���� callback
                    if (typeof argument === 'function') {
                        callback = argument;
                    }
                    // �������
                    else {
                        options = argument;
                    }

                    options = {
                        // Room ������
                        name: options.name || '',
                        // ��Ա�� id list
                        members: options.members || [],
                        // Ĭ�ϵ����ݣ����Է� Conversation ���ֵ�
                        attr: options.attr || {},
                        transient: options.transient || false,
                        serialId: engine.getSerialId()
                    };

                    engine.startConv(options, callback);

                    // ��������ȷ���յ��Ի��������������ɹ�
                    var fun = function(data) {
                        if (data.i === options.serialId) {
                            convObject.id = data.cid;
                            convObject.name = options.name;
                            convObject.attr = options.attr;
                            // cache.convIndex[convObject.id] = convObject;
                            if (callback) {
                                callback(convObject);
                            }
                            cache.ec.emit(eNameIndex.create, data);
                            cache.ec.off('conv-started', fun);
                        }
                    };
                    cache.ec.on('conv-started', fun);
                }
                return convObject;
            },
            // conv ���� room �ı���
            conv: function(argument, callback) {
                return this.room(argument, callback);
            },
            // ��ز�ѯ�������û��б��ѯ�������ѯ��
            query: function(argument, callback) {
                if (!cache.openFlag) {
                    throw('Must call after open() has successed.');
                }
                var options = {};
                switch (arguments.length) {
                    // ���ֻ��һ����������ô�� callback
                    case 1:
                        callback = argument;
                        break;
                    case 2:
                        options = argument;
                        break;
                }
                options.serialId = engine.getSerialId();
                var fun = function(data) {
                    if (data.i === options.serialId) {
                        if (callback) {
                            callback(data.results);
                        }
                        cache.ec.off('conv-results', fun);
                    }
                };
                cache.ec.on('conv-results', fun);
                engine.convQuery(options);
                return this;
            },
            // �ж��û��Ƿ�����
            ping: function(argument, callback) {
                if (!cache.openFlag) {
                    throw('Must call after open() has successed.');
                }
                if (!callback) {
                    throw('Ping must have callback.');
                }
                var peerIdList = [];
                // ����һ�� id
                if (typeof (argument) === 'string') {
                    peerIdList.push(argument);
                }
                // �����������
                else {
                    peerIdList = argument;
                }
                var options = {
                    serialId: engine.getSerialId(),
                    peerIdList: peerIdList
                };
                var fun = function(data) {
                    if (data.i === options.serialId) {
                        callback(data.onlineSessionPeerIds);
                        cache.ec.off('session-query-result', fun);
                    }
                };
                cache.ec.on('session-query-result', fun);
                engine.querySession(options);
                return this;
            }
        };
    };

    // ������������ͨ�Ų���� realtimeObject
    AV.realtime = function(options, callback) {
        if (typeof options !== 'object') {
            throw('AV.realtime need a argument at least.');
        }
        else if (!options.appId) {
            throw('Options must have appId.');
        }
        else if (!win.WebSocket) {
            alert('Bowser must support WebSocket, please read LeanCloud doc and use plugin.');
        }
        else {

            // ͨ���жϲ�����еĶ����Ƿ����������Ƿ���Ҫ�ص���ȫ���ӣ�����Ҫ���� flash ��ʱ����Ҫ�ص���Ĭ�Ͽ�����
            var secure = win.WebSocket.loadFlashPolicyFile ? false : true;

            options = {
                // LeanCloud ��Ψһ�ķ��� id
                appId: options.appId,
                // clientId ��Ӧ�ľ��� peerId�������������������Զ����ɣ��ͻ���û�г־û������ݡ�
                peerId: options.clientId,
                // �Ƿ��� HTML ת�壬��ֹ XSS ������Ĭ�Ϲر�
                encodeHTML: options.encodeHTML || false,
                // �Ƿ�������������֤��������֤����
                auth: options.auth,
                // �Ƿ�ر� WebSocket �İ�ȫ���ӣ����� wss Э��תΪ ws Э�飬�ر� SSL ������Ĭ�Ͽ�����
                secure: typeof (options.secure) === 'undefined' ? secure : options.secure
            };

            var realtimeObj = newRealtimeObject();
            realtimeObj.cache.options = options;
            realtimeObj.cache.ec = tool.eventCenter();
            realtimeObj.cache.authFun = options.auth;

            realtimeObj.open(callback);

            return realtimeObj;
        }
    };

    // ��ֵ�汾��
    AV.realtime.version = VERSION;

    // ����˽�з���
    AV.realtime._tool = tool;
    AV.realtime._engine = engine;

    // �պ���
    tool.noop = function() {
    };

    // ��ȡһ��Ψһ id
    tool.getId = function() {
        // ��ʱ����ص��������
        var getIdItem = function() {
            return new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 3);
        };
        return 'AV' + getIdItem();
    };

    // ����Ƿ��� JSON ��ʽ���ַ���
    tool.isJSONString = function(obj) {
        return /^\{.*\}$/.test(obj);
    };

    // Ajax get ����
    tool.ajax = function(options, callback) {
        var url = options.url;
        var method = options.method || 'get';
        var xhr;

        // ��������ݣ�IE8+
        if (window.XDomainRequest) {
            xhr = new XDomainRequest();
        } else {
            xhr = new XMLHttpRequest();
        }

        xhr.open(method, url);

        if (method === 'post') {
            if (options.form) {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            } else {
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
                xhr.setRequestHeader('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept");
                xhr.setRequestHeader('Access-Control-Allow-Methods', "POST, GET, OPTIONS, DELETE, PUT, HEAD");
            }
        }

        xhr.onload = function(data) {
            if ((xhr.status >= 200 && xhr.status < 300) || (window.XDomainRequest && !xhr.status)) {
                callback(JSON.parse(xhr.responseText));
            } else {
                callback(null, JSON.parse(xhr.responseText));
            }
        };

        xhr.onerror = function(data) {
            callback(null, data || {});
            throw('Network error.');
        };

        // IE9 ����Ҫ�������е� xhr �¼��ص�����Ȼ���ܻ��޷�ִ�к�������
        xhr.onprogress = function() {
        };
        xhr.ontimeout = function() {
        };
        xhr.timeout = 0;

        var formData = '';
        if (options.form) {
            for (var k in options.data) {
                if (!formData) {
                    formData += (k + '=' + options.data[k]);
                } else {
                    formData += ('&' + k + '=' + options.data[k]);
                }
            }
        } else {
            formData = JSON.stringify(options.data);
        }

        xhr.send(formData);

    };

    // ��ȡ��ǰʱ���ʱ���
    tool.now = function() {
        return new Date().getTime();
    };

    // HTML ת��
    tool.encodeHTML = function(source) {
        var encodeHTML = function(str) {
            if (typeof (str) === 'string') {
                return str.replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                // ���ǵ������п����� JSON�����Բ��� HTML ǿ���ˣ����Ա�ǩ����
                // .replace(/\\/g,'&#92;')
                // .replace(/"/g,'&quot;')
                // .replace(/'/g,'&#39;');
            }
            // ����
            else {
                return str;
            }
        };

        // ��������
        if (typeof (source) === 'object') {
            for (var key in source) {
                source[key] = tool.encodeHTML(source[key]);
            }
            return source;
        }
        // �Ƕ�������
        else {
            return encodeHTML(source);
        }
    };

    // С�͵�˽���¼�����
    tool.eventCenter = function() {
        var eventList = {};
        var eventOnceList = {};

        var _on = function(eventName, fun, isOnce) {
            if (!eventName) {
                throw('No event name.');
            }
            else if (!fun) {
                throw('No callback function.');
            }
            var list = eventName.split(/\s+/);
            var tempList;
            if (!isOnce) {
                tempList = eventList;
            }
            else {
                tempList = eventOnceList;
            }
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i]) {
                    if (!tempList[list[i]]) {
                        tempList[list[i]] = [];
                    }
                    tempList[list[i]].push(fun);
                }
            }
        };

        var _off = function(eventName, fun, isOnce) {
            var tempList;
            if (!isOnce) {
                tempList = eventList;
            } else {
                tempList = eventOnceList;
            }
            if (tempList[eventName]) {
                var i = 0;
                var l = tempList[eventName].length;
                for (; i < l; i++) {
                    if (tempList[eventName][i] === fun) {
                        tempList[eventName][i] = null;
                        // ÿ��ֻ���һ����ͬ�¼���
                        return;
                    }
                }
            }
        };

        function cleanNull(list) {
            var tempList = [];
            var i = 0;
            var l = list.length;
            if (l) {
                for (; i < l; i++) {
                    if (list[i]) {
                        tempList.push(list[i]);
                    }
                }
                return tempList;
            } else {
                return null;
            }
        }

        return {
            on: function(eventName, fun) {
                _on(eventName, fun);
                return this;
            },
            once: function(eventName, fun) {
                _on(eventName, fun, true);
                return this;
            },
            emit: function(eventName, data) {
                if (!eventName) {
                    throw('No emit event name.');
                }
                var i = 0;
                var l = 0;
                if (eventList[eventName]) {
                    i = 0;
                    l = eventList[eventName].length;
                    for (; i < l; i++) {
                        if (eventList[eventName][i]) {
                            eventList[eventName][i].call(this, data);
                        }
                    }
                    eventList[eventName] = cleanNull(eventList[eventName]);
                }
                if (eventOnceList[eventName]) {
                    i = 0;
                    l = eventOnceList[eventName].length;
                    for (; i < l; i++) {
                        if (eventOnceList[eventName][i]) {
                            eventOnceList[eventName][i].call(this, data);
                            _off(eventName, eventOnceList[eventName][i], true);
                        }
                    }
                    eventOnceList[eventName] = cleanNull(eventOnceList[eventName]);
                }
                return this;
            },
            off: function(eventName, fun) {
                _off(eventName, fun);
                return this;
            }
        };
    };

}(window);
