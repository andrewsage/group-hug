/*
 * Blank IoT Node.js starter app.
 *
 * Use this template to start an IoT Node.js app on any supported IoT board.
 * The target board must support Node.js. It is helpful if the board includes
 * support for I/O access via the MRAA and UPM libraries.
 *
 * https://software.intel.com/en-us/xdk/docs/lp-xdk-iot
 */

// keep /*jslint and /*jshint lines for proper jshinting and jslinting
// see http://www.jslint.com/help.html and http://jshint.com/docs
/* jslint node:true */
/* jshint unused:true */

"use strict" ;

var mraa = require("mraa") ;

// add any UPM requires that you need
// and the rest of your app goes here
// see the samples for more detailed examples

var noble = require('noble');

console.log('MRAA Version: ' + mraa.getVersion());

// BLE Peripheral setup
var bleno = require('bleno');
var BlenoPrimaryService = bleno.PrimaryService;
var FirstCharacteristic = require('./characteristic');

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('feedback', ['fc00']);
  }
  else {
    if(state === 'unsupported'){
      console.log("NOTE: BLE and Bleno configurations not enabled on board, see README.md for more details...");
    }
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new BlenoPrimaryService({
        uuid: 'fc00',
        characteristics: [
          new FirstCharacteristic()
        ]
      })
    ]);
  }
});

bleno.on('accept', function(clientAddress) {
    console.log("Accepted Connection with Client Address: " + clientAddress);
});

bleno.on('disconnect', function(clientAddress) {
    console.log("Disconnected Connection with Client Address: " + clientAddress);
});


// Groups Hugs relays etc.
var hugs = 0;

var led1 = new mraa.Gpio(2);
var led2 = new mraa.Gpio(3);
var led3 = new mraa.Gpio(4);
var led4 = new mraa.Gpio(5);
var led5 = new mraa.Gpio(6);
var led6 = new mraa.Gpio(7);
var led7 = new mraa.Gpio(8);
var led8 = new mraa.Gpio(9);

const EV_DRIVER_OFF = 1;
const EV_DRIVER_ON = 0;

var activeHugs = [];

var leds = [led1, led2, led3, led4, led5, led6, led7, led8];
var numberLeds = leds.length;

turnOffAllLights();
testCycleLights();

// BLE Central setup
var standardServiceUUID = "03b80e5aede84b33a7516ce34ec4c700";
var standardButtonCharacteristicUUID = "7772e5db38684112a1a9f2669d106bf3";

var connectedDevices = [];

noble.on('stateChange', function(state) {
        console.log('state changed: ' + state);
        if (state == 'poweredOn') {
                startScan();
        } else {
                noble.stopScanning();
        }
});

noble.on('scanStop', function() {
        console.log('Scanning stopped');
});

noble.on('scanStart', function() {
        console.log('Scanning started');
});

noble.on('discover', function(peripheral) {
    if (peripheral.advertisement.localName == 'novppia1') {

        peripheral.once('disconnect', function() {
            console.log('disconnected from ' + peripheral.uuid);
            var index = connectedDevices.indexOf(peripheral.uuid);
            if(index > -1) {
                connectedDevices.splice(index, 1);
                startScan();
            }
        });

        if(connectedDevices.indexOf(peripheral.uuid) == -1) {
            connectedDevices.push(peripheral.uuid);
            console.log('Found device with uuid: ' + peripheral.uuid);
            console.log('Found device with local name: ' + peripheral.advertisement.localName);
            console.log('advertising the following service uuid\'s: ' + peripheral.advertisement.serviceUuids);
            console.log();

            connect(peripheral);
        }
    }
});

function startScan() {
    // only scan for devices advertising these service UUID's (default or empty array => any peripherals
    var serviceUuids = [standardServiceUUID];

    // allow duplicate peripheral to be returned (default false) on discovery event
    var allowDuplicates = true;

    noble.startScanning(serviceUuids, allowDuplicates);
}

function connect(peripheral) {
    peripheral.connect(function(error) {
        console.log('connected to peripheral: ' + peripheral.uuid);

        peripheral.discoverServices([standardServiceUUID], function(error, services) {
            console.log('discovered the following services:' + services);
            for(var idxService = 0; idxService < services.length; idxService++){
                console.log(' ' + idxService + ' service uuid: ' + services[idxService].uuid);

                var service = services[idxService];
                service.discoverCharacteristics([standardButtonCharacteristicUUID], function(error, characteristics) {
                    console.log('Button characteristic discovered');
                    /*
                    console.log('discovered the following characteristics:');

                    for (var i in characteristics) {
                        console.log('  ' + i + ' uuid: ' + characteristics[i].uuid);
                    }
                    */

                    var buttonCharacteristic = characteristics[0];
                    buttonCharacteristic.subscribe(function(error) {
                        if(error !== null) {
                            console.log('Error: ' + error);
                        }
                    });

                    buttonCharacteristic.on('data', function(data, isNotification) {
                        console.log('data ' + data.toString('hex') + ' ' + buttonCharacteristic._peripheralId);
                        var button = data.readUInt8(3);
                        var velocity = data.readUInt8(4);
                        var buttonIdentifier = buttonCharacteristic._peripheralId + ':' + button;
                        console.log('button ' + buttonIdentifier + ' velocity ' + velocity);
                        if (velocity > 0) {
                            if(activeHugs.indexOf(buttonIdentifier) == -1) {
                                activeHugs.push(buttonIdentifier);
                            }
                        } else {
                            var index = activeHugs.indexOf(buttonIdentifier);
                            if(index > -1) {
                                activeHugs.splice(index, 1);
                            }
                        }

                        hugs = activeHugs.length;

                        var hugsReport = 'Hugs: ' + hugs;
                        for (var i in activeHugs) {
                            hugsReport += ' ' + activeHugs[i];
                        }
                        console.log(hugsReport);

                        enableLights(hugs);
                    });

                    buttonCharacteristic.notify(true, function(error) {
                        console.log('value notification on');
                    });
                });
            }
        });
    });
}

function enableLights(hugs) {
    for (var i = 0; i < numberLeds; i++) {
        var led = leds[i];
        if (hugs >= i + 1) {
            led.write(EV_DRIVER_ON);
        } else {
            led.write(EV_DRIVER_OFF);
        }
    }
}

function testCycleLights() {

    var testHugs = 0;
    var periodicActivity = function() {
        enableLights(testHugs);

        testHugs++;

        if(testHugs > numberLeds) {
            testHugs = 0;
            clearInterval(intervalID);
            turnOffAllLights();
        }
    };
    var intervalID = setInterval(periodicActivity, 1000) ;  // start the periodic toggle
}

function turnOffAllLights() {
    for (var i = 0; i < numberLeds; i++) {
        var led = leds[i];
        led.dir(mraa.DIR_OUT);
        led.write(EV_DRIVER_OFF);
    }
}
