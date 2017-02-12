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
var fs = require('fs');
var DeviceMessage = require("./device_message.js");

console.log("Hugs 1.1.3");

var pjson = require('./package.json');
console.log(pjson.name + ' : ' + pjson.version);

// add any UPM requires that you need
// and the rest of your app goes here
// see the samples for more detailed examples

var noble = require('noble');

console.log('MRAA Version: ' + mraa.getVersion());

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

var relayStates = [];
var activeHugs = [];
var messageQueue = [];

const STATUS_STARTING = 0;
const STATUS_TEST_CYCLE = 1;
const STATUS_QUEUE_ACTIVE = 2;

var leds = [led1, led2, led3, led4, led5, led6, led7, led8];
var numberLeds = leds.length;

var status = STATUS_STARTING;

turnOffAllLights();
testCycleLights();
//turnOnAllLights();

startProcessQueue();

server();

// Starts the built-in web server for the JSON data
// from the stored barometer readings
function server() {
    var app = require("express")();
    app.get('/', function (req, res) {
        res.send('<html><head><title>Group Hug</title><meta http-equiv="refresh" content="5"></head><body><center><h1>Group Hug</h1><p>Connected devices: ' + connectedDevices + '</p><p>Active hugs: (' + activeHugs.length + ') ' + activeHugs + '</p><p>Relay states: ' + relayStates + '</p><p><a href="all_off">All Off</a></p><h2>Override</h2><p><a href="hugs1">1 hug</a> | <a href="hugs2">2 hugs</a> | <a href="hugs3">3 hugs</a> | <a href="hugs4">4 hugs</a> | <a href="hugs5">5 hugs</a> | <a href="hugs6">6 hugs</a> | <a href="hugs7">7 hugs</a> | <a href="hugs8">8 hugs</a></center></body></html>');
    });

    app.get("/hugs", function(req, res) { res.json(activeHugs); });
    app.get("/status", function(req, res) { res.json(status); });
    app.get("/devices", function(req, res) { res.json(connectedDevices);});
    app.get("/all_off", function(req, res) {
        turnOffAllLights();
        res.redirect('/');
    });
    app.get("/hugs1", function(req, res) {
        enableLights(1);
        res.redirect('/');
    });
    app.get("/hugs2", function(req, res) {
        enableLights(2);
        res.redirect('/');
    });
    app.get("/hugs3", function(req, res) {
        enableLights(3);
        res.redirect('/');
    });
    app.get("/hugs4", function(req, res) {
        enableLights(4);
        res.redirect('/');
    });
    app.get("/hugs5", function(req, res) {
        enableLights(5);
        res.redirect('/');
    });
    app.get("/hugs6", function(req, res) {
        enableLights(6);
        res.redirect('/');
    });
    app.get("/hugs7", function(req, res) {
        enableLights(7);
        res.redirect('/');
    });
    app.get("/hugs8", function(req, res) {
        enableLights(8);
        res.redirect('/');
    });
    app.listen(3000);
}

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
                            //console.log('Error: ' + error);
                        }
                    });

                    buttonCharacteristic.on('data', function(data, isNotification) {
                        //console.log('data ' + data.toString('hex') + ' ' + buttonCharacteristic._peripheralId);
                        var button = data.readUInt8(3);
                        var velocity = data.readUInt8(4);
                        var buttonIdentifier = buttonCharacteristic._peripheralId + ':' + button;
                        //console.log('button ' + buttonIdentifier + ' velocity ' + velocity);
                        
                        var date = new Date();
                        var current_hour = date.getHours();
                        var current_day = date.getDate();

                        var filename = '/home/root/hugs' + current_day + '-' + current_hour + '.csv';
                        //console.log(filename);
                        fs.appendFile(filename, buttonCharacteristic._peripheralId + ',' + button + ',' + new Date().toISOString() + ',' + velocity + '\n', function (err) {
                            if (err) throw err;
                                //console.log('The "data to append" was appended to file!');
                            });
                        
                        var message = new DeviceMessage(buttonCharacteristic._peripheralId, button, velocity);
                        messageQueue.push(message);
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
            relayStates[i] = EV_DRIVER_ON;
            led.write(EV_DRIVER_ON);
        } else {
            relayStates[i] = EV_DRIVER_OFF;
            led.write(EV_DRIVER_OFF);
        }
    }
}

function testCycleLights() {
    status = STATUS_TEST_CYCLE;
    var testHugs = 0;
    var periodicActivity = function() {
        enableLights(testHugs);

        testHugs++;

        if(testHugs > numberLeds + 1) {
            testHugs = 0;
            clearInterval(intervalID);
            turnOffAllLights();
        }
    };
    var intervalID = setInterval(periodicActivity, 1000) ;  // start the periodic toggle
}

function turnOffAllLights() {
    activeHugs = [];
    for (var i = 0; i < numberLeds; i++) {
        relayStates[i] = EV_DRIVER_OFF;
        var led = leds[i];
        led.dir(mraa.DIR_OUT);
        led.write(EV_DRIVER_OFF);
    }
}

function turnOnAllLights() {
    for (var i = 0; i < numberLeds; i++) {
        relayStates[i] = EV_DRIVER_ON;
        var led = leds[i];
        led.dir(mraa.DIR_OUT);
        led.write(EV_DRIVER_ON);
    }
}

function startProcessQueue() {
    status = STATUS_QUEUE_ACTIVE;
    var processQueue = function() {
        
        if(messageQueue.length > 0) {
            //console.log('Queue size: ' + messageQueue.length);

            var message = messageQueue.shift();
            //console.log(message.getDevice() + ' - ' + message.getButton() + ' - ' + message.getVelocity());
            var buttonIdentifier = message.getButtonIdentifier();
            var velocity = message.getVelocity();
            
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

            /*
            var hugsReport = 'Hugs: ' + hugs;
            for (var i in activeHugs) {
                hugsReport += ' ' + activeHugs[i];
            }
            console.log(hugsReport);
            */
            if(hugs > numberLeds) {
                activeHugs = [];
                hugs = 0;
            }
            enableLights(hugs);
        }   
    };
    
    var intervalID = setInterval(processQueue, 1);
}
