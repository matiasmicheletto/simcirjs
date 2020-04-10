(function ($s, $t) {

    // Instrumentos
    var kick, snare, piano, bass;
    var init = false;
    var setupInstruments = function(){ // Inicializar
        kick = new $t.MembraneSynth({
            "volume": 6,
            "envelope": {
                "sustain": 0,
                "attack": 0.02,
                "decay": 0.8
            },
            "octaves": 8
        }).toMaster();
        
        snare = new $t.NoiseSynth({
            "volume": -5,
            "envelope": {
                "attack": 0.001,
                "decay": 0.2,
                "sustain": 0
            },
            "filterEnvelope": {
                "attack": 0.001,
                "decay": 0.1,
                "sustain": 0
            }
        }).toMaster();

        snare2 = new Tone.NoiseSynth({
            "volume": -5,
            "envelope": {
                "attack": 0.001,
                "decay": 2,
                "sustain": 0
            },
            "filterEnvelope": {
                "attack": 0.001,
                "decay": 0.1,
                "sustain": 0
            }
        }).toMaster();
        
        piano = new $t.PolySynth(4, $t.Synth, {
            "volume": -8,
            "oscillator": {
                "partials": [1, 2, 2],
            },
            "portamento": 0.05
        }).toMaster();
        
        bass = new $t.MonoSynth({
            "volume": -10,
            "envelope": {
                "attack": 0.01,
                "decay": 0.3,
                "release": 1,
            },
            "filterEnvelope": {
                "attack": 0.001,
                "decay": 0.01,
                "sustain": 0.5,
                "baseFrequency": 200,
                "octaves": 2.6
            }
        }).toMaster();

        init = true;
    }

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
        var inputs = [], inputValues = [], triggers = []; // Entradas, valores previos y cambios
        for(var k = 0; k < 8; k++){
            inputs[k] = device.addInput();
            inputValues[k] = inputs[k].getValue();
        }
        device.$ui
        .on('inputValueChange', function () {
            if(!init) setupInstruments();
            for(var k = 0; k < 8; k++){
                var val = inputs[k].getValue();
                triggers[k] = val && (val != inputValues[k]); // Disparar en flanco ascendente
                inputValues[k] = val;
            }
            if(triggers[0]) kick.triggerAttack('50');
            if(triggers[1]) kick.triggerAttack('90');
            if(triggers[2]) snare.triggerAttackRelease('50');
            if(triggers[3]) snare2.triggerAttackRelease('50');
            if(triggers[4]) bass.triggerAttackRelease('60','8n');
            if(triggers[5]) bass.triggerAttackRelease('120','8n');
            if(triggers[6]) piano.triggerAttackRelease(["D4", "F4", "A4", "C5"], "8n");
            if(triggers[7]) piano.triggerAttackRelease(["D3", "F3", "A2", "C4"], "8n");
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

})(simcir, Tone);



