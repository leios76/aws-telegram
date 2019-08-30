const request = require('request');
const config = require('config');
const fs = require('fs');

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

fs.readFile("config/event.json", function (err, data) {
    if (err) {
        console.log(err);
        return;
    }

    var telegramConfig = config.get('telegram');
    var option = {
        uri: telegramConfig.develop_api_url,
        method: 'POST',
        json: true,
        body: JSON.parse(data)
    };

    req(option, function (err, res, body) {
        console.log(body);
    });
})
