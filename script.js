document.addEventListener('DOMContentLoaded', () => {
    const onButton = document.getElementById('on');
    const playButton = document.getElementById('play');
    const stopButton = document.getElementById('stop');
    const loopButton = document.getElementById('loop');
    const fileInput = document.getElementById('fileInput');
    const volumeControl = document.getElementById('volume');
    const timeDisplay = document.querySelector('.time');
    const seekBar = document.querySelector('.seekBar');
  
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
      }
    });
  
    // Handle volume changes
    volumeControl.addEventListener('input', (e) => {
      if (gainNode) {
        gainNode.gain.value = e.target.value;
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
          });
        }
      };
  
      if (file) {
        reader.readAsArrayBuffer(file);
      }
    });
  
    // Play audio
    playButton.addEventListener('click', () => {
      if (audioBuffer && audioContext) {
        source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode).connect(audioContext.destination);
  
        if (!isPlaying) {
          startTime = audioContext.currentTime - elapsedTime;
          source.start(0, elapsedTime);
          isPlaying = true;
          updateSeekBar();
        }
  
        source.onended = () => {
          isPlaying = false;
          elapsedTime = 0;
          seekBar.value = 0;
        };
      }
    });
  
    // Stop audio
    stopButton.addEventListener('click', () => {
      if (source) {
        source.stop();
        isPlaying = false;
        elapsedTime = 0;
        seekBar.value = 0;
      }
    });
  
    // Loop audio
    loopButton.addEventListener('click', () => {
      if (audioBuffer && audioContext) {
        isLooping = !isLooping;
        source.loop = isLooping;
  
        // Change border color when loop is active
        loopButton.style.border = isLooping ? "2px solid #f4d30c" : "1px solid black";
      }
    });
  
    // Update the seek bar and time display
    function updateSeekBar() {
      if (isPlaying && !isSeeking) {
        elapsedTime = audioContext.currentTime - startTime;
        seekBar.value = elapsedTime;
        timeDisplay.textContent = `time: ${formatTime(elapsedTime)} / ${formatTime(audioBuffer.duration)}`;
        requestAnimationFrame(updateSeekBar);
      }
    }
  
    // Seek bar interaction
    seekBar.addEventListener('input', (e) => {
      if (audioBuffer && audioContext) {
        isSeeking = true;
        elapsedTime = parseFloat(e.target.value);
        timeDisplay.textContent = `time: ${formatTime(elapsedTime)} / ${formatTime(audioBuffer.duration)}`;
      }
    });
  
    seekBar.addEventListener('change', (e) => {
      if (audioBuffer && audioContext) {
        if (isPlaying) {
          source.stop();
          source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(gainNode).connect(audioContext.destination);
          startTime = audioContext.currentTime - elapsedTime;
          source.start(0, elapsedTime);
          source.onended = () => {
            isPlaying = false;
            elapsedTime = 0;
            seekBar.value = 0;
          };
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
  