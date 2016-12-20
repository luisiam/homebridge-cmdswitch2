# homebridge-cmdswitch2 [![npm version](https://badge.fury.io/js/homebridge-cmdswitch2.svg)](https://badge.fury.io/js/homebridge-cmdswitch2)
CMD Plugin for [HomeBridge](https://github.com/nfarina/homebridge) (API 2.0)

Older version using API 1.0: [homebridge-cmdswitch](https://github.com/luisiam/homebridge-cmdswitch) (deprecated)

### Switching from homebridge-cmdswitch (API 1.0)
Users switching from homebridge-cmdswitch will need to remove their old config in `config.json` and use the new config. Hence, switch will show up as brand new device. This is due to the fact that API 2.0 only supports platform plugins and homebridge-cmdswitch was implemented as an accessory plugin. This means any configurations, alarms, scenes, etc to which the switch was associated will need to be updated with the new switch device.

### What this plugin does
This plugin allows you to run Command Line Interface (CLI) commands via HomeKit. This means you can run a simple commands such as `ping`, `shutdown`, or `wakeonlan` just by telling Siri to do so. An example usage for this plugin would be to turn on your PS4 or HTPC, check if it’s on, and even shut it down when finished.

### How this plugin works
1. `on_cmd`: This is the command issued when the switch is turned ON.
2. `off_cmd`: This is the command issued when the switch is turned OFF.
3. `state_cmd`: This is the command issued when HomeBridge checks the state of the switch.
  1. If `standard output` is not empty, HomeBridge is notified that the switch is ON.
  2. If `standard output` is empty, HomeBridge is notified that the switch is OFF.

### Things to know about this plugin
This plugin can only run CLI commands the same as you typing them yourself. In order to test if your `on_cmd`, `off_cmd`, or `state_cmd` are valid commands you need to run them from your CLI. Please keep in mind you will want to run these commands from the same user that runs (or owns) the HomeBridge service if different than your root user.

# Installation
1. Install homebridge using `npm install -g homebridge`.
2. Install this plugin using `npm install -g homebridge-cmdswitch2`.
3. Update your configuration file. See configuration sample below.

# Configuration
Edit your `config.json` accordingly. Configuration sample:
 ```
"platforms": [{
    "platform": "cmdSwitch2"
}]
```

### Advanced Configuration (Optional)
This step is not required. HomeBridge with API 2.0 can handle configurations in the HomeKit app.
 ```
"platforms": [{
    "platform": "cmdSwitch2",
    "name": "CMD Switch",
    "switches": [{
        "name" : "HTPC",
        "on_cmd": "wakeonlan XX:XX:XX:XX:XX:XX",
        "off_cmd": "net rpc shutdown -I XXX.XXX.XXX.XXX -U user%password",
        "state_cmd": "ping -c 2 -W 1 XXX.XXX.XXX.XXX | grep -i '2 received'"
    }, {
        "name" : "Playstation 4",
        "on_cmd": "ps4-waker",
        "off_cmd": "ps4-waker standby",
        "state_cmd": "ps4-waker search | grep -i '200 Ok'",
        "polling": true,
        "interval": 5,
        "manufacturer": "Sony Corporation",
        "model": "CUH-1001A",
        "serial": "XXXXXXXXXXX"
    }]
}]
```


| Fields           | Description                                           | Required |
|------------------|-------------------------------------------------------|----------|
| platform         | Must always be `cmdSwitch2`.                          | Yes      |
| name             | For logging purposes.                                 | No       |
| switches         | Array of switch config (multiple switches supported). | Yes      |
| \|- name\*       | Name of your device.                                  | Yes      |
| \|- on_cmd       | Command to turn on your device.                       | No       |
| \|- off_cmd      | Command to turn off your device.                      | No       |
| \|- state_cmd    | Command to detect an ON state of your device.         | No       |
| \|- polling      | State polling (Default false).                        | No       |
| \|- interval     | Polling interval in `s` (Default 1s).                 | No       |
| \|- manufacturer | Manufacturer of your device.                          | No       |
| \|- model        | Model of your device.                                 | No       |
| \|- serial       | Serial number of your device.                         | No       |
\*Changing the switch `name` in `config.json` will create a new switch instead of renaming the existing one in HomeKit. It's strongly recommended that you rename the switch using a HomeKit app only.
