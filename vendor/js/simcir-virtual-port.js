! function ($, $s) {

    var virtualPortManager = function () {

        var devices = {};
        var idCount = 0;

        var register = function (device) {
            var id = 'id' + idCount++;
            device.$ui
            .on('deviceAdd', function () {
                devices[id] = device;
            })
            .on('deviceRemove', function () {
                delete devices[id];
            });
        };

        var setValueByLabel = function (label, value) {
            $.each(devices, function (id, device) {
                if (device.getLabel() == label && device.getOutputs().length > 0) {
                    device.getOutputs()[0].setValue(value);
                }
            });
        };

        var getValueByLabel = function (label) {
            var value = null;
            $.each(devices, function (id, device) {
                if (device.getLabel() == label && device.getInputs().length > 0) {
                    value = device.getInputs()[0].getValue();
                }
            });
            return value;
        };

        return {
            register: register,
            setValueByLabel: setValueByLabel,
            getValueByLabel: getValueByLabel
        };
    }();

    // register Virtual-In
    $s.registerDevice('Virtual-In', function (device) {
        virtualPortManager.register(device);
        var in1 = device.addInput();
        var lastLabel = device.getLabel();
        device.$ui
        .on('deviceRemove', function () {
            virtualPortManager.setValueByLabel(device.getLabel(), null);
        })
        .on('deviceLabelChange', function () {
            // unset by last label
            virtualPortManager.setValueByLabel(lastLabel, null);
            lastLabel = device.getLabel();
            // set by current(new) label
            virtualPortManager.setValueByLabel(
                device.getLabel(), in1.getValue());
        })
        .on('inputValueChange', function () {
            virtualPortManager.setValueByLabel(
                device.getLabel(), in1.getValue());
        });
    });

    // register Virtual-Out
    $s.registerDevice('Virtual-Out', function (device) {
        virtualPortManager.register(device);
        var out1 = device.addOutput();
        device.$ui
        .on('deviceLabelChange', function () {
            out1.setValue(virtualPortManager.getValueByLabel(
                device.getLabel()));
        });
        // update initial state
        out1
        .setValue(virtualPortManager.getValueByLabel(
            device.getLabel()));
    });

}(jQuery, simcir);