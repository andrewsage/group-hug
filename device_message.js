var method = DeviceMessage.prototype;

function DeviceMessage(device, button, velocity) {
    this._device = device;
    this._button = button;
    this._velocity = velocity;
}

method.getDevice = function() {
    return this._device;
};

method.getButton = function() {
    return this._button;
}

method.getVelocity = function() {
    return this._velocity;
}

method.getButtonIdentifier = function() {
    return this._device + ':' + this._button;
}
module.exports = DeviceMessage;