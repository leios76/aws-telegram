const request = require('request');
const config = require('config');
const async = require('async');
const apiGateway = require('./api/gateway.js');


var now;

var req = request.defaults({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'ko,en-US;q=0.8,en;q=0.6'
    },
    jar: true,
    gzip: true,
    followAllRedirects: true,
    //encoding: null
});

var setWebhook = function (result, callback) {
    var telegramConfig = config.get('telegram');
    var option = {
        uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/setWebhook`,
        method: 'GET',
        json: true,
        qs: {
            'url': telegramConfig.service_api_url,
        }
    };

    req(option, function (err, res, body) {
        console.log(body);
        callback(err, body.result);
    });
};

var getWebhookInfo = function (result, callback) {
    var telegramConfig = config.get('telegram');
    var option = {
        uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/getWebhookInfo`,
        method: 'GET',
        json: true,
    };

    req(option, function (err, res, body) {
        console.log(body);
        callback(err, body.result);
    });
};

var deleteWebhook = function (result, callback) {
    var telegramConfig = config.get('telegram');
    var option = {
        uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/deleteWebhook`,
        method: 'GET',
        json: true,
    };

    req(option, function (err, res, body) {
        console.log(body);
        callback(err, body.result);
    });
};

exports.webhook = function (event, context, callback) {
    async.waterfall([
        function (callback) {
            callback(null, {});
        },
        getWebhookInfo,
        deleteWebhook,
        setWebhook,
        getWebhookInfo,
    ], function (err) {
        if (err) {
            console.log(err);
        }
        if (callback) {
            callback(err);
        }
    });
};

exports.handler = function (event, context, callback) {
    now = Math.floor(Date.now() / 1000);

    if (event.path) {
        // API gateway
        if (event.path === "/telegram/webhook") {
            apiGateway.handler(event, context, callback);
        } else {
            console.log(`Unknown path: ${event.path}`);
        }
    } else {
        // Cloud watch
        console.log("cloud watch event");
    }
};
