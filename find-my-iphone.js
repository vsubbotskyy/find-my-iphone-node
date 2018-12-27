var icloud = require('./icloud');

module.exports = function (RED) {
  function FindMyIphone(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var device;
    icloud.apple_id = this.credentials.username
    icloud.password = this.credentials.password
    this.devicename = config.devicename;
    findMyPhone = icloud.findmyphone;

    this.on('input', function (msg) {
      node.status({fill: "yellow", shape: "ring", text: "getting device data..."});
      icloud.getDevices(function (err, devices) {
        var error = false;
	// failed to get device information
        if (err) {
          node.error('Error getting devices', err);
	  error = true;
	}
	else if (!devices) {
	  node.error('No devices',err);
	  error = true;
	}
	else {
        }

	if (error) {
          node.status({fill: "red", shape: "dot", text: "Connection failed"});
          setTimeout(function () {
            node.status({});
          }, 10000)
          return;
	}

        node.status({fill: "green", shape: "dot", text: "Connected"});
	//node.info("the entered device name is " + node.devicename)
	devices.forEach(function(d) {
		//node.info("the received device name is " + d.name);
		if (d.name == node.devicename) {
			device=d;
			return;
		}
	});
	
	icloud.alertDevice(device.id, function(err) {
		node.log("Device found: " + device.name);
	});
        
	// send all devices to the same output: [[msg, msg]]
        node.send([devices.map(function (device) {
          return {payload: device}
        })]);

        // clear the status
        setTimeout(function () {
          node.status({});
        }, 2000)
      });
    });
  }

  RED.nodes.registerType("find-my-iphone", FindMyIphone, {
    credentials: {
      username: {type: "text"},
      password: {type: "password"}
    }
  });
}
