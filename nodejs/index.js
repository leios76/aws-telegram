const request = require('request');
const config = require('config');
const async = require('async');
const AWS = require('aws-sdk');
const elec = require('./src/elec.js');
const giftcard = require('./src/giftcard.js');
const whooing = require('./src/whooing.js');
const balance = require('./src/balance.js');
const test = require('./src/test.js');

AWS.config.update({
    region: 'ap-northeast-2',
    endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com"
});

//const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

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

var sendMessage = function (message, chat_id, callback) {
    if (message.length > 0 && chat_id > 0) {
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
                callback("Send Message Fail", { result: "nok" });
            } else {
                callback(err, { result: "ok" });
            }
        });
    } else {
        callback(null, { result: "no message" });
    }
};

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

var saveMessage = function (update, response, callback) {
    var telegramConfig = config.get('telegram');

    update.bot_id = telegramConfig.bot_id;
    update.timestamp = now;
    update.ttl = now + 30 * 24 * 60 * 60;

    var putParams = {
        TableName: 'telegram',
        Item: update,
    };

    console.log("Saving Update");
    docClient.put(putParams, (err, res) => {
        if (!err) {
            console.log(JSON.stringify(res));
        }
        callback(err, update, response);
    });
};

var processMessage = function (update, response, callback) {
    if (update.message) {
        console.log(`${update.message.from.last_name} ${update.message.from.first_name}(${update.message.from.username}): ${update.message.text}`);
        if (!update.message.from.is_bot) {
            async.eachSeries(update.message.entities, function (entity, callback) {
                console.log("Process entity:", entity);
                if (entity.type === "bot_command") {
                    var args = update.message.text.substring(entity.offset + entity.length).split(' ');
                    switch (update.message.text.substring(entity.offset, entity.offset + entity.length)) {
                        case "/giftcard":
                            giftcard.processCommand(args, function(err, result) {
                                if (err === null && result !== null) {
                                    sendMessage(result.message, update.message.chat.id, function (err, result) {
                                        callback(err);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                            break;
                        case "/elec":
                            elec.processCommand(args, function(err, result) {
                                if (err === null && result !== null) {
                                    sendMessage(result.message, update.message.chat.id, function (err, result) {
                                        callback(err);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                            break;
                        case "/whooing":
                            whooing.processCommand(args, function(err, result) {
                                if (err === null && result !== null) {
                                    sendMessage(result.message, update.message.chat.id, function (err, result) {
                                        callback(err);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                            break;
                        case "/balance":
                            balance.processCommand(args, function(err, result) {
                                if (err === null && result !== null) {
                                    sendMessage(result.user.point, update.message.chat.id, function (err, result) {
                                        callback(err);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                            break;
                        case "/test":
                            test.processCommand(args, function(err, result) {
                                if (err === null && result !== null) {
                                    sendMessage(result.message, update.message.chat.id, function (err, result) {
                                        callback(err);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                            break;
                        default:
                            callback(null);
                            break;
                    }
                } else {
                    callback(null);
                }
            }, function (err) {
                callback(err, "", 0);
            });

            return;
        }
    }

    callback(null, "", 0);
};

var telegramCallback = function (event, context, callback) {
    async.waterfall([
        function (callback) {
            callback(null, JSON.parse(event.body), {});
        },
        //saveMessage,
        processMessage,
        sendMessage,
    ], function (err, response) {
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
}

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
            telegramCallback(event, context, callback);
        } else {
            console.log(`Unknown path: ${event.path}`);
        }
    } else {
        // Cloud watch
        console.log("cloud watch event");
    }
};
