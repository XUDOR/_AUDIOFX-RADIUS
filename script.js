document.addEventListener('DOMContentLoaded', () => {
    const onButton = document.getElementById('on');
    const playButton = document.getElementById('play');
    const stopButton = document.getElementById('stop');
    const loopButton = document.getElementById('loop');
    const fileInput = document.getElementById('fileInput');
    const volumeControl = document.getElementById('volume');
    const timeDisplay = document.querySelector('.time');
    const seekBar = document.getElementById('seekBar');

    let audioContext;
    let audioBuffer;
    let source;
    let gainNode;
    let isPlaying = false;
    let startTime = 0;
    let elapsedTime = 0;
    let isSeeking = false;
    let isLooping = false;

    // Initialize the AudioContext after user gesture
    onButton.addEventListener('click', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.gain.value = 0.5; // Set initial volume

            // Change border color when audio context is initialized
            onButton.style.border = "2px solid #56a82f";
            console.log('Audio context initialized.');
        } else {
            console.log('Audio context already initialized.');
        }
    });

    // Handle volume changes
    volumeControl.addEventListener('input', (e) => {
        if (gainNode) {
            gainNode.gain.value = e.target.value;
            console.log(`Volume changed: ${gainNode.gain.value}`);
        }
    });

    // Handle file input
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            if (audioContext) {
                audioContext.decodeAudioData(e.target.result, (buffer) => {
                    audioBuffer = buffer;
                    seekBar.max = audioBuffer.duration;
                    updateSeekBar();
                    console.log('Audio file loaded and decoded.');
                });
            }
        };

        if (file) {
            reader.readAsArrayBuffer(file);
            console.log('Reading audio file...');
        } else {
            console.log('No file selected.');
        }
    });

    // Play or Resume audio
    playButton.addEventListener('click', () => {
        if (audioBuffer && audioContext) {
            if (!isPlaying) {
                playAudio();
                playButton.style.border = "2px solid #007bff"; // Blue border for playing
                stopButton.style.border = "1px solid black"; // Reset stop button border
                console.log('Playing audio.');
            } else {
                pauseAudio(); // Pause if currently playing
                console.log('Pausing audio.');
            }
        } else {
            console.log('No audio buffer or audio context available.');
        }
    });

    function playAudio() {
        source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode).connect(audioContext.destination);
        source.loop = isLooping;  // Set loop state

        startTime = audioContext.currentTime - elapsedTime;
        source.start(0, elapsedTime);
        isPlaying = true;

        source.onended = () => {
            if (!isLooping) {
                pauseAudio();
                console.log('Audio playback ended.');
            } else {
                elapsedTime = 0;  // Reset elapsed time for looping
                playAudio();  // Restart audio for loop
                console.log('Looping audio.');
            }
        };

        updateSeekBar();
        console.log('Audio started from position:', elapsedTime);
    }

    // Pause audio without resetting
    function pauseAudio() {
        if (source) {
            source.stop();
            isPlaying = false;
            pauseTime = audioContext.currentTime - startTime; // Save current position
            elapsedTime = pauseTime;
            playButton.style.border = "1px solid black"; // Reset play button border
            stopButton.style.border = "2px solid #ff0000"; // Red border for paused
            console.log('Audio paused at position:', elapsedTime);
        }
    }

    // Stop audio and reset to start
    stopButton.addEventListener('click', () => {
        if (source && isPlaying) {
            source.stop();
            isPlaying = false;
            elapsedTime = 0;
            seekBar.value = 0;
            playButton.style.border = "1px solid black"; // Reset play button border
            stopButton.style.border = "2px solid #ff0000"; // Red border for stopped
            console.log('Audio stopped.');
        } else {
            console.log('No audio is currently playing to stop.');
        }
    });

    // Loop audio
    loopButton.addEventListener('click', () => {
        if (audioBuffer && audioContext) {
            isLooping = !isLooping;
            if (source) source.loop = isLooping;  // Update source loop state

            // Change border color when loop is active
            loopButton.style.border = isLooping ? "2px solid #f4d30c" : "1px solid black";
            console.log('Looping set to:', isLooping);
        } else {
            console.log('No audio buffer or context to loop.');
        }
    });

    // Update the seek bar and time display
    function updateSeekBar() {
        if (isPlaying && !isSeeking) {
            elapsedTime = audioContext.currentTime - startTime;
            seekBar.value = elapsedTime;
            timeDisplay.textContent = `time: ${formatTime(elapsedTime)} / ${formatTime(audioBuffer.duration)}`;
            requestAnimationFrame(updateSeekBar);
            console.log('Seek bar updated:', elapsedTime);
        }
    }

    // Seek bar interaction
    seekBar.addEventListener('input', (e) => {
        if (audioBuffer && audioContext) {
            isSeeking = true;
            elapsedTime = parseFloat(e.target.value);
            timeDisplay.textContent = `time: ${formatTime(elapsedTime)} / ${formatTime(audioBuffer.duration)}`;
            console.log('Seeking to:', elapsedTime);
        }
    });

    seekBar.addEventListener('change', (e) => {
        if (audioBuffer && audioContext) {
            if (isPlaying) {
                source.stop();
                playAudio();
                console.log('Resuming audio after seek.');
            }
            isSeeking = false;
        }
    });

    // Format time for display
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
});
