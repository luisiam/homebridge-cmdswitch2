var exec = require("child_process").exec;
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-cmdswitch2", "cmdSwitch2", cmdSwitchPlatform, true);
}

function cmdSwitchPlatform(log, config, api) {
  var self = this;

  self.log = log;
  self.config = config || {"platform": "cmdSwitch2"};
  self.switches = self.config.switches || [];

  self.accessories = {};

  if (api) {
    self.api = api;

    self.api.on('didFinishLaunching', self.didFinishLaunching.bind(this));
  }
}

cmdSwitchPlatform.prototype.configureAccessory = function(accessory) {
  var self = this;
  var name = "[" + accessory.displayName + "] ";

  accessory.reachable = true
  accessory
    .getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .on('get', this.getPowerState.bind(this, accessory))
    .on('set', this.setPowerState.bind(this, accessory));

  accessory.on('identify', function(paired, callback) {
    self.log(name + "Identify requested!");
    callback();
  });

  var accessoryName = accessory.displayName;
  self.accessories[accessoryName] = accessory;
}

// Method to determine current state
cmdSwitchPlatform.prototype.getPowerState = function(accessory, callback) {
  var self = this;
  var data = accessory.context;
  var name = "[" + accessory.displayName + "] ";

  // Execute command to detect state
  if (data.state_cmd) {
    exec(data.state_cmd, function(error, stdout, stderr) {
      data.state = stdout ? true : false;
      self.log(name + "Current state: " + (data.state ? "On." : "Off."));
      callback(null, data.state);
    });
  } else {
    this.log(name + "Current state: " + (data.state ? "On." : "Off."));
    callback(null, data.state);
  }
}

// Method to set state
cmdSwitchPlatform.prototype.setPowerState = function(accessory, state, callback) {
  var self = this;
  var data = accessory.context;
  var name = "[" + accessory.displayName + "] ";

  var cmd = state ? data.on_cmd : data.off_cmd;
  var tout = null;

  // Execute command to set state
  if (cmd) {
    exec(cmd, function(error, stdout, stderr) {

      // Error detection
      if (error && (state != datat.state)) {
        self.log(name + stderr);
        self.log(name + "Failed to turn " + (state ? "on!" : "off!"));
      } else {
        self.log(name + "Turned " + (state ? "on." : "off."));
        data.state = state;
        error = null;
      }

      if (tout) {
        clearTimeout(tout);
        callback(error);
      }
    });

    // Allow 2s to set state but otherwise assumes success
    tout = setTimeout(function() {
      tout = null;
      self.log(name + "Turning " + (state ? "on " : "off ") + " took too long, assuming success." );
      callback();
    }, 2000);
  } else {
    this.log(name + "Turned " + (state ? "on" : "off"));
    data.state = state;
    callback();
  }
}

cmdSwitchPlatform.prototype.didFinishLaunching = function() {
  var self = this;

  for (var i in self.switches) {
    var data = self.switches[i];
    self.addAccessory(data.name, data.on_cmd, data.off_cmd, data.state_cmd, data.manufacturer, data.model, data.serial);
  }
}

cmdSwitchPlatform.prototype.addAccessory = function(name, on_cmd, off_cmd, state_cmd, manufacturer, model, serial) {
  var self = this;
  var uuid = UUIDGen.generate(name);

  var newAccessory = new Accessory(name, uuid, 8);
  newAccessory.context.on_cmd = on_cmd;
  newAccessory.context.off_cmd = off_cmd;
  newAccessory.context.state_cmd = state_cmd;
  newAccessory.context.state = false;

  newAccessory.addService(Service.Switch, name);

  var info = newAccessory.getService(Service.AccessoryInformation);
  if (manufacturer) {
    newAccessory.context.manufacturer = manufacturer;
    info.setCharacteristic(Characteristic.Manufacturer, manufacturer);
  }
  if (model) {
    newAccessory.context.model = model;
    info.setCharacteristic(Characteristic.Model, model);
  }
  if (serial) {
    newAccessory.context.serial = serial;
    info.setCharacteristic(Characteristic.SerialNumber, serial);
  }

  newAccessory.on('identify', function(paired, callback) {
    self.log("[" + name + "] Identify requested!");
    callback();
  });
  
  if (this.accessories[name]) {
    this.api.updatePlatformAccessories([newAccessory]);
  } else {
    this.api.registerPlatformAccessories("homebridge-cmdswitch2", "cmdSwitch2", [newAccessory]);
  }

  this.accessories[name] = newAccessory;
}

cmdSwitchPlatform.prototype.removeAccessory = function(accessory) {
  if (accessory) {
    var name = accessory.displayName;
    this.api.unregisterPlatformAccessories("homebridge-cmdswitch2", "cmdSwitch2", [accessory]);
    delete this.accessories[name];
  }
}

cmdSwitchPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
  if (request && request.type === "Terminate") {
    return;
  }

  if (!context.step) {
    var instructionResp = {
      "type": "Interface",
      "interface": "instruction",
      "title": "Before You Start...",
      "detail": "Please make sure homebridge is running with elevated privileges.",
      "showNextButton": true
    }

    context.step = 1;
    callback(instructionResp);
  } else {
    switch (context.step) {
      case 1:
        var respDict = {
          "type": "Interface",
          "interface": "list",
          "title": "What do you want to do?",
          "items": [
            "Add New Switch",
            "Modify Existing Switch",
            "Remove Existing Switch"
          ]
        }
        context.step = 2;
        callback(respDict);
        break;
      case 2:
        var selection = request.response.selections[0];
        if (selection === 0) {
          var respDict = {
            "type": "Interface",
            "interface": "input",
            "title": "New Switch",
            "items": [{
              "id": "name",
              "title": "Name (Required)",
              "placeholder": "HTPC"
            }, {
              "id": "on_cmd",
              "title": "CMD to Turn On",
              "placeholder": "wakeonlan XX:XX:XX:XX:XX:XX"
            }, {
              "id": "off_cmd",
              "title": "CMD to Turn Off",
              "placeholder": "net rpc shutdown -I XXX.XXX.XXX.XXX -U user%password"
            }, {
              "id": "state_cmd",
              "title": "CMD to Check ON State",
              "placeholder": "ping -c 2 -W 1 XXX.XXX.XXX.XXX | grep -i '2 received'"
            }, {
              "id": "manufacturer",
              "title": "Manufacturer",
              "placeholder": "Default-Manufacturer"
            }, {
              "id": "model",
              "title": "Model",
              "placeholder": "Default-Model"
            }, {
              "id": "serial",
              "title": "Serial Number",
              "placeholder": "Default-SerialNumber"
            }]
          };
          context.step = 3;
          callback(respDict);
        } else {
          var self = this;
          var switches = Object.keys(this.accessories).map(function(k) {return self.accessories[k]});
          var names = switches.map(function(k) {return k.displayName});

          if (names.length > 0) {
            if (selection === 1) {
              var title = "Witch switch do you want to modify?";
              context.modify = 1;
            } else {
              var title = "Witch switch do you want to remove?";
              context.modify = 0;
            }
            var respDict = {
              "type": "Interface",
              "interface": "list",
              "title": title,
              "items": names
            };
            context.switches = switches;
            context.step = 4;
          } else {
            var respDict = {
              "type": "Interface",
              "interface": "instruction",
              "title": "Unavailable",
              "detail": "No switch is configured.",
              "showNextButton": true
            };
            context.step = 1;
          }
          callback(respDict);
        }
        break;
      case 3:
        var userInputs = request.response.inputs;
        if (context.accessory) {
          var accessory = context.accessory;
          var name = accessory.displayName;
          var on_cmd = userInputs.on_cmd || accessory.context.on_cmd;
          var off_cmd = userInputs.off_cmd || accessory.context.off_cmd;
          var state_cmd = userInputs.state_cmd || accessory.context.state_cmd;
        } else {
          var name = userInputs.name;
          var on_cmd = userInputs.on_cmd;
          var off_cmd = userInputs.off_cmd;
          var state_cmd = userInputs.state_cmd;
          var manufacturer = userInputs.manufacturer;
          var model = userInputs.model;
          var serial = userInputs.serial;
        }

        if (name) {
          this.addAccessory(name, on_cmd, off_cmd, state_cmd, manufacturer, model, serial);
          var respDict = {
            "type": "Interface",
            "interface": "instruction",
            "title": "Success",
            "detail": "The new switch is now updated.",
            "showNextButton": true
          };
          context.step = 5;
        } else {
          var respDict = {
            "type": "Interface",
            "interface": "instruction",
            "title": "Error",
            "detail": "Name of the switch is missing.",
            "showNextButton": true
          };
          context.step = 1;
        }
        callback(respDict);
        break;
      case 4:
        var selection = request.response.selections[0];
        var accessory = context.switches[selection];
        if (context.modify) {
          var respDict = {
            "type": "Interface",
            "interface": "input",
            "title": accessory.displayName,
            "items": [{
              "id": "on_cmd",
              "title": "CMD to Turn On",
              "placeholder": accessory.context.on_cmd
            }, {
              "id": "off_cmd",
              "title": "CMD to Turn Off",
              "placeholder": accessory.context.off_cmd
            }, {
              "id": "state_cmd",
              "title": "CMD to Check ON State",
              "placeholder": accessory.context.state_cmd
            }]
          };
          context.accessory = accessory;
          context.step = 3;
        } else {
          this.removeAccessory(accessory);
          var respDict = {
            "type": "Interface",
            "interface": "instruction",
            "title": "Success",
            "detail": "The switch is now removed.",
            "showNextButton": true
          };
          context.step = 5;
        }
        callback(respDict);
        break;
      case 5:
        var self = this;
        delete context.step;
        var newConfig = this.config;
        var newSwitches = Object.keys(this.accessories).map(function(k) {
          var accessory = self.accessories[k];
          var data = {
            'name': accessory.displayName,
            'on_cmd': accessory.context.on_cmd,
            'off_cmd': accessory.context.off_cmd,
            'state_cmd': accessory.context.state_cmd,
            'manufacturer': accessory.context.manufacturer,
            'model': accessory.context.model,
            'serial': accessory.context.serial
          };
          return data;
        });
        newConfig.switches = newSwitches;

        callback(null, "platform", true, newConfig);
        break;
    }
  }
}
