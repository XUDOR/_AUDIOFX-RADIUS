document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('play');
  const stopButton = document.getElementById('stop');
  const loopButton = document.getElementById('loop');
  const fileInput = document.getElementById('fileInput');
  const volumeControl = document.getElementById('volume');
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  let source;
  let gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5; // Set initial volume

  // Handle volume changes
  volumeControl.addEventListener('input', (e) => {
      gainNode.gain.value = e.target.value;
  });

  // Handle file input
  fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
          audioContext.decodeAudioData(e.target.result, (buffer) => {
              audioBuffer = buffer;
          });
      };

      if (file) {
          reader.readAsArrayBuffer(file);
      }
  });

  // Play audio
  playButton.addEventListener('click', () => {
      if (audioBuffer) {
          source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(gainNode).connect(audioContext.destination);
          source.start();
      }
  });

  // Stop audio
  stopButton.addEventListener('click', () => {
      if (source) {
          source.stop();
      }
  });

  // Loop audio
  loopButton.addEventListener('click', () => {
      if (audioBuffer) {
          source.loop = !source.loop;
      }
  });
});
