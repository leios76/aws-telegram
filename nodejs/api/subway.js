const request = require('request');
const config = require('config');
const async = require('async');
const fs = require('fs');
const crypto = require('crypto')
const readline = require('readline');
const luxon = require('luxon');

var today;
var automated;

var req = request.defaults({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'ko,en-US;q=0.8,en;q=0.6'
    },
    jar: true,
    gzip: true,
    followAllRedirects: false,
    //encoding: null
});

exports.processCommand = function (result, callback) {
    var dataseoulConfig = config.get('dataseoul');
    today = luxon.DateTime.local().setZone('Asia/Seoul');
    var result = {};
    result.message = '';
    result.markup = {};

    var option = {
        uri: `http://swopenapi.seoul.go.kr/api/subway/${dataseoulConfig.token}/json/realtimeStationArrival/ALL`,
        method: 'GET',
        json: true,
    };

    var targetStationList = [
        {name: '석계', diff: 0, list: []},
        {name: '신이문', diff: 0, list: []},
        {name: '외대앞', diff: 0, list: []},
        {name: '회기', diff: 0, list: []},
        {name: '청량리', diff: 0, list: []},
        {name: '제기동', diff: 0, list: []},
        {name: '신설동', diff: 0, list: []},
        {name: '동묘앞', diff: 0, list: []},
        {name: '동대문', diff: 0, list: []},
        {name: '종로5가', diff: 0, list: []},
    ];
    var direction = '하행';

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            if (body.errorMessage && body.errorMessage.status === 200) {
                //console.log(body);
                if (body.realtimeArrivalList && body.realtimeArrivalList.length > 0) {
                    for (var s = 0; s < targetStationList.length; s++) {
                        var count = 0;
                        for (var i = 0; i < body.realtimeArrivalList.length; i++) {
                            var item = body.realtimeArrivalList[i];
                            if (item.updnLine !== direction) {
                                continue;
                            }
                            if (item.statnNm !== targetStationList[s].name) {
                                continue;
                            }
                            if (item.barvlDt === '0') {
                                continue;
                            }

                            if(item.subwayId !== '1001') {
                                continue;
                            }

                            var now = luxon.DateTime.local().setZone('Asia/Seoul');
                            var created = luxon.DateTime.fromFormat(item.recptnDt, "yyyy-MM-dd hh:mm:ss").setZone('Asia/Seoul');
                            var diff = Math.round((now - created)/1000);
                            var remain_sec = parseInt(item.barvlDt) - diff;
                            var remain_str = remain_sec;
                            if (remain_sec > 60) {
                                remain_str = `${Math.floor(remain_sec / 60)}m ${remain_sec % 60}s`
                            }
                            //console.log(`[${targetStationList[s].name}] ${item.btrainNo} ${item.bstatnNm}, ${item.arvlMsg2}, ${item.arvlMsg3}, ${remain_str}`);
                            targetStationList[s].list.push({
                                no: item.btrainNo,
                                dest: item.bstatnNm,
                                remain: remain_sec,
                            })
                        }
                        // 이전 역과의 시간 구하기
                        if (s == 0) {
                            continue;
                        }
                        var diff_sum = 0;
                        var diff_count = 0;
                        for (var p = 0; p < targetStationList[s - 1].list.length; p++) {
                            for (var c = 0; c < targetStationList[s].list.length; c++) {
                                if (targetStationList[s - 1].list[p].no === targetStationList[s].list[c].no) {
                                    diff_sum += targetStationList[s].list[c].remain - targetStationList[s - 1].list[p].remain;
                                    diff_count++;
                                    break;
                                }
                            }
                        }


                        var diff_avg = 0;
                        if (diff_count > 0) {
                            diff_avg = Math.round(diff_sum / diff_count)
                        }
                        // 이전 역에 있으나 현재 억에 없는 열차에 대한 예상 시간 반영
                        for (var p = 0; p < targetStationList[s - 1].list.length; p++) {
                            var found = false;
                            for (var c = 0; c < targetStationList[s].list.length; c++) {
                                if (targetStationList[s - 1].list[p].no === targetStationList[s].list[c].no) {
                                    found = true;
                                    break;
                                }
                            }
                            if (found) {
                                continue;
                            }
                            var new_train = targetStationList[s - 1].list[p];
                            new_train.remain = new_train.remain + diff_avg;
                            //console.log(`add ${diff_avg} for ${new_train.no}: [${targetStationList[s].name}] ${new_train.dest} ${new_train.no} ${new_train.remain}`);
                            targetStationList[s].list.push(new_train);
                        }
                    }
                    for (var p = 0; p < targetStationList[targetStationList.length - 1].list.length; p++) {
                        var train = targetStationList[targetStationList.length - 1].list[p];
                        var remain_str = train.remain;
                        if (train.remain > 60) {
                            remain_str = `${Math.floor(train.remain / 60)}m ${train.remain % 60}s`
                        }

                        console.log(`[${targetStationList[targetStationList.length - 1].name}] ${train.dest} ${train.no} ${remain_str}`);
                        result.message += `${train.dest} ${train.no} ${remain_str}\n`;
                    }
                }
                callback(null, result);
            } else {
                callback(body.errorMessage.message, result);
            }
            return;
        }
        callback(err, result);
    });

};
