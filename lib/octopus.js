var Client = require('node-rest-client').Client,
	Promise = require('bluebird'),
	config = require('config');

var client = new Client();

var args = {
	headers: {
		"X-Octopus-ApiKey": config.get('octopus.key')
	}
};

module.exports = {
	dashboard: function() {
		return new Promise(function(fulfill, reject) {
			client.get(config.get('octopus.url') + 'dashboard', args, function(data, response) {
				if (response.statusCode === 200) {
					fulfill(JSON.parse(data.toString('utf8')));
				} else {
					reject(response);
				}
			});
		});
	}
};