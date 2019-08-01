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

var traceProducts = [
    "컬쳐랜드",
    "해피머니",
    "도서문화상품권",
    "롯데",
    "신세계",
];

var getProductId = function (item) {
    for (var i = 0; i < traceProducts.length; i++) {
        if (item.title.indexOf(traceProducts[i]) > -1) {
            return traceProducts[i];
        }
    }
    return null;
};

var getStatistics = function (item, callback) {
    var productId = getProductId(item);
    var lowPrices = {
        _007d_price: item.price,
        _030d_price: item.price,
        _365d_price: item.price,
    };

    if (!productId) {
        callback(lowPrices);
        return;
    }

    var getParams = {
        TableName: 'webdata',
        Key: {
            site: productId,
            timestamp: 0,
        }
    };

    console.log(`Get Statistics for ${productId}`);
    docClient.get(getParams, (err, res) => {
        var data = [];
        if (!err) {
            console.log(JSON.stringify(res));
            if (res && res.Item && res.Item.data) {
                data = res.Item.data;
            }
        }

        lowPrices = data.reduce((prev, curr) => {
            // 7일 이내 데이터이면
            if (now < curr.ts + 7 * 24 * 60 * 60) {
                if (curr.price < prev._007d_price) {
                    prev._007d_price = curr.price;
                }
            }
            // 30일 이내 데이터이면
            if (now < curr.ts + 30 * 24 * 60 * 60) {
                if (curr.price < prev._030d_price) {
                    prev._030d_price = curr.price;
                }
            }
            // 1년 이내 데이터이면
            if (now < curr.ts + 365 * 24 * 60 * 60) {
                if (curr.price < prev._365d_price) {
                    prev._365d_price = curr.price;
                }
            }
            return prev;
        }, lowPrices);
        callback(lowPrices);
    });
};

var processCommandGiftcard = function (update, args, callback) {
    var message = '';
    var queryParams = {
        TableName: 'webdata',
        KeyConditionExpression: "#site = :site",
        ScanIndexForward: false,
        Limit: 1,
        ExpressionAttributeNames: {
            "#site": "site"
        },
        ExpressionAttributeValues: {
            ":site": 'wemakeprice-collect'
        }
    };
    docClient.query(queryParams, (err, res) => {
        if (!err) {
            var saved = { items: [] };
            if (res.Items.length > 0 && res.Items[0].data) {
                saved = res.Items[0].data;
            }
            async.each(saved.items, (item, callback) => {
                getStatistics(item, (lowPrices) => {
                    message += `품명: ${item.title}\nURL: ${item.url}\n가격: ${item.price}\n최저가: ${item.lowestPrice}\n주최저가: ${lowPrices._007d_price}\n월최저가: ${lowPrices._030d_price}\n년최저가: ${lowPrices._365d_price}\n\n`;
                    callback(null);
                });
            }, function (err) {
                sendMessage(message, update.message.chat.id, function (err, result) {
                    callback(err);
                });
            });
        } else {
            callback(null);
        }
    });
};

var processCommandElec = function (update, args, callback) {
    var message = '';

    var options = {
        "max_discount": 16000,
        /* 할인요금 최대 한도 */
        "min_total_charge": 1000,
        /* 월최저요금 */
        "discount_rate": 30
        /* 3자녀이상요금할인율 */
    };

    var rate_table = [
        {
            name: '저압',
            base: [910, 1600, 7300],
            rate: [93.3, 187.9, 280.6],
            minimal_discount: 4000,
        },
        {
            name: '고압',
            base: [730, 1260, 6060],
            rate: [78.3, 147.3, 215.6],
            minimal_discount: 2500,
        },
    ]

    var tax = function (p) {
        return 10 * parseInt((p + Math.round(p * 0.1) + 10 * parseInt(0.037 * p * 0.1, 10)) * 0.1, 10);
    };

    var calc = function (table, used) {
        var sum = 0;

        var base_level = parseInt(((used - 1) / 200), 10);
        var used_level = parseInt(used / 200, 10);
        var remain = parseInt(used % 200, 10);

        if (base_level > 1) {
            base_level = 2;
            used_level = 2;
            remain = used - 400;
        }

        for (var i = 0; i < used_level; i++) {
            sum += 200 * table.rate[i];
        }
        sum += remain * table.rate[used_level];

        sum = Math.round(sum) + table.base[base_level];

        if (used < 200) {
            sum -= table.minimal_discount;
        }

        sum = Math.max(sum, options.min_total_charge);
        discounted = sum - Math.min(Math.round(sum * options.discount_rate / 100), options.max_discount);

        return { normal: tax(sum), discount: tax(discounted) };
    }


    if (args.length > 0) {
        var value = parseInt(args[1]);
        if (value) {
            for (var i = 0; i < rate_table.length; i++) {
                var price = calc(rate_table[i], value);

                message += `${rate_table[i].name} 일반: ${price.normal.toLocaleString()}\n`;
                message += `${rate_table[i].name} 할인: ${price.discount.toLocaleString()}\n\n`;
            }
        } else {
            message += "사용법: /elec <kWh>";
        }
    } else {
        message += "사용법: /elec <kWh>";
    }

    sendMessage(message, update.message.chat.id, function (err, result) {
        callback(err);
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
                            processCommandGiftcard(update, args, callback);
                            break;
                        case "/elec":
                            processCommandElec(update, args, callback);
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

    async.waterfall([
        function (callback) {
            callback(null, JSON.parse(event.body), {});
        },
        saveMessage,
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
};
