const request = require('request');
const config = require('config');
const async = require('async');
const fs = require('fs');
const crypto = require('crypto')
const readline = require('readline');
const luxon = require('luxon');

const TOKEN_PATH = 'config/whooing_token.json';
var now;
var today;
var end_date;
var automated;
var term_month = 3;

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
        balance_account_info: null,
        user: {}
    });
};

var loadAuth = function (result, callback) {
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
                //console.log(body);
                result.user = body.results;
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

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/api/entries.json',
        method: 'GET',
        json: true,
        qs: {
            "section_id": whooingConfig.section_id,
            "start_date": end_date.toFormat('yyyyMMdd'),
            "end_date": end_date.toFormat('yyyyMMdd'),
            "limit": 1000,
            "item": "카드대금*(자동정산)"
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
                result.entries = body.results;
            }
        }
        callback(err, result);
    });
};

var requestBs = function (result, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    var whooingConfig = config.get('whooing');
    var option = {
        uri: 'https://whooing.com/api/bs.json',
        method: 'GET',
        json: true,
        qs: {
            "section_id": whooingConfig.section_id,
            "end_date": end_date.toFormat('yyyyMMdd'),
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
                result.bs = body.results;
            }
        }
        callback(err, result);
    });
};

var requestUpdateEntry = function (result, entry, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    var whooingConfig = config.get('whooing');
    var option = {
        uri: `https://whooing.com/api/entries/${entry.entry_id}.json`,
        method: 'PUT',
        json: true,
        form: {
            "section_id": whooingConfig.section_id,
            "entry_date": end_date.toFormat('yyyyMMdd'),
            "l_account": entry.l_account,
            "l_account_id": entry.l_account_id,
            "r_account": entry.r_account,
            "r_account_id": entry.r_account_id,
            "item": entry.item,
            "money": entry.money,
            "memo": entry.memo,
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
                console.log(`entry updated: ${entry.item} (${result.accounts.liabilities[entry.l_account_id].title}) => ${entry.money}`);
            }
        }
        callback(err, result);
    });
};

var requestInsertEntry = function (result, entry, callback) {
    if (result.access_token.token === "") {
        callback("Forbidden", result);
        return;
    }

    var ts = Math.floor(Date.now() / 1000);

    var whooingConfig = config.get('whooing');
    var option = {
        uri: `https://whooing.com/api/entries.json`,
        method: 'POST',
        json: true,
        form: {
            "section_id": whooingConfig.section_id,
            "entry_date": end_date.toFormat('yyyyMMdd'),
            "l_account": entry.l_account,
            "l_account_id": entry.l_account_id,
            "r_account": entry.r_account,
            "r_account_id": entry.r_account_id,
            "item": entry.item,
            "money": entry.money,
            "memo": entry.memo,
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
                console.log(`entry inserted: ${entry.item} (${result.accounts.liabilities[entry.l_account_id].title}) => ${entry.money}`);
            }
        }
        callback(err, result);
    });
};

var getCardList = function (liabilities) {
    var result = {};
    var t = parseInt(end_date.toFormat('yyyyMMdd'));

    for (var key in liabilities) {
        var account = liabilities[key];
        if (account.category !== 'creditcard') {
            continue;
        }

        if (t < account.open_date || account.close_date < t) {
            continue;
        }

        if (account.memo.indexOf('월말자동정산') < 0) {
            continue;
        }
        result[key] = account;
    }
    return result;
}


var getBalanceAccountInfo = function (assets, liabilities) {
    var t = parseInt(end_date.toFormat('yyyyMMdd'));

    for (var key in assets) {
        var account = assets[key];
        if (t < account.open_date || account.close_date < t) {
            continue;
        }

        if (account.memo.indexOf('카드대금항목') > -1) {
            return { type: "asset", title: account.title, id: account.account_id };
        }
    }

    for (var key in liabilities) {
        var account = liabilities[key];
        if (t < account.open_date || account.close_date < t) {
            continue;
        }

        if (account.memo.indexOf('카드대금항목') > -1) {
            return { type: "liabilities", title: account.title, id: account.account_id };
        }
    }
    return null;
};

var updateEntry = function (result, key, callback) {
    for (var i = 0; i < result.entries.rows.length; i++) {
        var entry = result.entries.rows[i];
        if (entry.l_account_id === key && entry.r_account_id === result.balance_account_info.id) {
            entry.money += result.bs.liabilities.accounts[key];
            requestUpdateEntry(result, entry, callback);
            return;
        }
    }

    var category = result.accounts.liabilities[key].title.split('|')[0];
    var entry = {
        l_account: "liabilities",
        r_account: result.balance_account_info.type,
        l_account_id: key,
        r_account_id: result.balance_account_info.id,
        item: `카드대금 ${category}(자동정산)`,
        money: result.bs.liabilities.accounts[key],
        memo: ''
    };
    requestInsertEntry(result, entry, callback);
};

var updateBalance = function (result, callback) {
    var creditcard_accounts = getCardList(result.accounts.liabilities);
    result.balance_account_info = getBalanceAccountInfo(result.accounts.assets, result.accounts.liabilities);

    if (result.balance_account_info === null || creditcard_accounts.length === 0) {
        console.log("Asset is not defined!");
        callback(null, result);
        return;
    }

    async.mapValuesSeries(creditcard_accounts, function (account, key, callback) {
        if (result.bs.liabilities.accounts[key] !== 0) {
            updateEntry(result, key, callback);
        } else {
            callback(null);
        }
    }, function (err) {
        callback(err, result);
    });
};

var process = function (result, i, callback) {
    end_date = today.plus({ month: i }).set({ day: -1 });
    async.waterfall([
        function (callback) {
            callback(null, result);
        },
        requestEntries,
        requestBs,
        updateBalance,
    ], function (err, result) {
        callback(err, result);
    });
};

exports.make_auth = function (event, context, callback) {
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
};

exports.processCommand = function (result, callback) {
    today = luxon.DateTime.local().setZone('Asia/Seoul');
    automated = true;

    async.waterfall([
        function (callback) {
            callback(null, result);
        },
        loadAuth,
        requestAuth1,
        requestAuth2,
        requestUser,
        //requestSections,
        requestAccounts,
        function (result, callback) {
            async.timesSeries(term_month, function (i, callback) {
                process(result, (i + 2) - term_month, callback);
            }, function (err) {
                callback(err, result);
            });
        },
    ], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            result.data = { point: result.user.point }
        }
        callback(err, result);
    });
};
