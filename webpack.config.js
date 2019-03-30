var path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        bundle: './client/js/forms.js',
    },
    output: {
        path: path.resolve(__dirname, './client'),
        filename: '[name].js'
    }
};