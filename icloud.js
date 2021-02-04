var request = require("request");
var util = require("util");
var tough = require('tough-cookie');
var Store = tough.MemoryCookieStore;

class iCloud {
	constructor(apple_id, password) {
		this.apple_id = apple_id;
		this.password = password;
		this.jar = request.jar(new Store());
	}

	init(callback) {
		if (this.apple_id == null || this.password == null) {
			return callback("Please define apple_id / password");
		}

		this.iRequest = request.defaults({
			jar: this.jar,
			headers: {
				"Origin": "https://www.icloud.com"
			}
		});
		
		var self = this;
		this.checkSession(function(err, res, body) {
			if (err) {
				//session is dead, start new
				self.iRequest = request.defaults({
					jar: self.jar,
					headers: {
						"Origin": "https://www.icloud.com"
					}
				});

				self.login(function(err, res, body) {
					return callback(err, res, body);
				});
			} else {
				console.log("reusing session");
				return callback(err, res, body);
			}
		});
	}

	login(callback) {
		var options = {
			url: "https://setup.icloud.com/setup/ws/1/login",
			json: {
				"apple_id": this.apple_id,
				"password": this.password,
				"extended_login": true
			}
		};

		var self = this;
		this.iRequest.post(options, function(error, response, body) {
			if (!response || response.statusCode != 200) {
				return callback("Login Error");
			}

			self.onLogin(body, function(err, resp, body) {
				return callback(err, resp, body);
			});
		});
	}

	checkSession(callback) {
		var options = {
			url: "https://setup.icloud.com/setup/ws/1/validate",
		};

		var self = this;
		this.iRequest.post(options, function(error, response, body) {

			if (!response || response.statusCode != 200) {
				return callback("Could not refresh session");
			}

			self.onLogin(JSON.parse(body), function(err, resp, body) {
				return callback(err, resp, body);
			});
		});
	}

	onLogin(body, callback) {
		if (body.hasOwnProperty("webservices") && body.webservices.hasOwnProperty("findme")) {
			this.base_path = body.webservices.findme.url;

			var options = {
				url: this.base_path + "/fmipservice/client/web/initClient",
				json: {
					"clientContext": {
						"appName": "iCloud Find (Web)",
						"appVersion": "2.0",
						"timezone": "US/Eastern",
						"inactiveTime": 3571,
						"apiVersion": "3.0",
						"fmly": true
					}
				}
			};

			
			//this.iRequest.post(options, callback);
			this.iRequest.post(options, function(error,response,body){
				if (!body)
					return callback("empty response");

				if (body.hasOwnProperty("status") && (body.status == "not allowed")) {
                                        return callback("not allowed to connect with provided credentials");
                                }
				else {
					callback(error,response,body);
				}
                        });
		} else {
			return callback("cannot parse webservice findme url");
		}
	}

	getDevices(callback) {
		this.init(function(error, response, body) {
			if (!response || response.statusCode != 200) {
				return callback(error);
			}

			var devices = [];

			// Retrieve each device on the account
			body.content.forEach(function(device) {
				devices.push({
					id: device.id,
					name: device.name,
					deviceModel: device.deviceModel,
					modelDisplayName: device.modelDisplayName,
					deviceDisplayName: device.deviceDisplayName,
					batteryLevel: device.batteryLevel,
					batteryStatus: device.batteryStatus,
					isLocating: device.isLocating,
					lostModeCapable: device.lostModeCapable,
					location: device.location
				});
			});

			callback(error, devices);
		});
	}

	alertDevice(deviceId, callback) {
		var options = {
			url: this.base_path + "/fmipservice/client/web/playSound",
			json: {
				"subject": "Amazon Echo Find My iPhone Alert",
				"device": deviceId
			}
		};
		this.iRequest.post(options, callback);
	}

	getLocationOfDevice(device, callback) {
		if (!device.location) {
			return callback("No location in device");
		}

		var googleUrl = "http://maps.googleapis.com/maps/api/geocode/json" +
			"?latlng=%d,%d&sensor=true";

		googleUrl =
			util.format(googleUrl,
				device.location.latitude, device.location.longitude);

		var req = {
			url: googleUrl,
			json: true
		};

		request(req, function(err, response, json) {
			if (!err && response.statusCode == 200) {
				if (Array.isArray(json.results) &&
					json.results.length > 0 &&
					json.results[0].hasOwnProperty("formatted_address")) {

					return callback(err, json.results[0].formatted_address);
				}
			}
			return callback(err);
		});
	}

	getDistanceOfDevice(device, myLatitude, myLongitude, callback) {
		if (device.location) {
			var googleUrl = "http://maps.googleapis.com/maps/api/distancematrix/json" +
				"?origins=%d,%d&destinations=%d,%d&mode=driving&sensor=false";

			googleUrl =
				util.format(googleUrl, myLatitude, myLongitude,
					device.location.latitude, device.location.longitude);

			var req = {
				url: googleUrl,
				json: true
			};

			request(req, function(err, response, json) {
				if (!err && response.statusCode == 200) {
					if (json && json.rows && json.rows.length > 0) {
						return callback(err, json.rows[0].elements[0]);
					}
					return callback(err);
				}
			});

		} else {
			callback("No location found for this device");
		}
	}
}

module.exports = {
	iCloud: iCloud
};
