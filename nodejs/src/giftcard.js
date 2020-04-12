const async = require('async');
const AWS = require('aws-sdk');

AWS.config.update({
    region: 'ap-northeast-2',
    endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com"
});

//const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

var now;
var statistics;

var traceProducts = [
    "컬쳐랜드",
    "해피머니 온라인상품권",
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
        _latest_price: item.price,
        _007d_price: item.price,
        _030d_price: item.price,
        _365d_price: item.price,
    };

    if (!productId) {
        callback(lowPrices);
        return;
    }

    if (statistics[productId]) {
        callback(statistics[productId]);
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

        if (data.length > 0) {
            lowPrices._latest_price = data[data.length - 1].price;
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
        statistics[productId] = lowPrices;
        callback(lowPrices);
    });
};

exports.processCommand = function (args, callback) {
    statistics = {};
    now = Math.floor(Date.now() / 1000);
    var result = {};
    result.message = '';
    var queryParams = {
        TableName: 'webdata',
        KeyConditionExpression: "#site = :site",
        ScanIndexForward: false,
        Limit: 1,
        ExpressionAttributeNames: {
            "#site": "site"
        },
        ExpressionAttributeValues: {
            ":site": 'hotdeal-collect'
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
                    result.message += `품명: ${item.title}\nURL: ${item.url}\n가격: ${item.price}\n최저가: ${item.lowestPrice}\n주최저가: ${lowPrices._007d_price}\n월최저가: ${lowPrices._030d_price}\n년최저가: ${lowPrices._365d_price}\n\n`;
                    callback(null);
                });
            }, function (err) {
                callback(err, result);
            });
        } else {
            callback(null, null);
        }
    });
};
