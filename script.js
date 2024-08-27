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
    meterDisplay: document.querySelector('.meter')
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
    isPlaying: false,
    startTime: 0,
    elapsedTime: 0,
    isSeeking: false,
    isLooping: false,

    initializeAudioContext() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = 0.5; // Set initial volume
            this.analyserNode = this.context.createAnalyser();
            this.analyserNode.fftSize = 256;

            // Initialize Delay and Feedback Gain Nodes for Reverb
            this.delayNode = this.context.createDelay(5.0);
            this.delayNode.delayTime.value = 0.5; // 500ms delay

            this.feedbackGainNode = this.context.createGain();
            this.feedbackGainNode.gain.value = 0.5; // Set feedback amount

            // Connect feedback loop for reverb effect
            this.delayNode.connect(this.feedbackGainNode);
            this.feedbackGainNode.connect(this.delayNode);

            elements.onButton.style.border = "2px solid #56a82f";
            audioApp.log('Audio context initialized with basic reverb.');
        } else {
            audioApp.log('Audio context already initialized.');
        }
    },

    loadAudioFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.context.decodeAudioData(e.target.result, (buffer) => {
                this.buffer = buffer;
                elements.seekBar.max = buffer.duration;
                this.updateSeekBar();
                audioApp.log('Audio file loaded and decoded.');
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
            elements.timeDisplay.textContent = `time: ${audioApp.formatTime(this.elapsedTime)} / ${audioApp.formatTime(this.buffer.duration)}`;
            requestAnimationFrame(() => audioApp.updateSeekBar());
            audioApp.log('Seek bar updated: ' + this.elapsedTime);
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
        this.source.connect(this.delayNode).connect(this.gainNode).connect(this.analyserNode).connect(this.context.destination);

        this.source.loop = false;  // Loop handled manually

        this.startTime = this.context.currentTime - this.elapsedTime;
        this.source.start(0, this.elapsedTime);
        this.isPlaying = true;

        this.source.onended = () => {
            if (this.isLooping) {
                this.elapsedTime = 0;  // Reset elapsed time for looping
                audioApp.playAudio();  // Restart audio for loop
                audioApp.log('Looping audio.');
            } else {
                audioApp.pauseAudio(); // Pause instead of resetting
                audioApp.log('Audio playback ended.');
            }
        };

        this.updateSeekBar();
        this.drawMeter();
        audioApp.log('Audio started from position: ' + this.elapsedTime);
    },

    pauseAudio() {
        if (this.source) {
            this.source.stop();
            this.isPlaying = false;
            this.elapsedTime = this.context.currentTime - this.startTime; // Save current position
            elements.playButton.style.border = "1px solid black"; // Reset play button border
            elements.stopButton.style.border = "2px solid #ff0000"; // Red border for paused
            audioApp.log('Audio paused at position: ' + this.elapsedTime);
            audioApp.log('Seek bar position on pause: ' + elements.seekBar.value);
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
            audioApp.log('Audio stopped at position: ' + this.elapsedTime);
        } else {
            audioApp.log('No audio is currently playing to stop.');
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
