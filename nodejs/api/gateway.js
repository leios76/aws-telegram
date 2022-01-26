const async = require('async');
const request = require('request');

const elec = require('./elec.js');
const giftcard = require('./giftcard.js');
const whooing = require('./whooing.js');
const balance = require('./balance.js');
const test = require('./test.js');

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

exports.handler = function (event, context, callback) {
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

