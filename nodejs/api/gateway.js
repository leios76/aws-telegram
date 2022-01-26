const async = require('async');
const request = require('request');
const config = require('config');
const AWS = require('aws-sdk');

const elec = require('./elec.js');
const giftcard = require('./giftcard.js');
const whooing = require('./whooing.js');
const balance = require('./balance.js');
const nhis = require('./nhis.js');
const test = require('./test.js');

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
                                    sendMessage(result.message, result.markup, update.message.chat.id, function (err, result) {
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
                                    sendMessage(result.message, result.markup, update.message.chat.id, function (err, result) {
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
                                    sendMessage(result.message, result.markup, update.message.chat.id, function (err, result) {
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
                                    sendMessage(result.user.point, "", update.message.chat.id, function (err, result) {
                                        callback(err);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                            break;
                        case "/nhis":
                            nhis.processCommand(args, function(err, result) {
                                if (err === null && result !== null) {
                                    sendMessage(result.message, result.markup, update.message.chat.id, function (err, result) {
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
                                    sendMessage(result.message, result.markup, update.message.chat.id, function (err, result) {
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
    } else if (update.callback_query) {
        editMessageMarkup(update.callback_query.from.id, update.callback_query.message.message_id, {}, function(err, result) {
            callback(err);
        });
        return;
    }

    callback(null, "", 0);
};

var saveMessage = function (update, response, callback) {
    var telegramConfig = config.get('telegram');

    update.bot_id = telegramConfig.bot_id;
    update.timestamp = now;

    var putParams = {
        TableName: 'webdata',
        Item: {
            site: 'telegram',
            timestamp: now,
            ttl: now + 30 * 24 * 60 * 60,
            data: update
        }
    };

    console.log("Saving Update");
    docClient.put(putParams, (err, res) => {
        if (!err) {
            console.log(JSON.stringify(res));
        }
        callback(err, update, response);
    });
};

var sendMessage = function (message, markup, chat_id, callback) {
    if (message.length > 0 && chat_id > 0) {
        var telegramConfig = config.get('telegram');
        var option = {
            uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/sendMessage`,
            method: 'POST',
            json: true,
            body: {
                'chat_id': chat_id,
                'text': message,
                'reply_markup': markup
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

var editMessageMarkup = function (chat_id, message_id, markup, callback) {
    if (chat_id > 0 && message_id > 0) {
        var telegramConfig = config.get('telegram');
        var option = {
            uri: `https://api.telegram.org/${telegramConfig.bot_id}:${telegramConfig.token}/editMessageReplyMarkup`,
            method: 'POST',
            json: true,
            body: {
                'chat_id': chat_id,
                'message_id': message_id,
                'reply_markup': markup
            }
        };

        req(option, function (err, response, body) {
            if (!err && (body && !body.ok)) {
                console.log(body);
                callback("Edit Message Markup Fail", { result: "nok" });
            } else {
                callback(err, { result: "ok" });
            }
        });
    } else {
        callback(null, { result: "no message" });
    }
};

exports.handler = function (event, context, callback) {
    now = Math.floor(Date.now() / 1000);

    async.waterfall([
        function (callback) {
            callback(null, JSON.parse(event.body), {});
        },
        saveMessage,
        processMessage,
        //sendMessage,
    ], function (err, response) {
        if (err) {
            console.log(err);
        }

        console.log(response);

        callback(err, {
            "statusCode": 200,
            "headers": {
            },
            "body": JSON.stringify(response),
            "isBase64Encoded": false
        });
    });
}

