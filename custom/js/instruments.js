
window.instruments = (function($t){ // Una funcion que usa Tone.js para reproducir instrumentos

    var kick = new $t.MembraneSynth({
        "volume": 6,
        "envelope": {
            "sustain": 0,
            "attack": 0.02,
            "decay": 0.8
        },
        "octaves": 8
    }).toMaster();

    var snare =  new $t.NoiseSynth({
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

    var snare2 = new $t.NoiseSynth({
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

    var piano = new $t.PolySynth(4, $t.Synth, {
        "volume": -8,
        "oscillator": {
            "partials": [1, 2, 2],
        },
        "portamento": 0.05
    }).toMaster();

    var bass = new $t.MonoSynth({
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
    
    var playInstrument = function(ch){ // Reproducir instrumento
        switch(ch){
            case 0:
                kick.triggerAttack('50');
                break;
            case 1:
                kick.triggerAttack('90');
                break;
            case 2:
                snare.triggerAttackRelease('50');
                break;
            case 3:
                snare2.triggerAttackRelease('50');
                break;
            case 4:
                bass.triggerAttackRelease('60','8n');
                break;
            case 5:
                bass.triggerAttackRelease('120','8n');
                break;
            case 6:
                piano.triggerAttackRelease(["D4", "F4", "A4", "C5"], "8n");
                break;    
            case 7: 
                piano.triggerAttackRelease(["D3", "F3", "A2", "C4"], "8n");
                break;
        }
    };

    return playInstrument;
})(Tone);

