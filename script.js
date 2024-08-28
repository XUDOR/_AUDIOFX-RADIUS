// --- Globals ---
const logs = []; // Array to store logs

// --- Elements ---
const elements = {
    onButton: document.getElementById('on'),
    playButton: document.getElementById('play'),
    stopButton: document.getElementById('stop'),
    loopButton: document.getElementById('loop'),
    fileInput: document.getElementById('fileInput'),
    volumeControl: document.getElementById('volume'),
    timeDisplay: document.querySelector('.time'),
    seekBar: document.getElementById('seekBar'),
    jsonButton: document.querySelector('.json'),
    zeroButton: document.querySelector('.zero'),
    meterDisplay: document.querySelector('.meter'),
    toggleDelayButton: document.getElementById('toggleDelay'),
    xyPad: document.getElementById('xyPad'),
    delayTimeControl: document.getElementById('delayTime'),
    feedbackControl: document.getElementById('feedbackControl')
};

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
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = 0.5; // Set initial volume
            this.analyserNode = this.context.createAnalyser();
            this.analyserNode.fftSize = 256;

            // Initialize Delay and Feedback Gain Nodes for Reverb
            this.delayNode = this.context.createDelay(5.0);
            this.delayNode.delayTime.value = 0.5; // Default 500ms delay

            this.feedbackGainNode = this.context.createGain();
            this.feedbackGainNode.gain.value = 0.5; // Default 50% feedback

            // Initialize wet/dry gain nodes
            this.wetGainNode = this.context.createGain();
            this.dryGainNode = this.context.createGain();
            this.wetGainNode.gain.value = 0.5; // Default 50% wet
            this.dryGainNode.gain.value = 0.5; // Default 50% dry

            // Connect feedback loop for delay effect
            this.delayNode.connect(this.feedbackGainNode);
            this.feedbackGainNode.connect(this.delayNode);

            // Connect to output
            this.dryGainNode.connect(this.gainNode).connect(this.analyserNode).connect(this.context.destination);
            this.wetGainNode.connect(this.gainNode).connect(this.analyserNode).connect(this.context.destination);

            elements.onButton.style.border = "2px solid #56a82f";
            this.log('Audio context initialized with basic reverb.');
        } else {
            this.log('Audio context already initialized.');
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
            });
        };
        reader.readAsArrayBuffer(file);
    },

    // --- Helper Functions ---
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

    // --- Audio Processing ---
    playAudio() {
        this.source = this.context.createBufferSource();
        this.source.buffer = this.buffer;

        // Connect nodes for reverb and gain
        if (this.isDelayOn) {
            this.source.connect(this.delayNode).connect(this.wetGainNode);
        } else {
            this.source.connect(this.dryGainNode);
        }

        this.source.loop = false;  // Loop handled manually

        this.startTime = this.context.currentTime - this.elapsedTime;
        this.source.start(0, this.elapsedTime);
        this.isPlaying = true;

        this.source.onended = () => {
            if (this.isLooping) {
                this.elapsedTime = 0;  // Reset elapsed time for looping
                this.playAudio();  // Restart audio for loop
                this.log('Looping audio.');
            } else {
                this.pauseAudio(); // Pause instead of resetting
                this.log('Audio playback ended.');
            }
        };

        this.updateSeekBar();
        this.drawMeter();
        this.log('Audio started from position: ' + this.elapsedTime);
    },

    toggleDelay() {
        if (!this.source) {
            this.log('Cannot toggle delay: audio source is not initialized.');
            return;
        }

        if (this.isDelayOn) {
            this.source.disconnect();
            this.source.connect(this.dryGainNode);
            elements.toggleDelayButton.style.backgroundColor = '#617068'; // Off state color
            elements.toggleDelayButton.textContent = 'off'; // Update button text to "off"
            elements.toggleDelayButton.style.color = '#efefe6'; // Text color for dark background
            this.log('Delay effect turned off.');
        } else {
            this.source.disconnect();
            this.source.connect(this.delayNode).connect(this.wetGainNode);
            elements.toggleDelayButton.style.backgroundColor = '#c5d8d6'; // On state color
            elements.toggleDelayButton.textContent = 'on'; // Update button text to "on"
            elements.toggleDelayButton.style.color = '#000000'; // Text color for light background
            this.log('Delay effect turned on.');
        }

        this.isDelayOn = !this.isDelayOn; // Toggle state
    },

    pauseAudio() {
        if (this.source) {
            this.source.stop();
            this.isPlaying = false;
            this.elapsedTime = this.context.currentTime - this.startTime; // Save current position
            elements.playButton.style.border = "1px solid black"; // Reset play button border
            elements.stopButton.style.border = "2px solid #ff0000"; // Red border for paused
            this.log('Audio paused at position: ' + this.elapsedTime);
            this.log('Seek bar position on pause: ' + elements.seekBar.value);
        }
    },

    stopAudio() {
        if (this.source) {
            this.source.stop();
            this.isPlaying = false;
            this.isLooping = false; // Stop looping when stopped
            elements.loopButton.style.border = "1px solid black"; // Reset loop button border
            elements.seekBar.value = this.elapsedTime; // Update seek bar to current position
            elements.playButton.style.border = "1px solid black"; // Reset play button border
            elements.stopButton.style.border = "2px solid #ff0000"; // Red border for stopped
            this.log('Audio stopped at position: ' + this.elapsedTime);
        } else {
            this.log('No audio is currently playing to stop.');
        }
    },

    drawMeter() {
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const meterWidth = 100; // Width of the meter in pixels

        const draw = () => {
            this.analyserNode.getByteFrequencyData(dataArray);
            let sum = 0;
            dataArray.forEach(value => sum += value);
            let average = sum / dataArray.length;

            // Calculate the fill width of the meter based on the average amplitude
            let fillWidth = (average / 255) * meterWidth;

            // Update meter display
            elements.meterDisplay.style.width = `${fillWidth}px`;
            elements.meterDisplay.style.height = '25px'; // Height of the meter
            elements.meterDisplay.style.backgroundColor = '#79a31c'; // Solid green color for the meter

            if (this.isPlaying) {
                requestAnimationFrame(draw);
            }
        };

        draw();
    }
};

// --- XY Pad Initialization ---
document.addEventListener('DOMContentLoaded', (event) => {
    const svg = document.getElementById('xy-controller');
    const handle = document.getElementById('handle');
    const valueX = document.getElementById('value-x');
    const valueY = document.getElementById('value-y');
    const wetGainNode = audioApp.wetGainNode;
    const dryGainNode = audioApp.dryGainNode;

    // Function to update the wet/dry mix based on XY pad position
    const updateMix = (x, y) => {
        const wetLevel = x / 100;
        const dryLevel = 1 - wetLevel;

        if (wetGainNode && dryGainNode) {
            wetGainNode.gain.value = wetLevel;
            dryGainNode.gain.value = dryLevel;
            valueX.textContent = `x: ${wetLevel.toFixed(2)}`;
            valueY.textContent = `y: ${dryLevel.toFixed(2)}`;
            audioApp.log(`Wet: ${wetLevel.toFixed(2)}, Dry: ${dryLevel.toFixed(2)}`);
        }
    };

    // Function to move the handle on the XY pad
    const moveHandle = (event) => {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = 100 - ((event.clientY - rect.top) / rect.height) * 100; // Invert y-coordinate

        handle.setAttribute('cx', x);
        handle.setAttribute('cy', 100 - y); // Adjust for inverted y-coordinate

        updateMix(x, y);
    };

    // Event listeners for moving the handle on click and drag
    svg.addEventListener('mousemove', (event) => {
        if (event.buttons === 1) {
            moveHandle(event);
        }
    });

    svg.addEventListener('click', (event) => {
        moveHandle(event);
    });
});

// --- Event Listeners ---

elements.onButton.addEventListener('click', () => audioApp.initializeAudioContext());
elements.fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        audioApp.loadAudioFile(file);
    }
});
elements.playButton.addEventListener('click', () => {
    if (audioApp.buffer && audioApp.context) {
        if (!audioApp.isPlaying) {
            audioApp.playAudio();
            elements.playButton.style.border = "2px solid #007bff"; // Blue border for playing
            elements.stopButton.style.border = "1px solid black"; // Reset stop button border
            audioApp.log('Playing audio.');
        } else {
            audioApp.pauseAudio(); // Pause if currently playing
            audioApp.log('Pausing audio.');
        }
    } else {
        audioApp.log('No audio buffer or audio context available.');
    }
});
elements.stopButton.addEventListener('click', () => audioApp.stopAudio());
elements.loopButton.addEventListener('click', () => {
    if (audioApp.buffer && audioApp.context) {
        audioApp.isLooping = !audioApp.isLooping;
        elements.loopButton.style.border = audioApp.isLooping ? "2px solid #f4d30c" : "1px solid black";
        audioApp.log('Looping set to: ' + audioApp.isLooping);
    } else {
        audioApp.log('No audio buffer or context to loop.');
    }
});
elements.toggleDelayButton.addEventListener('click', () => audioApp.toggleDelay());
elements.delayTimeControl.addEventListener('input', (event) => {
    audioApp.delayNode.delayTime.value = event.target.value / 1000; // Convert to seconds
    elements.timeDisplay.textContent = `t: ${event.target.value} ms`;
    audioApp.log(`Delay time set to: ${event.target.value} ms`);
});
elements.feedbackControl.addEventListener('input', (event) => {
    audioApp.feedbackGainNode.gain.value = event.target.value;
    elements.timeDisplay.textContent = `f: ${(event.target.value * 100).toFixed(0)}%`;
    audioApp.log(`Feedback set to: ${event.target.value * 100}%`);
});

// --- End of Script Execution ---
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
