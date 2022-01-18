exports.processCommand = function (args, callback) {
    var result = {};
    result.message = '';
    result.message += "TEST";

    callback(null, result);
};
