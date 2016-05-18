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
  this.log = log;
  this.config = config || {"platform": "cmdSwitch2"};
  this.switches = this.config.switches || [];

  this.accessories = {};

  if (api) {
    this.api = api;
    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }
}

// Method to restore accessories from cache
cmdSwitchPlatform.prototype.configureAccessory = function(accessory) {
  this.setService(accessory);
  var accessoryName = accessory.context.name;
  this.accessories[accessoryName] = accessory;
}

// Method to setup accesories from config.json
cmdSwitchPlatform.prototype.didFinishLaunching = function() {
  // Add or update accessories defined in config.json
  for (var i in this.switches) {
    var data = this.switches[i];
    this.addAccessory(data);
  }

  // Remove extra accessories in cache
  for (var name in this.accessories) {
    var accessory = this.accessories[name];
    if (!accessory.reachable) {
      this.removeAccessory(accessory);
    }
  }
}

// Method to add and update HomeKit accessories
cmdSwitchPlatform.prototype.addAccessory = function(data) {
  if (!this.accessories[data.name]) {
    var uuid = UUIDGen.generate(data.name);

    // Setup accessory as SWITCH (8) category.
    var newAccessory = new Accessory(data.name, uuid, 8);

    // New accessory is always reachable
    newAccessory.reachable = true;

    // Store and initialize variables into context
    newAccessory.context.name = data.name;
    newAccessory.context.on_cmd = data.on_cmd;
    newAccessory.context.off_cmd = data.off_cmd;
    newAccessory.context.state_cmd = data.state_cmd;
    newAccessory.context.state = false;

    // Setup HomeKit switch service
    newAccessory.addService(Service.Switch, data.name);

    // Setup listeners for different switch events
    this.setService(newAccessory);

    // Register accessory in HomeKit
    this.api.registerPlatformAccessories("homebridge-cmdswitch2", "cmdSwitch2", [newAccessory]);
  } else {
    // Retrieve accessory from cache
    var newAccessory = this.accessories[data.name];

    // Accessory is reachable if it's found in config.json
    newAccessory.updateReachability(true);

    // Update variables in context
    newAccessory.context.on_cmd = data.on_cmd;
    newAccessory.context.off_cmd = data.off_cmd;
    newAccessory.context.state_cmd = data.state_cmd;
  }

  // Retrieve initial state
  this.getInitState(newAccessory, data);

  // Store accessory in cache
  this.accessories[data.name] = newAccessory;
}

// Method to remove accessories from HomeKit
cmdSwitchPlatform.prototype.removeAccessory = function(accessory) {
  if (accessory) {
    var name = accessory.context.name;
    this.log("[" + name + "] Removed from HomeBridge.");
    this.api.unregisterPlatformAccessories("homebridge-cmdswitch2", "cmdSwitch2", [accessory]);
    delete this.accessories[name];
  }
}

// Method to setup listeners for different events
cmdSwitchPlatform.prototype.setService = function(accessory) {
  accessory
    .getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .on('get', this.getPowerState.bind(this, accessory.context))
    .on('set', this.setPowerState.bind(this, accessory.context));

  accessory.on('identify', this.identify.bind(this, accessory.context));
}

// Method to retrieve initial state
cmdSwitchPlatform.prototype.getInitState = function(accessory, data) {
  var info = accessory.getService(Service.AccessoryInformation);

  if (data.manufacturer) {
    accessory.context.manufacturer = data.manufacturer;
    info.setCharacteristic(Characteristic.Manufacturer, data.manufacturer.toString());
  }

  if (data.model) {
    accessory.context.model = data.model;
    info.setCharacteristic(Characteristic.Model, data.model.toString());
  }

  if (data.serial) {
    accessory.context.serial = data.serial;
    info.setCharacteristic(Characteristic.SerialNumber, data.serial.toString());
  }

  accessory
    .getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .getValue();
}

// Method to determine current state
cmdSwitchPlatform.prototype.getPowerState = function(thisSwitch, callback) {
  var self = this;
  var name = "[" + thisSwitch.name + "] ";

  // Execute command to detect state
  if (thisSwitch.state_cmd) {
    exec(thisSwitch.state_cmd, function(error, stdout, stderr) {
      thisSwitch.state = stdout ? true : false;
      self.log(name + "Current state: " + (thisSwitch.state ? "On." : "Off."));
      callback(null, thisSwitch.state);
    });
  } else {
    self.log(name + "Current state: " + (thisSwitch.state ? "On." : "Off."));
    callback(null, thisSwitch.state);
  }
}

// Method to set state
cmdSwitchPlatform.prototype.setPowerState = function(thisSwitch, state, callback) {
  var self = this;
  var name = "[" + thisSwitch.name + "] ";

  var cmd = state ? thisSwitch.on_cmd : thisSwitch.off_cmd;
  var notCmd = state ? thisSwitch.off_cmd : thisSwitch.on_cmd;
  var tout = null;

  // Execute command to set state
  if (cmd) {
    exec(cmd, function(error, stdout, stderr) {
      // Error detection
      if (error && (state != thisSwitch.state)) {
        self.log(name + "Failed to turn " + (state ? "on!" : "off!"));
      } else {
        self.log(name + "Turned " + (state ? "on." : "off."));
        thisSwitch.state = state;
        error = null;
      }

      // Restore switch after 1s if only one command exists
      if (!notCmd && !thisSwitch.state_cmd) {
        setTimeout(function() {
          self.accessories[thisSwitch.name]
            .getService(Service.Switch)
            .setCharacteristic(Characteristic.On, !state);
        }, 1000);
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
  var name = "[" + data.name + "] ";

  this.log(name + "Identify requested!");
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
          var switches = Object.keys(this.accessories).map(function(k) {return self.accessories[k]});
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
        if (context.selected) {
          var accessory = this.accessories[context.selected];
          newSwitch.name = context.selected;
          newSwitch.on_cmd = userInputs.on_cmd || accessory.context.on_cmd;
          newSwitch.off_cmd = userInputs.off_cmd || accessory.context.off_cmd;
          newSwitch.state_cmd = userInputs.state_cmd || accessory.context.state_cmd;
          newSwitch.manufacturer = userInputs.manufacturer;
          newSwitch.model = userInputs.model;
          newSwitch.serial = userInputs.serial;
        } else {
          newSwitch.name = userInputs.name;
          newSwitch.on_cmd = userInputs.on_cmd;
          newSwitch.off_cmd = userInputs.off_cmd;
          newSwitch.state_cmd = userInputs.state_cmd;
          newSwitch.manufacturer = userInputs.manufacturer;
          newSwitch.model = userInputs.model;
          newSwitch.serial = userInputs.serial;
        }

        if (newSwitch.name) {
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
            "title": accessory.displayName.toString(),
            "items": [{
              "id": "on_cmd",
              "title": "CMD to Turn On",
              "placeholder": "Leave blank if unchanged"
            }, {
              "id": "off_cmd",
              "title": "CMD to Turn Off",
              "placeholder": "Leave blank if unchanged"
            }, {
              "id": "state_cmd",
              "title": "CMD to Check ON State",
              "placeholder": "Leave blank if unchanged"
            }, {
              "id": "manufacturer",
              "title": "Manufacturer",
              "placeholder": "Leave blank if unchanged"
            }, {
              "id": "model",
              "title": "Model",
              "placeholder": "Leave blank if unchanged"
            }, {
              "id": "serial",
              "title": "Serial",
              "placeholder": "Leave blank if unchanged"
            }]
          };

          context.selected = accessory.context.name;
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
        var newConfig = this.config;
        var newSwitches = Object.keys(this.accessories).map(function(k) {
          var accessory = self.accessories[k];
          var data = {
            'name': accessory.context.name,
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
