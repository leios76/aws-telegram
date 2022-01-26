const AWS = require('aws-sdk');

AWS.config.update({
    region: 'ap-northeast-2',
    endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com"
});

//const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

var now;

exports.processCommand = function (args, callback) {
    now = Math.floor(Date.now() / 1000);
    var result = {};
    result.message = '';
    result.markup = {};

    callback(null, result);
};
