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
    zeroButton: document.querySelector('.zero')
};

// --- Initializations ---
const audioApp = {
    context: null,
    buffer: null,
    source: null,
    gainNode: null,
    delayNode: null,
    reverbNode: null,
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

            // Initialize Delay and Reverb Nodes
            this.delayNode = this.context.createDelay(5.0);
            this.delayNode.delayTime.value = 0.5; // 500ms delay

            this.reverbNode = this.context.createConvolver();
            this.loadReverbImpulse('path/to/impulse-response.wav');

            elements.onButton.style.border = "2px solid #56a82f";
            audioApp.log('Audio context initialized with delay and reverb.');
        } else {
            audioApp.log('Audio context already initialized.');
        }
    },

    loadReverbImpulse(url) {
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(data => this.context.decodeAudioData(data, (buffer) => {
                this.reverbNode.buffer = buffer;
                audioApp.log('Impulse response loaded.');
            }))
            .catch(err => audioApp.log('Error loading impulse response: ' + err.message));
    }
};

// --- Helper Functions ---
audioApp.log = function (message) {
    logs.push({ timestamp: new Date().toISOString(), message });
    console.log(message);
};

// --- UI Functions ---
audioApp.updateSeekBar = function () {
    if (this.isPlaying && !this.isSeeking) {
        this.elapsedTime = this.context.currentTime - this.startTime;
        elements.seekBar.value = this.elapsedTime;
        elements.timeDisplay.textContent = `time: ${audioApp.formatTime(this.elapsedTime)} / ${audioApp.formatTime(this.buffer.duration)}`;
        requestAnimationFrame(() => audioApp.updateSeekBar());
        audioApp.log('Seek bar updated: ' + this.elapsedTime);
    }
};

// --- Math Functions ---
audioApp.formatTime = function (seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

// --- Audio Processing ---
audioApp.playAudio = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;

    // Connect nodes for delay and reverb
    this.source.connect(this.delayNode).connect(this.reverbNode).connect(this.gainNode).connect(this.context.destination);

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
    audioApp.log('Audio started from position: ' + this.elapsedTime);
};

audioApp.pauseAudio = function () {
    if (this.source) {
        this.source.stop();
        this.isPlaying = false;
        this.elapsedTime = this.context.currentTime - this.startTime; // Save current position
        elements.playButton.style.border = "1px solid black"; // Reset play button border
        elements.stopButton.style.border = "2px solid #ff0000"; // Red border for paused
        audioApp.log('Audio paused at position: ' + this.elapsedTime);
        audioApp.log('Seek bar position on pause: ' + elements.seekBar.value);
    }
};

audioApp.stopAudio = function () {
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
};

// --- Event Listeners ---
elements.onButton.addEventListener('click', () => audioApp.initializeAudioContext());
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
