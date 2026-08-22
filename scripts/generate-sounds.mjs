import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const soundsDir = path.join(__dirname, '../public/sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

function writeWavFile(filePath, sampleRate, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  // file length minus 8
  buffer.writeUInt32LE(36 + dataSize, 4);
  // RIFF type
  buffer.write('WAVE', 8);

  // format chunk identifier
  buffer.write('fmt ', 12);
  // format chunk length
  buffer.writeUInt32LE(16, 16);
  // sample format (1 is PCM)
  buffer.writeUInt16LE(1, 20);
  // channel count
  buffer.writeUInt16LE(numChannels, 22);
  // sample rate
  buffer.writeUInt32LE(sampleRate, 24);
  // byte rate
  buffer.writeUInt32LE(byteRate, 28);
  // block align
  buffer.writeUInt16LE(blockAlign, 32);
  // bits per sample
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk identifier
  buffer.write('data', 36);
  // data chunk length
  buffer.writeUInt32LE(dataSize, 40);

  // write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intSample = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
  console.log(
    `Generated ${path.basename(filePath)} (${samples.length} samples, ${(dataSize / 1024).toFixed(1)} KB)`
  );
}

const sampleRate = 44100;

// 1. Review 'Again' (Warm low acoustic wood tone)
function generateAgainSound() {
  const duration = 0.12;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 0;
    if (t < 0.004) {
      env = Math.sin((t / 0.004) * (Math.PI / 2));
    } else {
      env = Math.exp(-(t - 0.004) / 0.025);
    }
    const freq = 210 - 45 * (t / duration);
    const phase = 2 * Math.PI * freq * t;
    samples[i] = (Math.sin(phase) + 0.2 * Math.sin(2 * phase)) * env * 0.7;
  }
  return samples;
}

// 2. Review 'Hard' (Gentle neutral acoustic tone)
function generateHardSound() {
  const duration = 0.12;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 0;
    if (t < 0.004) {
      env = Math.sin((t / 0.004) * (Math.PI / 2));
    } else {
      env = Math.exp(-(t - 0.004) / 0.025);
    }
    const freq = 310 - 50 * (t / duration);
    const phase = 2 * Math.PI * freq * t;
    samples[i] = (Math.sin(phase) + 0.18 * Math.sin(2 * phase)) * env * 0.7;
  }
  return samples;
}

// 3. Review 'Good' (Bright ascending 2-tone water bells C5 -> E5)
function generateGoodSound() {
  const duration = 0.2;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  const note1Freq = 523.25; // C5
  const note2Freq = 659.25; // E5
  const note2Offset = 0.055;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Note 1 (C5)
    if (t < 0.14) {
      let env1 = 0;
      if (t < 0.003) {
        env1 = Math.sin((t / 0.003) * (Math.PI / 2));
      } else {
        env1 = Math.exp(-(t - 0.003) / 0.032);
      }
      sample += Math.sin(2 * Math.PI * note1Freq * t) * env1 * 0.6;
    }

    // Note 2 (E5)
    if (t >= note2Offset) {
      const t2 = t - note2Offset;
      let env2 = 0;
      if (t2 < 0.003) {
        env2 = Math.sin((t2 / 0.003) * (Math.PI / 2));
      } else {
        env2 = Math.exp(-(t2 - 0.003) / 0.042);
      }
      sample += Math.sin(2 * Math.PI * note2Freq * t2) * env2 * 0.75;
    }

    samples[i] = sample;
  }
  return samples;
}

// 4. Review 'Easy' (Sparkling ascending major triad C5 -> E5 -> G5)
function generateEasySound() {
  const duration = 0.26;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  const notes = [
    { freq: 523.25, offset: 0.0, decay: 0.038, gain: 0.55 }, // C5
    { freq: 659.25, offset: 0.045, decay: 0.046, gain: 0.65 }, // E5
    { freq: 783.99, offset: 0.09, decay: 0.06, gain: 0.8 }, // G5
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.offset) {
        const tn = t - note.offset;
        let env = 0;
        if (tn < 0.003) {
          env = Math.sin((tn / 0.003) * (Math.PI / 2));
        } else {
          env = Math.exp(-(tn - 0.003) / note.decay);
        }
        sample += Math.sin(2 * Math.PI * note.freq * tn) * env * note.gain;
      }
    }

    samples[i] = sample;
  }
  return samples;
}

// 5. Notification Chime (E5 -> B5)
function generateNotificationSound() {
  const duration = 0.3;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  const note1Freq = 659.25; // E5
  const note2Freq = 987.77; // B5
  const note2Offset = 0.06;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (t < 0.18) {
      let env1 = 0;
      if (t < 0.003) {
        env1 = Math.sin((t / 0.003) * (Math.PI / 2));
      } else {
        env1 = Math.exp(-(t - 0.003) / 0.038);
      }
      sample +=
        (Math.sin(2 * Math.PI * note1Freq * t) + 0.2 * Math.sin(4 * Math.PI * note1Freq * t)) *
        env1 *
        0.55;
    }

    if (t >= note2Offset) {
      const t2 = t - note2Offset;
      let env2 = 0;
      if (t2 < 0.003) {
        env2 = Math.sin((t2 / 0.003) * (Math.PI / 2));
      } else {
        env2 = Math.exp(-(t2 - 0.003) / 0.048);
      }
      sample +=
        (Math.sin(2 * Math.PI * note2Freq * t2) + 0.18 * Math.sin(4 * Math.PI * note2Freq * t2)) *
        env2 *
        0.65;
    }

    samples[i] = sample;
  }
  return samples;
}

writeWavFile(path.join(soundsDir, 'review-again.wav'), sampleRate, generateAgainSound());
writeWavFile(path.join(soundsDir, 'review-hard.wav'), sampleRate, generateHardSound());
writeWavFile(path.join(soundsDir, 'review-good.wav'), sampleRate, generateGoodSound());
writeWavFile(path.join(soundsDir, 'review-easy.wav'), sampleRate, generateEasySound());
writeWavFile(path.join(soundsDir, 'notification.wav'), sampleRate, generateNotificationSound());
console.log('All sound files generated in public/sounds/');
