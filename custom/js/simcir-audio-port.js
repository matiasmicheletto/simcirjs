(function ($s, $t, $a) {

    var audioPortManager = function () {

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

        var clearDevices = function(){ // Restablecer manager al abrir nuevo circuito
            idCount = 0;
            devices = {};
        };

        return {
            register: register,
            clearDevices: clearDevices
        };
    }();

    $s.registerDevice('Audio-Out', function (device) {
        audioPortManager.register(device);
        var inputs = [], inputValues = []; // Entradas, valores previos y cambios
        for(var k = 0; k < 8; k++){
            inputs[k] = device.addInput();
            inputValues[k] = inputs[k].getValue();
        }
        device.$ui
        .on('inputValueChange', function () {
            for(var k = 0; k < 8; k++){
                var val = inputs[k].getValue();
                if(val && (val != inputValues[k])) // Disparar en flanco ascendente
                    $a(k);
                inputValues[k] = val;
            }
        });
    });

    if(!$s.clearDevices)
        $s.clearDevices = audioPortManager.clearDevices;
    else{ // Si ya existe, concatenar operaciones
        var temp = $s.clearDevices;
        $s.clearDevices = function(){
            temp();
            audioPortManager.clearDevices();
        };
    }

})(simcir, Tone, instruments);



