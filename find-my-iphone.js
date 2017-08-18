var icloud = require('./icloud');

module.exports = function (RED) {
  function FindMyIphone(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    icloud.apple_id = this.credentials.username
    icloud.password = this.credentials.password

    findMyPhone = icloud.findmyphone;

    this.on('input', function (msg) {
      node.status({fill: "yellow", shape: "ring", text: "getting device data..."});
      icloud.getDevices(function (err, devices) {
        // failed to get device information
        if (err || !devices) {
          node.error('Could not connect to icloud', err);
          node.status({fill: "red", shape: "dot", text: "Connection failed"});
          setTimeout(function () {
            node.status({});
          }, 10000)
          return;
        }

        node.status({fill: "green", shape: "dot", text: "Connected"});

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
