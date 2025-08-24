import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { fileURLToPath } from 'url';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegInstaller.path);


// ESM helper til __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMERA_IP = '192.168.0.7';
const USERNAME = 'Mlkv3TapoC100';
const PASSWORD = 'C100Opat';
const RTSP_URL = `rtsp://${USERNAME}:${PASSWORD}@${CAMERA_IP}:554/stream1`;
console.log('RTSP_URL: ', RTSP_URL);
//  rtsp://Mlkv3TapoC100:C100Opat@192.168.0.7:554/stream1
//  ffmpeg -i "rtsp://Mlkv3TapoC100:C100Opat@192.168.0.7:554/stream1" -frames:v 1 test.jpg

// Dummy motion detection – udskiftes med rigtig API-kald
async function isMotionDetected(): Promise<boolean> {
  const randomNumber = Math.random() > 0.8;
  console.log('Math.random() > 0.8: ', randomNumber)
  return randomNumber;
}

function takeSnapshot(): Promise<void> {
  const filename = path.join(__dirname, `snapshot_${Date.now()}.jpg`);
  return new Promise((resolve, reject) => {
    ffmpeg(RTSP_URL)
      .frames(1)
      .output(filename)
      .on('end', () => {
        console.log(`📸 Snapshot gemt: ${filename}`);
        resolve();
      })
      .on('error', (err) => {
        console.error('Fejl ved snapshot:', err);
        reject(err);
      })
      .run();
  });
}

async function monitor() {
  console.log('Starter motion monitor...');
  while (true) {
    if (await isMotionDetected()) {
      console.log('🚨 Bevægelse registreret! Tager snapshot...');
      await takeSnapshot();
      console.log('Snapshot taget')
    }
    await new Promise(res => setTimeout(res, 2000));
  }
}

monitor();