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

var connectedLed = new mraa.Gpio(13);
connectedLed.dir(mraa.DIR_OUT);
connectedLed.write(0);

var led1 = new mraa.Gpio(2);
var led2 = new mraa.Gpio(3);
var led3 = new mraa.Gpio(4);
var led4 = new mraa.Gpio(5);
var led5 = new mraa.Gpio(6);
var led6 = new mraa.Gpio(7);
var led7 = new mraa.Gpio(8);
var led8 = new mraa.Gpio(9);

var leds = [led1, led1, led2, led3, led4, led5, led6, led7, led8];
var numberLeds = leds.length;

for (var i = 0; i < numberLeds; i++) {
    var led = leds[i];
    led.dir(mraa.DIR_OUT);
}

var standardServiceUUID = "03b80e5aede84b33a7516ce34ec4c700";
var standardButtonCharacteristicUUID = "7772e5db38684112a1a9f2669d106bf3";

noble.on('stateChange', function(state) {
        console.log('state changed: ' + state);
        if (state == 'poweredOn') {
                noble.startScanning();
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

function connect(peripheral) {
    peripheral.connect(function(error) {
        console.log('connected to peripheral: ' + peripheral.uuid);
        connectedLed.write(1);

        peripheral.once('disconnect', function() {
            console.log('disconnected from ' + peripheral.uuid);
            connectedLed.write(0);
            noble.startScanning();
        });

        peripheral.discoverServices([standardServiceUUID], function(error, services) {
            //console.log('discovered the following services:' + services);
            for (var idxService in services) {
                //console.log(' ' + idxService + ' service uuid: ' + services[idxService].uuid);

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
                    /*
                    buttonCharacteristic.subscribe(function(error) {
                        console.log('Error: ' + error);
                    });
                    */

                    buttonCharacteristic.on('data', function(data, isNotification) {
                        var button = data.readUInt8(3) - 47;
                        var velocity = data.readUInt8(4);
                        console.log('button ' + button + ' velocity ' + velocity);
                        if (button > 0 && button < numberLeds) {
                            var led = leds[button];
                            if (velocity > 0) {
                                led.write(1);
                            } else {
                                led.write(0);
                            }
                        }
                    });

                    buttonCharacteristic.notify(true, function(error) {
                        console.log('value notification on');
                    });
                });
            }
        });
    });
}

noble.on('discover', function(peripheral) {
    if (peripheral.advertisement.localName == 'novppia1') {
        noble.stopScanning();
        console.log('Found device with local name: ' + peripheral.advertisement.localName);
        console.log('advertising the following service uuid\'s: ' + peripheral.advertisement.serviceUuids);
        console.log();

        connect(peripheral);
    }
});
