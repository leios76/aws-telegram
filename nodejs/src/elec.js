exports.processCommand = function (args, callback) {
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

    callback(message);
};
