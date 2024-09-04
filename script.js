// --- Globals ---
const logs = []; // Array to store logs

// --- Elements ---
const elements = {
    onButton: document.getElementById('on'),
    zeroButton: document.querySelector('.zero'),
    playButton: document.getElementById('play'),
    stopButton: document.getElementById('stop'),
    loopButton: document.getElementById('loop'),
    ejectButton: document.getElementById('eject'),
    fileInput: document.getElementById('fileInput'),
    volumeControl: document.getElementById('volume'),
    volumeValue: document.getElementById('volumeValue'),
    timeDisplay: document.querySelector('.time'),
    seekBar: document.getElementById('seekBar'),
    jsonButton: document.querySelector('.json'),
    meterDisplay: document.querySelector('.meter'),
    toggleDelayButton: document.getElementById('toggleDelay'),
    xyPad: document.getElementById('xyPad'),
    delayTimeControl: document.getElementById('delayTime'),
    feedbackControl: document.getElementById('feedbackControl'),
    tDisplay: document.getElementById('display-t'),
    fDisplay: document.getElementById('display-f'),
    xDisplay: document.getElementById('display-x'),
    yDisplay: document.getElementById('display-y'),
    wetDisplay: document.getElementById('display-wet'),
    dryDisplay: document.getElementById('display-dry')
};

// --- Function to Log Messages to Console Div ---
function logToConsoleDiv(message) {
    const consoleDisplay = document.getElementById('consoleDisplay');
    consoleDisplay.innerHTML = ''; // Clear the console display before adding new message
    const newLog = document.createElement('div');
    newLog.textContent = message;
    consoleDisplay.appendChild(newLog);
}

// --- Functions to Update and Log Values ---
function updateDelayAndFeedback() {
    const delayTime = parseFloat(elements.delayTimeControl.value).toFixed(3);
    const feedback = (parseFloat(elements.feedbackControl.value) * 100).toFixed(2);

    elements.tDisplay.textContent = `t: ${delayTime} ms`;
    elements.fDisplay.textContent = `f: ${feedback}%`;

    console.log(`Delay Time (t): ${delayTime} ms`);
    console.log(`Feedback (f): ${feedback}%`);
}

function updateXYValues(x, y) {
    elements.xDisplay.textContent = `x: ${x.toFixed(3)}`;
    elements.yDisplay.textContent = `y: ${y.toFixed(3)}`;

    console.log(`Wet/Dry Mix (x): ${x.toFixed(3)}, (y): ${y.toFixed(3)}`);
}

function updateVolume() {
    const volume = elements.volumeControl.value;

    if (elements.volumeValue) {
        elements.volumeValue.textContent = `Volume: ${(volume * 100).toFixed(0)}%`;
    }

    if (audioApp.gainNode) {
        audioApp.gainNode.gain.value = volume;
    }

    elements.volumeControl.setAttribute('data-volume', `${(volume * 100).toFixed(0)}%`);

    console.log(`Volume set to: ${(volume * 100).toFixed(0)}%`);
    logToConsoleDiv(`Volume: ${(volume * 100).toFixed(0)}%`);
}

function updateSeekBarPosition() {
    if (audioApp.isPlaying && !audioApp.isSeeking) {
        audioApp.elapsedTime = audioApp.context.currentTime - audioApp.startTime;
        elements.seekBar.value = audioApp.elapsedTime;
        elements.timeDisplay.textContent = `time: ${audioApp.formatTime(audioApp.elapsedTime)} / ${audioApp.formatTime(audioApp.buffer.duration)}`;
        requestAnimationFrame(updateSeekBarPosition);
        audioApp.log('Seek bar updated: ' + audioApp.elapsedTime);
    }
}

// --- XY Pad Initialization ---
document.addEventListener('DOMContentLoaded', (event) => {
    const svg = document.getElementById('xy-controller');
    const handle = document.getElementById('handle');

    const updateMix = (x, y) => {
        const wetLevel = (y / 100).toFixed(3);
        const dryLevel = (x / 100).toFixed(3);
    
        elements.xDisplay.textContent = `x: ${dryLevel}`;
        elements.yDisplay.textContent = `y: ${wetLevel}`;
        elements.wetDisplay.textContent = `wet: ${(wetLevel * 100).toFixed(2)}%`;
        elements.dryDisplay.textContent = `dry: ${(dryLevel * 100).toFixed(2)}%`;
        console.log(`Wet/Dry Mix (x): ${dryLevel}, (y): ${wetLevel}`);
    
        if (audioApp.wetGainNode && audioApp.dryGainNode) {
            audioApp.dryGainNode.gain.value = parseFloat(dryLevel);
    
            if (audioApp.isDelayOn) {
                audioApp.wetGainNode.gain.value = parseFloat(wetLevel);
            } else {
                audioApp.wetGainNode.gain.value = 0;
            }
        }
    
        if (audioApp.source) {
            audioApp.source.disconnect();
    
            if (audioApp.isDelayOn) {
                audioApp.source.connect(audioApp.delayNode).connect(audioApp.wetGainNode);
                audioApp.source.connect(audioApp.dryGainNode);
            } else {
                audioApp.source.connect(audioApp.dryGainNode);
            }
        }
    };

    const moveHandle = (event) => {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = 100 - ((event.clientY - rect.top) / rect.height) * 100;

        handle.setAttribute('cx', x);
        handle.setAttribute('cy', 100 - y);

        updateMix(x, y);
    };

    svg.addEventListener('mousemove', (event) => {
        if (event.buttons === 1) {
            moveHandle(event);
        }
    });

    svg.addEventListener('click', (event) => {
        moveHandle(event);
    });
});

// --- Event Listeners for Input Controls ---
elements.delayTimeControl.addEventListener('input', updateDelayAndFeedback);
elements.feedbackControl.addEventListener('input', updateDelayAndFeedback);
elements.volumeControl.addEventListener('input', updateVolume);

// --- Initializations ---
const audioApp = {
    context: null,
    buffer: null,
    source: null,
    gainNode: null,
    delayNode: null,
    feedbackGainNode: null,
    analyserNode: null,
    wetGainNode: null,
    dryGainNode: null,
    isPlaying: false,
    startTime: 0,
    elapsedTime: 0,
    isSeeking: false,
    isLooping: false,
    isDelayOn: false,

    initializeAudioContext() {
        try {
            if (!this.context) {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
                this.gainNode = this.context.createGain();
                this.gainNode.gain.value = 0.5;
                this.analyserNode = this.context.createAnalyser();
                this.analyserNode.fftSize = 2048;
    
                this.delayNode = this.context.createDelay(5.0);
                this.delayNode.delayTime.value = 0.5;
    
                this.feedbackGainNode = this.context.createGain();
                this.feedbackGainNode.gain.value = 0.5;
    
                this.wetGainNode = this.context.createGain();
                this.dryGainNode = this.context.createGain();
                this.wetGainNode.gain.value = 0.5;
                this.dryGainNode.gain.value = 0.5;
    
                this.delayNode.connect(this.feedbackGainNode);
                this.feedbackGainNode.connect(this.delayNode);
    
                this.gainNode.connect(this.analyserNode).connect(this.context.destination);
                this.dryGainNode.connect(this.gainNode);
                this.wetGainNode.connect(this.gainNode);
    
                elements.onButton.style.backgroundColor = "#93a01c";
                elements.onButton.style.color = "#f0f0f0";
                elements.onButton.style.border = "none";
    
                this.log('Audio context initialized with basic reverb.');
                logToConsoleDiv('Audio: Initialized');
            } else {
                this.log('Audio context already initialized.');
            }
        } catch (error) {
            console.error(`Error initializing audio context: ${error.message}`);
            logToConsoleDiv(`Error initializing audio context: ${error.message}`);
        }
    },

    loadAudioFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.context.decodeAudioData(e.target.result, (buffer) => {
                this.buffer = buffer;
                elements.seekBar.max = buffer.duration;
                this.updateSeekBar();
                this.log('Audio file loaded and decoded.');
                logToConsoleDiv('File: Loaded');
            });
        };
        reader.readAsArrayBuffer(file);
    },

    log(message) {
        logs.push({ timestamp: new Date().toISOString(), message });
        console.log(message);
    },

    updateSeekBar() {
        if (this.isPlaying && !this.isSeeking) {
            this.elapsedTime = this.context.currentTime - this.startTime;
            elements.seekBar.value = this.elapsedTime;
            elements.timeDisplay.textContent = `time: ${this.formatTime(this.elapsedTime)} / ${this.formatTime(this.buffer.duration)}`;
            requestAnimationFrame(() => this.updateSeekBar());
            this.log('Seek bar updated: ' + this.elapsedTime);
        }
    },

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    },

    playAudio() {
        this.source = this.context.createBufferSource();
        this.source.buffer = this.buffer;

        if (this.isDelayOn) {
            this.source.connect(this.delayNode).connect(this.wetGainNode);
        } else {
            this.source.connect(this.dryGainNode);
        }

        this.source.loop = false;

        this.startTime = this.context.currentTime - this.elapsedTime;
        this.source.start(0, this.elapsedTime);
        this.isPlaying = true;

        this.source.onended = () => {
            if (this.isLooping) {
                this.elapsedTime = 0;
                this.playAudio();
                this.log('Looping audio.');
            } else {
                this.pauseAudio();
                this.log('Audio playback ended.');
            }
        };

        this.updateSeekBar();
        this.drawFFTWaveform(); // Start visualizing FFT waveform
        this.log('Audio started from position: ' + this.elapsedTime);
        logToConsoleDiv('Playing');
    },

    drawFFTWaveform() {
        const svg = document.getElementById('fft-visualizer');
        const waveform = document.getElementById('waveform');
        const analyser = this.analyserNode;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateWaveform = () => {
            analyser.getByteTimeDomainData(dataArray);

            let pathData = '';
            const width = svg.clientWidth;
            const height = svg.clientHeight;
            const sliceWidth = width / bufferLength;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    pathData += `M ${i * sliceWidth} ${y}`;
                } else {
                    pathData += ` L ${i * sliceWidth} ${y}`;
                }
            }

            waveform.setAttribute('d', pathData);

            if (this.isPlaying) {
                requestAnimationFrame(updateWaveform);
            }
        };

        updateWaveform();
    },

    toggleDelay() {
        if (!this.source) {
            this.log('Cannot toggle delay: audio source is not initialized.');
            return;
        }

        if (this.isDelayOn) {
            this.source.disconnect();
            this.source.connect(this.dryGainNode);
            elements.toggleDelayButton.style.backgroundColor = '#617068';
            elements.toggleDelayButton.textContent = 'off';
            elements.toggleDelayButton.style.color = '#efefe6';
            this.log('Delay effect turned off.');
        } else {
            this.source.disconnect();
            this.source.connect(this.delayNode).connect(this.wetGainNode);
            elements.toggleDelayButton.style.backgroundColor = '#c5d8d6';
            elements.toggleDelayButton.textContent = 'on';
            elements.toggleDelayButton.style.color = '#000000';
            this.log('Delay effect turned on.');
        }

        this.isDelayOn = !this.isDelayOn;
    },

    pauseAudio() {
        if (this.source) {
            this.source.stop();
            this.isPlaying = false;
            this.elapsedTime = this.context.currentTime - this.startTime;
            elements.playButton.style.border = "1px solid black";
            elements.stopButton.style.border = "2px solid #ff0000";
            this.log('Audio paused at position: ' + this.elapsedTime);
            this.log('Seek bar position on pause: ' + elements.seekBar.value);
            logToConsoleDiv('Paused');
        }
    },

    stopAudio() {
        if (this.source) {
            this.source.stop();
            this.isPlaying = false;
            this.isLooping = false;
            elements.loopButton.style.border = "1px solid black";
            elements.seekBar.value = this.elapsedTime;
            elements.playButton.style.border = "1px solid black";
            elements.stopButton.style.border = "2px solid #ff0000";
            this.log('Audio stopped at position: ' + this.elapsedTime);
            logToConsoleDiv('Stopped');
        } else {
            this.log('No audio is currently playing to stop.');
        }
    },

    clearAudioFile() {
        if (this.source) {
            this.source.stop();
            this.source = null;
        }
        this.buffer = null;
        elements.fileInput.value = "";
        elements.seekBar.value = 0;
        elements.timeDisplay.textContent = 'time: 0:00 / 0:00';
        this.elapsedTime = 0;
        this.isPlaying = false;
        this.log('Audio file ejected.');
        logToConsoleDiv('Audio: Ejected');
    }
};

// --- Event Listeners ---
elements.onButton.addEventListener('click', () => audioApp.initializeAudioContext());
elements.fileInput.addEventListener('change', (event) => {
    if (!audioApp.context) {
        alert("--> Please use the ON button to turn on Audio Function");
        return;
    }

    const file = event.target.files[0];
    if (file) {
        audioApp.loadAudioFile(file);
    }
});

elements.ejectButton.addEventListener('click', () => {
    audioApp.clearAudioFile();
});

elements.zeroButton.addEventListener('click', () => {
    audioApp.elapsedTime = 0;
    elements.seekBar.value = 0;
    elements.timeDisplay.textContent = 'time: 0:00 / 0:00';
    
    console.log('Zero button clicked: reset parameters.');
    audioApp.log('Zero button clicked: reset parameters.');
    logToConsoleDiv('Zeroed');
});

elements.playButton.addEventListener('click', () => {
    if (!audioApp.context) {
        alert("--> Please use the ON button to turn on Audio Function");
        return;
    }

    if (!audioApp.buffer) {
        alert("--> Please load an audio file before pressing Play");
        return;
    }

    if (!audioApp.isPlaying) {
        audioApp.playAudio();
        elements.playButton.style.border = "2px solid #007bff";
        elements.stopButton.style.border = "1px solid black";
        audioApp.log('Playing audio.');
        logToConsoleDiv('Playing');
    } else {
        audioApp.pauseAudio();
        audioApp.log('Pausing audio.');
        logToConsoleDiv('Paused');
    }
});

elements.stopButton.addEventListener('click', () => {
    audioApp.stopAudio();
    logToConsoleDiv('Stopped');
});

elements.loopButton.addEventListener('click', () => {
    if (audioApp.buffer && audioApp.context) {
        audioApp.isLooping = !audioApp.isLooping;
        elements.loopButton.style.border = audioApp.isLooping ? "2px solid #f4d30c" : "1px solid black";
        audioApp.log('Looping set to: ' + audioApp.isLooping);
        logToConsoleDiv(audioApp.isLooping ? 'Loop on' : 'Loop off');
    } else {
        audioApp.log('No audio buffer or context to loop.');
    }
});

elements.seekBar.addEventListener('input', (event) => {
    const newTime = parseFloat(event.target.value);
    audioApp.isSeeking = true;
    elements.timeDisplay.textContent = `time: ${audioApp.formatTime(newTime)} / ${audioApp.formatTime(audioApp.buffer.duration)}`;
});

elements.seekBar.addEventListener('change', (event) => {
    const newTime = parseFloat(event.target.value);
    if (audioApp.context && audioApp.buffer) {
        audioApp.isSeeking = false;
        audioApp.elapsedTime = newTime;
        if (audioApp.isPlaying) {
            audioApp.source.stop();
            audioApp.playAudio();
        } else {
            audioApp.startTime = audioApp.context.currentTime - newTime;
            elements.timeDisplay.textContent = `time: ${audioApp.formatTime(newTime)} / ${audioApp.formatTime(audioApp.buffer.duration)}`;
        }
        audioApp.log('Audio seeked to: ' + newTime);
        logToConsoleDiv('Seeked to: ' + newTime);
    }
});

elements.toggleDelayButton.addEventListener('click', () => audioApp.toggleDelay());

elements.delayTimeControl.addEventListener('input', (event) => {
    const delayTime = event.target.value;
    elements.tDisplay.textContent = `t: ${parseFloat(delayTime).toFixed(3)} ms`;
    console.log(`Delay Time (t): ${parseFloat(delayTime).toFixed(3)} ms`);

    if (audioApp.delayNode) {
        audioApp.delayNode.delayTime.value = delayTime / 1000;
    }
});

elements.feedbackControl.addEventListener('input', (event) => {
    const feedback = event.target.value;
    elements.fDisplay.textContent = `f: ${(parseFloat(feedback) * 100).toFixed(2)}%`;
    console.log(`Feedback (f): ${(parseFloat(feedback) * 100).toFixed(2)}%`);

    if (audioApp.feedbackGainNode) {
        audioApp.feedbackGainNode.gain.value = parseFloat(feedback);
    }
});

elements.jsonButton.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'console_logs.json';
    a.click();
    URL.revokeObjectURL(url);
    audioApp.log('Logs exported as JSON.');
});
