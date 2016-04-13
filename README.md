# homebridge-cmdswitch2 [![npm version](https://badge.fury.io/js/homebridge-cmdswitch2.svg)](https://badge.fury.io/js/homebridge-cmdswitch2)
CMD Plugin for [HomeBridge](https://github.com/nfarina/homebridge) (API 2.0)

Older version with API 1.0: [homebridge-cmdswitch](https://github.com/luisiam/homebridge-cmdswitch)

Basics of how this plugin works:<br>
1. Execute `on_cmd` command when the switch is turned to ON.<br>
2. Execute `off_cmd` command when the switch is turned to OFF.<br>
3. Execute `state_cmd` when checking the state.<br>
&nbsp;&nbsp;&nbsp;&nbsp;a. If there's no error, return ON.<br>
&nbsp;&nbsp;&nbsp;&nbsp;b. If there's error, return OFF.<br>

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

# Advanced Configuration (Optional)
This step is not required. HomeBridge with API 2.0 can handle configurations in the HomeKit app.
 ```
"platforms": [{
    "platform": "cmdSwitch2",
    "switches": [{
        "name" : "HTPC",
        "on_cmd": "wakeonlan XX:XX:XX:XX:XX:XX",
        "off_cmd": "net rpc shutdown -I XXX.XXX.XXX.XXX -U user%password",
        "state_cmd": "ping -c 2 -W 1 XXX.XXX.XXX.XXX | grep -i '2 received'",
    }, {
        "name" : "Playstation 4",
        "on_cmd": "ps4-waker",
        "off_cmd": "ps4-waker standby",
        "state_cmd": "ps4-waker search | grep -i '200Ok'",
        "manufacturer": "Sony Corporation",
        "model": "CUH-1001A",
        "serial": "XXXXXXXXXXX"
    }]
}]
```


| Fields       | Description                                       | Required |
|--------------|---------------------------------------------------|----------|
| platform     | Must always be `cmdSwitch2`.                      | Yes      |
| name         | The name of your device.                          | Yes      |
| on_cmd       | The command to turn on your device.               | No       |
| off_cmd      | The command to turn off your device.              | No       |
| state_cmd    | The command to detect an ON state of your device. | No       |
| manufacturer | The manufacturer of your device.                  | No       |
| model        | The model of your device.                         | No       |
| serial       | The serial number of your device.                 | No       |
