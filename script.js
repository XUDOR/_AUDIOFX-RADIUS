document.addEventListener('DOMContentLoaded', () => {
    const onButton = document.getElementById('on');
    const playButton = document.getElementById('play');
    const stopButton = document.getElementById('stop');
    const loopButton = document.getElementById('loop');
    const fileInput = document.getElementById('fileInput');
    const volumeControl = document.getElementById('volume');
    const timeDisplay = document.querySelector('.time');
    const seekBar = document.getElementById('seekBar');
    const jsonButton = document.querySelector('.json');
    const zeroButton = document.querySelector('.zero');

    let audioContext;
    let audioBuffer;
    let source;
    let gainNode;
    let isPlaying = false;
    let startTime = 0;
    let elapsedTime = 0;
    let isSeeking = false;
    let isLooping = false;
    const logs = [];

    function addLog(message) {
        logs.push({ timestamp: new Date().toISOString(), message });
        console.log(message);
    }

    onButton.addEventListener('click', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.gain.value = 0.5;
            onButton.style.border = "2px solid #56a82f";
            addLog('Audio context initialized.');
        } else {
            addLog('Audio context already initialized.');
        }
    });

    volumeControl.addEventListener('input', (e) => {
        if (gainNode) {
            gainNode.gain.value = e.target.value;
            addLog(`Volume changed: ${gainNode.gain.value}`);
        }
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            if (audioContext) {
                audioContext.decodeAudioData(e.target.result, (buffer) => {
                    audioBuffer = buffer;
                    seekBar.max = audioBuffer.duration;
                    updateSeekBar();
                    addLog('Audio file loaded and decoded.');
                });
            }
        };

        if (file) {
            reader.readAsArrayBuffer(file);
            addLog('Reading audio file...');
        } else {
            addLog('No file selected.');
        }
    });

    playButton.addEventListener('click', () => {
        if (audioBuffer && audioContext) {
            if (!isPlaying) {
                playAudio();
                playButton.style.border = "2px solid #007bff"; // Blue border for playing
                stopButton.style.border = "1px solid black"; // Reset stop button border
                addLog('Playing audio.');
            } else {
                pauseAudio();
                addLog('Pausing audio.');
            }
        } else {
            addLog('No audio buffer or audio context available.');
        }
    });

    function playAudio() {
        source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode).connect(audioContext.destination);
        source.loop = false;

        startTime = audioContext.currentTime - elapsedTime;
        source.start(0, elapsedTime);
        isPlaying = true;

        source.onended = () => {
            if (isLooping) {
                elapsedTime = 0;
                playAudio();
                addLog('Looping audio.');
            } else {
                pauseAudio();
                addLog('Audio playback ended.');
            }
        };

        updateSeekBar();
        addLog('Audio started from position: ' + elapsedTime);
    }

    function pauseAudio() {
        if (source) {
            source.stop();
            isPlaying = false;
            elapsedTime = audioContext.currentTime - startTime;
            playButton.style.border = "1px solid black"; // Reset play button border
            stopButton.style.border = "2px solid #ff0000"; // Red border for paused
            addLog('Audio paused at position: ' + elapsedTime);
            addLog('Seek bar position on pause: ' + seekBar.value);
        }
    }

    stopButton.addEventListener('click', () => {
        if (source) {
            source.stop();
            isPlaying = false;
            elapsedTime = audioContext.currentTime - startTime; // Save current position
            isLooping = false; // Stop looping when stopped
            loopButton.style.border = "1px solid black"; // Reset loop button border
            seekBar.value = elapsedTime; // Update seek bar to current position
            playButton.style.border = "1px solid black"; // Reset play button border
            stopButton.style.border = "2px solid #ff0000"; // Red border for stopped
            addLog('Audio stopped at position: ' + elapsedTime);
        } else {
            addLog('No audio is currently playing to stop.');
        }
    });

    zeroButton.addEventListener('click', () => {
        if (audioBuffer) {
            elapsedTime = 0; // Reset elapsed time
            seekBar.value = 0; // Reset seek bar to start
            isPlaying = false;
            playButton.style.border = "1px solid black"; // Reset play button border
            stopButton.style.border = "1px solid black"; // Reset stop button border
            loopButton.style.border = "1px solid black"; // Reset loop button border
            addLog('Audio reset to start without playing.');
        }
    });

    loopButton.addEventListener('click', () => {
        if (audioBuffer && audioContext) {
            isLooping = !isLooping;
            loopButton.style.border = isLooping ? "2px solid #f4d30c" : "1px solid black";
            addLog('Looping set to: ' + isLooping);
        } else {
            addLog('No audio buffer or context to loop.');
        }
    });

    function updateSeekBar() {
        if (isPlaying && !isSeeking) {
            elapsedTime = audioContext.currentTime - startTime;
            seekBar.value = elapsedTime;
            timeDisplay.textContent = `time: ${formatTime(elapsedTime)} / ${formatTime(audioBuffer.duration)}`;
            requestAnimationFrame(updateSeekBar);
            addLog('Seek bar updated: ' + elapsedTime);
        }
    }

    seekBar.addEventListener('input', (e) => {
        if (audioBuffer && audioContext) {
            isSeeking = true;
            elapsedTime = parseFloat(e.target.value);
            timeDisplay.textContent = `time: ${formatTime(elapsedTime)} / ${formatTime(audioBuffer.duration)}`;
            addLog('Seeking to: ' + elapsedTime);
        }
    });

    seekBar.addEventListener('change', (e) => {
        if (audioBuffer && audioContext) {
            if (isPlaying) {
                source.stop();
                playAudio();
                addLog('Resuming audio after seek.');
            }
            isSeeking = false;
        }
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    jsonButton.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'console_logs.json';
        a.click();
        URL.revokeObjectURL(url);
        addLog('Logs exported as JSON.');
    });
});
