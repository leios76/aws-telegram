exports.processCommand = function (args, callback) {
    var result = {};
    result.message = '';
    result.markup = {};
    result.message += "TEST";

    result.markup.inline_keyboard = [[{
        'text': 'Done',
        'callback_data': 'test_done'
    }]];
    callback(null, result);
};
