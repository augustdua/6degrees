# Notification Sound File

You need to add a notification sound file at: `frontend/public/notification-sound.mp3`

## Options to get a sound file:

### 1. Free Sound Sources:
- **Freesound.org** - https://freesound.org/search/?q=notification
- **Zapsplat** - Free notification sounds
- **YouTube Audio Library** - Download notification sounds

### 2. Built-in Browser Sounds (Alternative):
Instead of a custom file, you can use the Web Audio API to generate sounds:

```javascript
// Simple beep sound (no file needed)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

oscillator.frequency.value = 800; // Frequency in Hz
gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

oscillator.start(audioContext.currentTime);
oscillator.stop(audioContext.currentTime + 0.5);
```

### 3. Recommended Simple Sound:
Download a short (0.5-1 second) notification sound and save it as:
`frontend/public/notification-sound.mp3`

### 4. No Sound Option:
If you don't want custom sounds, the browser notifications will use system default sounds.