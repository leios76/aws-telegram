const request = require('request');
const config = require('config');
const async = require('async');
const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-northeast-2',
    endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com"
});

//const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

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

var sendMessage = function (message, chat_id, callback) {
    if (message.length > 0) {
        var telegramConfig = config.get('telegram');
        var option = {
            uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/sendMessage`,
            method: 'POST',
            json: true,
            body: {
                'chat_id': chat_id,
                'text': message
            }
        };

        req(option, function (err, response, body) {
            if (!err && (body && !body.ok)) {
                console.log(body);
                callback("Send Message Fail", result);
            } else {
                callback(err, result);
            }
        });
    } else {
        callback(null, result);
    }
};

var start = function (callback) {
    callback(null, {});
};

var setWebhook = function (result, callback) {
    var telegramConfig = config.get('telegram');
    var response = {};
    var option = {
        uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/setWebhook`,
        method: 'GET',
        json: true,
        qs: {
            'url': telegramConfig.url,
        }
    };

    req(option, function (err, res, body) {
        console.log(body);
        callback(err, body.result);
    });
}

var getWebhookInfo = function (result, callback) {
    var telegramConfig = config.get('telegram');
    var response = {};
    var option = {
        uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/getWebhookInfo`,
        method: 'GET',
        json: true,
    };

    req(option, function (err, res, body) {
        console.log(body);
        callback(err, body.result);
    });
}

var deleteWebhook = function (result, callback) {
    var telegramConfig = config.get('telegram');
    var response = {};
    var option = {
        uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/deleteWebhook`,
        method: 'GET',
        json: true,
    };

    req(option, function (err, res, body) {
        console.log(body);
        callback(err, body.result);
    });
}

var saveMessage = function (update, response, callback) {
    var telegramConfig = config.get('telegram');

    update.bot_id = telegramConfig.bot_id;
    update.timestamp = Math.floor(Date.now() / 1000);
    update.ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    var putParams = {
        TableName: 'telegram',
        Item: update,
    };

    console.log("Saving Update");
    docClient.put(putParams, (err, res) => {
        if (!err) {
            console.log(JSON.stringify(res));
        }
        callback(err, event, response);
    });
};

var processMessage = function (event, callback) {
    callback(null, event, response);
};

exports.webhook = function (event, context, callback) {
    async.waterfall([
        start,
        getWebhookInfo,
        deleteWebhook,
        setWebhook,
        getWebhookInfo,
    ], function (err) {
        if (err) {
            console.log(err);
        }
    });
}

exports.handler = function (event, context, callback) {
    async.waterfall([
        function (callback) {
            callback(null, JSON.parse(event.body), {});
        },
        saveMessage,
        processMessage,
    ], function (err, update, response) {
        if (err) {
            console.log(err);
        }

        callback(err, {
            "statusCode": 200,
            "headers": {
            },
            "body": JSON.stringify(response),
            "isBase64Encoded": false
        });
    });
};
