/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
// �뽫 AppId ��Ϊ���Լ��� AppId�������޷����ز���
var appId = 'azf56eqig235hs3p2w2v39fupnnhjcqk5ehkm656rxg7hgqg';

// �뻻�����Լ���һ������� conversation id�����Ƿ����������ɵģ�
var roomId = '5562f9dfe4b07ae45cfd2629';

// ÿ���ͻ����Զ���� id
var clientId = 'Sports+ Client';

// �����洢 realtimeObject
var rt;

// �����洢�����õ� roomObject
var room;

// �����Ƿ���������ӳɹ�
var firstFlag = true;

// ���������ʷ��Ϣ��ȡ״̬
var logFlag = false;

var openBtn = document.getElementById('open-btn');
var sendBtn = document.getElementById('send-btn');
var inputName = document.getElementById('input-name');
var inputSend = document.getElementById('input-send');
var printWall = document.getElementById('print-wall');

// ��ȡ��ʷ���
// ����һ����Ϣ��ʱ���
var msgTime;

bindEvent(openBtn, 'click', main);
bindEvent(sendBtn, 'click', sendMsg);

bindEvent(document.body, 'keydown', function(e) {
    if (e.keyCode === 13) {
        if (firstFlag) {
            main();
        } else {
            sendMsg();
        }
    }
});

function main() {
    showLog('�������ӷ���������ȴ�������');
    var val = inputName.value;
    if (val) {
        clientId = val;
    }
    if (!firstFlag) {
        rt.close();
    }

    // ����ʵʱͨ��ʵ��
    rt = AV.realtime({
        appId: appId,
        clientId: clientId,
        // ��ע�⣬����ر� secure ��ȫ��Ϊ�� Demo ���ݷ�Χ����Щ
        // ������ο�ʵʱͨ���ĵ��еġ������������⡹����
        // �������ʹ�����������������鲻Ҫ�ر� secure�������Ķ��ĵ�
        // secure ����Ϊ true �ǿ���
        secure: false
    });

    // �������ӳɹ��¼�
    rt.on('open', function() {
        firstFlag = false;
        showLog('���������ӳɹ���');

        // ������з����ʵ��
        rt.room(roomId, function(object) {

            // �жϷ��������Ƿ������� room���������
            if (object) {
                room = object;

                // ��ǰ�û������������
                room.join(function() {

                    // ��ȡ��Ա�б�
                    room.list(function(data) {
                        showLog('��ǰ Conversation �ĳ�Ա�б�', data);

                        // ��ȡ���ߵ� client��Ping ����ÿ��ֻ�ܻ�ȡ 20 ���û�������Ϣ��
                        rt.ping(data.slice(0, 20), function(list) {
                            showLog('��ǰ���ߵĳ�Ա�б�', list);
                        });

                        var l = data.length;

                        // ������� 500 �ˣ����ߵ�һ����
                        if (l > 490) {
                            room.remove(data[30], function() {
                                showLog('�������࣬�ߵ��� ', data[30]);
                            });
                        }

                        // ��ȡ������ʷ
                        getLog(function() {
                            printWall.scrollTop = printWall.scrollHeight;
                            showLog('�Ѿ����룬���Կ�ʼ���졣');
                        });
                    });

                });

                // ���������Ϣ
                room.receive(function(data) {
                    if (!msgTime) {
                        // �洢�������һ����Ϣʱ���
                        msgTime = data.timestamp;
                    }
                    showMsg(data);
                });
            }
            // ����������˲�������� conversation
            else {
                showLog('��������������� conversation������Ҫ����һ����');

                // ����һ���� room
                rt.room({
                    // Room ��Ĭ������
                    name: 'LeanCloud-Room',
                    // Ĭ�ϳ�Ա�� clientId
                    members: [
                        // ��ǰ�û�
                        clientId
                    ],
                    // ������̬�������ң���̬������֧��������Ա���죬���ǲ�֧�ִ洢��ʷ��
                    // transient: true,
                    // Ĭ�ϵ����ݣ����Է� Conversation ���ֵ�
                    attr: {
                        test: 'demo2'
                    }
                }, function(obj) {

                    // �����ɹ�����������Խ� room id �洢����
                    room = obj;
                    showLog('����һ���� Room �ɹ���id �ǣ�', room.id);
                });
            }
        });
    });

    // �����������
    rt.on('reuse', function() {
        showLog('���������������������ĵȴ�������');
    });

    // ��������
    rt.on('error', function() {
        showLog('�����������󡣡���');
    });
}

function sendMsg() {

    // ���û�����ӹ�������
    if (firstFlag) {
        alert('�������ӷ�������');
        return;
    }
    var val = inputSend.value;

    // ���÷��Ϳ��ַ�
    if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
        alert('����������֣�');
    }

    // ��������䷢����Ϣ����δ����Ǽ��ݶ��ն˸�ʽ�ģ����� iOS��Android��Window Phone
    room.send({
        text: val
    }, {
        type: 'text'
    }, function(data) {

        // ���ͳɹ�֮��Ļص�
        inputSend.value = '';
        showLog('��' + formatTime(data.t) + '��  �Լ��� ', val);
        printWall.scrollTop = printWall.scrollHeight;
    });

    // ���Ͷ�ý����Ϣ����������ͼƬ���ͣ����Դ�ע��
    // room.send({
    //     text: 'ͼƬ����',
    //     // �Զ��������
    //     attr: {
    //         a:123
    //     },
    //     url: 'https://leancloud.cn/images/static/press/Logo%20-%20Blue%20Padding.png',
    //     metaData: {
    //         name:'logo',
    //         format:'png',
    //         height: 123,
    //         width: 123,
    //         size: 888
    //     }
    // }, {
    //    type: 'image'
    // }, function(data) {
    //     console.log('ͼƬ���ݷ��ͳɹ���');
    // });
}

// ��ʾ���յ�����Ϣ
function showMsg(data, isBefore) {
    var text = '';
    var from = data.fromPeerId;
    if (data.msg.type) {
        text = data.msg.text;
    } else {
        text = data.msg;
    }
    if (data.fromPeerId === clientId) {
        from = '�Լ�';
    }
    if (String(text).replace(/^\s+/, '').replace(/\s+$/, '')) {
        showLog('��' + formatTime(data.timestamp) + '��  ' + from + '�� ', text, isBefore);
    }
}

// ��ȡ��ʷ
bindEvent(printWall, 'scroll', function(e) {
    if (printWall.scrollTop < 20) {
        getLog();
    }
});

// ��ȡ��Ϣ��ʷ
function getLog(callback) {
    var height = printWall.scrollHeight;
    if (logFlag) {
        return;
    } else {
        // ���������ȡ
        logFlag = true;
    }
    room.log({
        t: msgTime
    }, function(data) {
        logFlag = false;
        // �洢������һ������Ϣʱ���
        var l = data.length;
        if (l) {
            msgTime = data[0].timestamp;
        }
        for (var i = l - 1; i >= 0; i--) {
            showMsg(data[i], true);
        }
        if (l) {
            printWall.scrollTop = printWall.scrollHeight - height;
        }
        if (callback) {
            callback();
        }
    });
}

// demo ���������
function showLog(msg, data, isBefore) {
    if (data) {
        // console.log(msg, data);
        msg = msg + '<span class="strong">' + encodeHTML(JSON.stringify(data)) + '</span>';
    }
    var p = document.createElement('p');
    p.innerHTML = msg;
    if (isBefore) {
        printWall.insertBefore(p, printWall.childNodes[0]);
    } else {
        printWall.appendChild(p);
    }
}

function encodeHTML(source) {
    return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    // .replace(/\\/g,'&#92;')
    // .replace(/"/g,'&quot;')
    // .replace(/'/g,'&#39;');
}

function formatTime(time) {
    var date = new Date(time);
    var month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    var currentDate = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    var hh = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var mm = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var ss = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return date.getFullYear() + '-' + month + '-' + currentDate + ' ' + hh + ':' + mm + ':' + ss;
}

function bindEvent(dom, eventName, fun) {
    if (window.addEventListener) {
        dom.addEventListener(eventName, fun);
    } else {
        dom.attachEvent('on' + eventName, fun);
    }
}

