const request = require('request');
const config = require('config');
const async = require('async');
const fs = require('fs');
const crypto = require('crypto')
const readline = require('readline');
const luxon = require('luxon');
const comma = require('comma-number');

const TOKEN_PATH = 'config/whooing_token.json';
var now;
var today;
var start_date;
var end_date;
var automated;

function sha1(data) {
    return crypto.createHash("sha1").update(data, "binary").digest("hex");
}

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

var start = function (callback) {
    callback(null, {
        data: {
            items: [],
        },
        message: "",
        loggedIn: false,
        token: "",
        pin: "",
        access_token: {
            token: "",
            token_secret: "",
            user_id: ""
        },
        report: {}
    });
};

var loadAuth = function(result, callback) {
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (!err) {
            console.log('Load token from', TOKEN_PATH);
            result.access_token = JSON.parse(token);
        }
        callback(null, result);
    });

}
var requestAuth1 = function (result, callback) {
    if (result.access_token.token !== "") {
        callback(null, result);
        return;
    }
    if (automated) {
        callback("Could not perfomr automated auth", result);
        return;
    }

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/app_auth/request_token',
        method: 'GET',
        json: true,
        qs: {
            'app_id': whooingConfig.app_id,
            'app_secret': whooingConfig.app_secret
        },
    };

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            console.log(body);
            result.token = body.token;

            console.log(`Authorize this app by visiting this url: https://whooing.com/app_auth/authorize?token=${body.token}`);
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question('Enter the pin code from that page here: ', (pin) => {
                rl.close();
                result.pin = pin;
                callback(err, result);
            });
        }
    });
};

var requestAuth2 = function (result, callback) {
    if (result.access_token.token !== "") {
        callback(null, result);
        return;
    }
    if (automated) {
        callback("Could not perfomr automated auth", result);
        return;
    }

    if (result.token === "" || result.pin === "") {
        callback("Forbidden", result);
        return;
    }

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/app_auth/access_token',
        method: 'GET',
        json: true,
        qs: {
            'app_id': whooingConfig.app_id,
            'app_secret': whooingConfig.app_secret,
            'token': result.token,
            'pin': result.pin,
        },
    };

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            console.log(body);

            fs.writeFile(TOKEN_PATH, JSON.stringify(body, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                console.log('Token stored to', TOKEN_PATH);
            });
        }
        callback(err, result);
    });
};

var requestUser = function (result, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/api/user.json',
        method: 'GET',
        json: true,
        qs: {
        },
        headers: {
            "X-API-KEY": `app_id=${whooingConfig.app_id},token=${result.access_token.token},signiture=${sha1(whooingConfig.app_secret + '|' + result.access_token.token_secret)},nounce=whooing-bot,timestamp=${ts}`
        }
    };

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            if (body.code !== 200) {
                callback(body.message, result);
                return;
            } else {
                console.log(body);
            }
        }
        callback(err, result);
    });
};

var requestSections = function (result, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/api/sections.json',
        method: 'GET',
        json: true,
        qs: {
        },
        headers: {
            "X-API-KEY": `app_id=${whooingConfig.app_id},token=${result.access_token.token},signiture=${sha1(whooingConfig.app_secret + '|' + result.access_token.token_secret)},nounce=whooing-bot,timestamp=${ts}`
        }
    };

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            if (body.code !== 200) {
                callback(body.message, result);
                return;
            } else {
                console.log(body);
            }
        }
        callback(err, result);
    });
};

var requestAccounts = function (result, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/api/accounts.json',
        method: 'GET',
        json: true,
        qs: {
            "section_id": whooingConfig.section_id
        },
        headers: {
            "X-API-KEY": `app_id=${whooingConfig.app_id},token=${result.access_token.token},signiture=${sha1(whooingConfig.app_secret + '|' + result.access_token.token_secret)},nounce=whooing-bot,timestamp=${ts}`
        }
    };

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            //console.log(body);
            if (body.code !== 200) {
                callback(body.message, result);
                return;
            } else {
                result.accounts = body.results;
            }
        }
        callback(err, result);
    });
};

var requestEntries = function (result, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    for (var k = parseInt(start_date.toFormat('yyyyMM')); k <= parseInt(end_date.toFormat('yyyyMM')); k++) {
        result.report[k] = {};
    }
    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/api/entries.json',
        method: 'GET',
        json: true,
        qs: {
            "section_id": whooingConfig.section_id,
            "start_date": start_date.toFormat('yyyyMMdd'),
            "end_date": end_date.toFormat('yyyyMMdd'),
            "limit": 1000,
        },
        headers: {
            "X-API-KEY": `app_id=${whooingConfig.app_id},token=${result.access_token.token},signiture=${sha1(whooingConfig.app_secret + '|' + result.access_token.token_secret)},nounce=whooing-bot,timestamp=${ts}`
        }
    };

    req(option, function (err, response, body) {
        result.response = response;
        result.body = body;

        if (!err) {
            //console.log(body);
            if (body.code !== 200) {
                callback(body.message, result);
                return;
            } else {
                result.entries = body.results.rows;
            }
        }
        callback(err, result);
    });
};

var getGiftcardList = function(assets) {
    var result = {};
    var t = parseInt(end_date.toFormat('yyyyMMdd'));

    for (var key in assets) {
        var account = assets[key];
        if (t < account.open_date || account.close_date < t) {
            continue;
        }
        if (account.memo.indexOf('상품권한도') < 0) {
            continue;
        }
        result[key] = account;
    }
    return result;
}

var getCardList = function(liabilities) {
    var result = {};
    var t = parseInt(end_date.toFormat('yyyyMMdd'));

    for (var key in liabilities) {
        var account = liabilities[key];
        if (account.category !== 'creditcard' && account.category !== 'checkcard' ) {
            console.log(account);
            continue;
        }

        if (t < account.open_date || account.close_date < t) {
            continue;
        }
        result[key] = account;
    }
    return result;
}

var makeResult = function(result, callback) {
    var giftcard_accounts = getGiftcardList(result.accounts.assets);
    var card_accounts = getCardList(result.accounts.liabilities);

    for (var key in card_accounts) {
        for (var k in result.report) {
            result.report[k][card_accounts[key].title.split('|')[0]] = 0;
        }
    }

    for (var i = 0; i < result.entries.length; i++) {
        var entry = result.entries[i];
        if (entry.l_account_id in giftcard_accounts && entry.r_account_id in card_accounts) {
            var k = Math.floor(parseInt(entry.entry_date.split('.')[0])/100);
            result.report[k][card_accounts[entry.r_account_id].title.split('|')[0]] += entry.money;
        }
    }
    console.log(JSON.stringify(result.report, null, 2));
    callback(null, result);
};

exports.make_auth =function(event, context, callback) {
    automated = false;
    async.waterfall([
        start,
        loadAuth,
        requestAuth1,
        requestAuth2,
    ], function (err, result) {
        if (err) {
            console.log(err);
        }
    });
}

exports.processCommand = function(args, callback) {
    now = Math.floor(Date.now() / 1000);
    today = luxon.DateTime.local().setZone('Asia/Seoul');
    start_date = today.set({day: 1}).minus({month: 2});
    end_date = today.set({day: 1}).plus({month: 1, day: -1});
    automated = true;

    async.waterfall([
        start,
        loadAuth,
        requestAuth1,
        requestAuth2,
        //requestUser,
        //requestSections,
        requestAccounts,
        requestEntries,
        makeResult,
    ], function (err, result) {
        var message = "";
        if (err) {
            console.log(err);
        } else {
            for (var month in result.report) {
                message += `[${month}]\n`;
                for (var card in result.report[month]) {
                    if (result.report[month][card] > 0) {
                        message += `${card}: ${comma(result.report[month][card])}\n`;
                    }
                }
                message += `\n`;
            }
        }
        callback(message);
    });
}
