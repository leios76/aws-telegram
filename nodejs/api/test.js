exports.processCommand = function (args, callback) {
    var result = {};
    result.message = '';
    result.markup = {};
    result.message += "TEST";

    var row1 = [];
    for (i = 1; i <= 5; i++) {
        row1.push({'text': `${i*5}`, 'callback_data': 'test_done'});
    }
    result.markup.inline_keyboard = [
        row1,
        [{'text': 'Done', 'callback_data': 'test_done'}]
    ];
    callback(null, result);
};
