(function ($, $s) {

    var externalPortManager = function () {

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

        var getLabels = function(type){
            var labels = [];
            $.each(devices, function (id, device) {
                switch(type){
                    case "input":
                        if (device.getOutputs().length > 0) {
                            labels.push(device.getLabel());
                        }
                        break;
                    case "output":
                        if (device.getInputs().length > 0) {
                            labels.push(device.getLabel());
                        }
                        break;
                    default:
                        labels.push(device.getLabel());
                }
            });
            return labels;
        };

        var clearDevices = function(){ // Restablecer manager al abrir nuevo circuito
            idCount = 0;
            devices = {};
        };

        return {
            register: register,
            setValueByLabel: setValueByLabel,
            getValueByLabel: getValueByLabel,
            getLabels: getLabels,
            clearDevices: clearDevices
        };
    }();

    $s.registerDevice('Test-Out', function (device) {
        externalPortManager.register(device);
        var in1 = device.addInput();
        var lastLabel = device.getLabel();
        var size = device.getSize();
        var cx = size.width / 2;
        var cy = size.height / 2;
        device.$ui.append($s.createSVGElement('circle').
          attr({cx: cx, cy: cy, r: 8}).
          attr('class', 'simcir-port simcir-node-type-out') );
        device.$ui.append($s.createSVGElement('circle').
          attr({cx: cx, cy: cy, r: 4}).
          attr('class', 'simcir-port-hole') );
        device.$ui
        // In case of callback required
        /*.on('inputValueChange', function () {
            $s.outputsUpdate(device.getLabel(),in1.getValue()); 
        })*/
        .on('deviceLabelChange', function () {
            externalPortManager.setValueByLabel(lastLabel, null);
            lastLabel = device.getLabel();
            externalPortManager.setValueByLabel(device.getLabel(), in1.getValue());
        });
    });

    $s.registerDevice('Test-In', function (device) {
        externalPortManager.register(device);
        var out1 = device.addOutput();
        var size = device.getSize();
        var cx = size.width / 2;
        var cy = size.height / 2;
        device.$ui.append($s.createSVGElement('circle').
          attr({cx: cx, cy: cy, r: 8}).
          attr('class', 'simcir-port simcir-node-type-in') );
        device.$ui.append($s.createSVGElement('circle').
          attr({cx: cx, cy: cy, r: 4}).
          attr('class', 'simcir-port-hole') );
        device.$ui
        .on('deviceLabelChange', function () {
            out1.setValue(externalPortManager.getValueByLabel(device.getLabel()));
        });
        out1.setValue(externalPortManager.getValueByLabel(device.getLabel()));
    });

    // Export control functions

    $s.getOutputStatus = externalPortManager.getValueByLabel;

    $s.setInputStatus = function(label,status){
        externalPortManager.setValueByLabel(label,status ? 1:null);
    };

    $s.getExternalLabels = externalPortManager.getLabels;

    // Se debe definir esta funcion en simcir-virtual-port.js para eliminar tambien los virtual-ports que quedan en cache
    if(!$s.clearDevices)
        $s.clearDevices = externalPortManager.clearDevices;
    else{ // Si ya existe, concatenar operaciones
        var temp = $s.clearDevices;
        $s.clearDevices = function(){
            temp();
            externalPortManager.clearDevices();
        };
    }

    // In case of callback required
    /*$s.outputsUpdate = function(label,value){ 
        console.log(label,value);
    };*/

})(jQuery, simcir);
