window.instruments2 = (function() {
    // https://codepen.io/aqilahmisuary/pen/RaQBOK

    function createAudioContext(desiredSampleRate) {
        var AudioCtor = window.AudioContext || window.webkitAudioContext;
        desiredSampleRate = typeof desiredSampleRate === 'number' ? desiredSampleRate : 44100;
        var context = new AudioCtor();
        // Check if hack is necessary. Only occurs in iOS6+ devices
        // and only when you first boot the iPhone, or play a audio/video
        // with a different sample rate
        if (/(iPhone|iPad)/i.test(navigator.userAgent) && context.sampleRate !== desiredSampleRate) {
            var buffer = context.createBuffer(1, 1, desiredSampleRate);
            var dummy = context.createBufferSource();
            dummy.buffer = buffer;
            dummy.connect(context.destination);
            dummy.start(0);
            dummy.disconnect();
            context.close();
            // dispose old context
            context = new AudioCtor();
        }
        return context;
    }

    var audioContext = new createAudioContext();
    var mixGain = audioContext.createGain();
    var filterGain = audioContext.createGain();

    mixGain.connect(audioContext.destination);
    mixGain.gain.value = 0;
    filterGain.gain.value = 0;

    //EXAMPLE SOUNDS
    var kickMixGain = audioContext.createGain();
    var kickOsc = audioContext.createOscillator();
    var kickOsc2 = audioContext.createOscillator();
    var kickGainOsc = audioContext.createGain();
    var kickGainOsc2 = audioContext.createGain();

    kickOsc.type = 'triangle';
    kickOsc.frequency.value = 40;
    kickGainOsc.gain.value = 1;
    kickOsc2.type = 'sine';
    kickOsc2.frequency.value = 80;
    kickGainOsc2.gain.value = 1;

    //Connections
    kickOsc.connect(kickGainOsc);
    kickOsc2.connect(kickGainOsc2);
    kickGainOsc2.connect(kickMixGain);
    kickGainOsc.connect(kickMixGain);
    kickMixGain.gain.value = 0;
    kickOsc.start(audioContext.currentTime);
    kickOsc2.start(audioContext.currentTime);

    //SOUNDS
    kick = function() {

        var osc = audioContext.createOscillator();
        var osc2 = audioContext.createOscillator();
        var gainOsc = audioContext.createGain();
        var gainOsc2 = audioContext.createGain();

        osc.type = 'triangle';
        osc2.type = 'sine';

        gainOsc.gain.setValueAtTime(1, audioContext.currentTime);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        gainOsc.connect(audioContext.destination);
        gainOsc2.gain.setValueAtTime(1, audioContext.currentTime);
        gainOsc2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        gainOsc2.connect(audioContext.destination);
        osc.frequency.setValueAtTime(120, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        osc2.frequency.setValueAtTime(50, audioContext.currentTime);

        //Connections
        osc.connect(gainOsc);
        osc2.connect(gainOsc2);
        gainOsc2.connect(mixGain);
        gainOsc.connect(mixGain);

        mixGain.gain.value = 1;

        osc.start(audioContext.currentTime);
        osc2.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.5);
        osc2.stop(audioContext.currentTime + 0.5);
    }

    snare = function() {

        var osc3 = audioContext.createOscillator();
        var gainOsc3 = audioContext.createGain();

        filterGain.gain.setValueAtTime(1, audioContext.currentTime);
        filterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        osc3.type = 'triangle';
        osc3.frequency.value = 100;

        gainOsc3.gain.value = 0;
        gainOsc3.gain.setValueAtTime(0, audioContext.currentTime);
        //gainOsc3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        //Connections
        osc3.connect(gainOsc3);
        gainOsc3.connect(mixGain);

        mixGain.gain.value = 1;

        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.2);

        var node = audioContext.createBufferSource(),
            buffer = audioContext.createBuffer(1, 4096, audioContext.sampleRate),
            data = buffer.getChannelData(0);

        var filter = audioContext.createBiquadFilter();

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(100, audioContext.currentTime);
        filter.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.2);

        for (var i = 0; i < 4096; i++) {
            data[i] = Math.random();
        }

        node.buffer = buffer;
        node.loop = true;

        //Connections
        node.connect(filter);
        filter.connect(filterGain);
        filterGain.connect(mixGain);

        node.start(audioContext.currentTime);
        node.stop(audioContext.currentTime + 0.2);

    }

    hihat = function() {
        var gainOsc4 = audioContext.createGain();
        var fundamental = 40;
        var ratios = [
            2,
            3,
            4.16,
            5.43,
            6.79,
            8.21
        ];
        var bandpass = audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 10000;
        var highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 7000;
        ratios.forEach(function(ratio) {
            var osc4 = audioContext.createOscillator();
            osc4.type = 'square';
            osc4.frequency.value = fundamental * ratio;
            osc4.connect(bandpass);
            osc4.start(audioContext.currentTime);
            osc4.stop(audioContext.currentTime + 0.05);
        });

        gainOsc4.gain.setValueAtTime(1, audioContext.currentTime);
        gainOsc4.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

        bandpass.connect(highpass);
        highpass.connect(gainOsc4);
        gainOsc4.connect(mixGain);

        mixGain.gain.value = 1;
    }

    playInstrument = function(ch){ // Reproducir instrumento
        switch(ch){
            case 0:
                kick();
                break;
            case 1:
                snare();
                break;
            case 2:
                hihat();
                break;
            default:
                break;
        }
    };

    return playInstrument;

}());