var path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        bundle: './Client/client.js',
    },
    output: {
        path: path.resolve(__dirname, './Client'),
        filename: '[name].js'
    }
};