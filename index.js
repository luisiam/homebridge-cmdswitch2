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

// Method to restore accessories from cache
cmdSwitchPlatform.prototype.configureAccessory = function(accessory) {
  var self = this;

  accessory.reachable = true

  self.setService(accessory);

  var accessoryName = accessory.context.name;
  self.accessories[accessoryName] = accessory;
}

// Method to setup new accesories from config.json
cmdSwitchPlatform.prototype.didFinishLaunching = function() {
  var self = this;

  for (var i in self.switches) {
    var data = self.switches[i];
    if (!self.accessories[data.name]){
      self.addAccessory(data);
    }
  }
}

// Method to setup new accessories added from HomeKit app
cmdSwitchPlatform.prototype.addAccessory = function(data) {
  var self = this;
  var uuid = UUIDGen.generate(data.name);

  // Setup accessory as SWITCH (8) category.
  var newAccessory = new Accessory(data.name, uuid, 8);

  // Store and initialize variables into context
  newAccessory.context.name = data.name;
  newAccessory.context.on_cmd = data.on_cmd;
  newAccessory.context.off_cmd = data.off_cmd;
  newAccessory.context.state_cmd = data.state_cmd;
  newAccessory.context.state = false;

  // Setup HomeKit switch service
  newAccessory.addService(Service.Switch, data.name);

  // Setup HomeKit accessory information
  var info = newAccessory.getService(Service.AccessoryInformation);
  if (data.manufacturer) {
    info.setCharacteristic(Characteristic.Manufacturer, data.manufacturer);
  }
  if (data.model) {
    info.setCharacteristic(Characteristic.Model, data.model);
  }
  if (data.serial) {
    info.setCharacteristic(Characteristic.SerialNumber, data.serial);
  }

  // Setup listeners for different switch event
  self.setService(newAccessory);

  // Register or update accessory in HomeKit
  if (self.accessories[data.name]) {
    self.api.updatePlatformAccessories([newAccessory]);
  } else {
    self.api.registerPlatformAccessories("homebridge-cmdswitch2", "cmdSwitch2", [newAccessory]);
  }

  self.accessories[data.name] = newAccessory;
}

// Method to remove accessories from HomeKit
cmdSwitchPlatform.prototype.removeAccessory = function(accessory) {
  if (accessory) {
    var name = accessory.context.name;
    this.api.unregisterPlatformAccessories("homebridge-cmdswitch2", "cmdSwitch2", [accessory]);
    delete this.accessories[name];
  }
}

// Method to setup listeners for different events
cmdSwitchPlatform.prototype.setService = function(accessory) {
  var self = this;

  accessory
    .getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .on('get', self.getPowerState.bind(this, accessory.context))
    .on('set', self.setPowerState.bind(this, accessory.context));

  accessory.on('identify', self.identify.bind(this, accessory.context));
}

// Method to determine current state
cmdSwitchPlatform.prototype.getPowerState = function(data, callback) {
  var self = this;
  var name = "[" + data.name + "] ";

  // Execute command to detect state
  if (data.state_cmd) {
    exec(data.state_cmd, function(error, stdout, stderr) {
      data.state = stdout ? true : false;
      self.log(name + "Current state: " + (data.state ? "On." : "Off."));
      callback(null, data.state);
    });
  } else {
    self.log(name + "Current state: " + (data.state ? "On." : "Off."));
    callback(null, data.state);
  }
}

// Method to set state
cmdSwitchPlatform.prototype.setPowerState = function(data, state, callback) {
  var self = this;
  var name = "[" + data.name + "] ";

  var cmd = state ? data.on_cmd : data.off_cmd;
  var tout = null;

  // Execute command to set state
  if (cmd) {
    exec(cmd, function(error, stdout, stderr) {
      // Error detection
      if (error && (state != data.state)) {
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
      self.log(name + "Turning " + (state ? "on" : "off") + " took too long, assuming success." );
      callback();
    }, 2000);
  } else {
    self.log(name + "Turned " + (state ? "on" : "off"));
    data.state = state;
    callback();
  }
}

// Method to handle identify request
cmdSwitchPlatform.prototype.identify = function(data, paired, callback) {
  var self = this;
  var name = "[" + data.name + "] ";

  self.log(name + "Identify requested!");
  callback();
}

// Method to handle plugin configuration in HomeKit app
cmdSwitchPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
  if (request && request.type === "Terminate") {
    return;
  }

  // Instruction
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
        // Operation choices
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
          // Info for new accessory
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
          var switches = Object.keys(self.accessories).map(function(k) {return self.accessories[k]});
          var names = switches.map(function(k) {return k.displayName});

          if (names.length > 0) {
            // Select existing accessory for modification or removal
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
        var newSwitch = {};

        // Setup input for addAccessory
        if (context.accessory) {
          var accessory = context.accessory;
          newSwitch["name"] = accessory.context.name;
          newSwitch["on_cmd"] = userInputs.on_cmd || accessory.context.on_cmd;
          newSwitch["off_cmd"] = userInputs.off_cmd || accessory.context.off_cmd;
          newSwitch["state_cmd"] = userInputs.state_cmd || accessory.context.state_cmd;
        } else {
          newSwitch["name"] = userInputs.name;
          newSwitch["on_cmd"] = userInputs.on_cmd;
          newSwitch["off_cmd"] = userInputs.off_cmd;
          newSwitch["state_cmd"] = userInputs.state_cmd;
          newSwitch["manufacturer"] = userInputs.manufacturer;
          newSwitch["model"] = userInputs.model;
          newSwitch["serial"] = userInputs.serial;
        }

        if (newSwitch["name"]) {
          // Register or update accessory in HomeKit
          this.addAccessory(newSwitch);
          var respDict = {
            "type": "Interface",
            "interface": "instruction",
            "title": "Success",
            "detail": "The new switch is now updated.",
            "showNextButton": true
          };

          context.step = 5;
        } else {
          // Error if required info is missing
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
          // Modify info of selected accessory
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
          // Remove selected accessory from HomeKit
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
        // Update config.json accordingly
        var self = this;
        delete context.step;
        var newConfig = self.config;
        var newSwitches = Object.keys(self.accessories).map(function(k) {
          var accessory = self.accessories[k];
          var data = {
            'name': accessory.context.name,
            'on_cmd': accessory.context.on_cmd,
            'off_cmd': accessory.context.off_cmd,
            'state_cmd': accessory.context.state_cmd
          };
          return data;
        });

        newConfig.switches = newSwitches;
        callback(null, "platform", true, newConfig);
        break;
    }
  }
}
