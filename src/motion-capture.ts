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

// Lav opløsning til motion detection
const RTSP_LOW = `rtsp://${USERNAME}:${PASSWORD}@${CAMERA_IP}:554/stream2`;
// Høj opløsning til snapshots
const RTSP_HIGH = `rtsp://${USERNAME}:${PASSWORD}@${CAMERA_IP}:554/stream1`;

console.log('RTSP_LOW:', RTSP_LOW);
console.log('RTSP_HIGH:', RTSP_HIGH);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Cache dynamisk import af Jimp
let jimpPromise: Promise<any> | null = null;
async function getJimp() {
  if (!jimpPromise) jimpPromise = import('jimp');
  return jimpPromise;
}

async function grabFrame(rtspUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-stimeout', '5000000' // 5 sek (mikrosekunder)
      ])
      .frames(1)
      .format('image2')
      .outputOptions('-q:v 2') // kvalitet
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on('data', chunk => chunks.push(chunk));
  });
}

async function hasMotion(prev: Buffer, curr: Buffer, threshold = 0.02): Promise<boolean> {
  const jimp = await getJimp();
  const Jimp = jimp.Jimp; // v1.x eksporterer { Jimp }
  if (!Jimp) throw new Error('Jimp klasse ikke fundet i modulet');

  const img1 = await Jimp.read(prev);
  const img2 = await Jimp.read(curr);

  // Skaler ned for hurtigere sammenligning (bevar aspect ratio)
  const targetWidth = 160;
  img1.resize({ w: targetWidth });
  img2.resize({ w: targetWidth });

  const { data: d1, width, height } = img1.bitmap as { data: Buffer; width: number; height: number };
  const { data: d2 } = img2.bitmap as { data: Buffer };

  let diffPixels = 0;
  const totalPixels = width * height;

  // Sammenlign RGB (ignorer alpha). Ét pixel = 4 bytes: R,G,B,A
  for (let i = 0; i < d1.length && i < d2.length; i += 4) {
    const dr = Math.abs(d1[i] - d2[i]);
    const dg = Math.abs(d1[i + 1] - d2[i + 1]);
    const db = Math.abs(d1[i + 2] - d2[i + 2]);
    // Juster 50 hvis du vil have den mere/færre følsom
    if (dr + dg + db > 50) diffPixels++;
  }

  const changeRatio = diffPixels / totalPixels;
  return changeRatio > threshold; // 0.02 = 2% af pixels ændret
}

async function takeSnapshot() {
  const filename = path.join(__dirname, `snapshot_${Date.now()}.jpg`);
  return new Promise<void>((resolve, reject) => {
    ffmpeg(RTSP_HIGH)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-stimeout', '5000000'
      ])
      .frames(1)
      .output(filename)
      .on('end', () => {
        console.log(`📸 Snapshot gemt: ${filename}`);
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

async function monitor() {
  console.log('Starter lokal motion detection...');
  let prevFrame = await grabFrame(RTSP_LOW);

  while (true) {
    try {
      const currFrame = await grabFrame(RTSP_LOW);
      if (await hasMotion(prevFrame, currFrame)) {
        console.log('🚨 Bevægelse registreret! Tager snapshot...');
        await takeSnapshot();
        await delay(3000); // undgå spam
      }
      prevFrame = currFrame;
    } catch (err) {
      console.error('Fejl i monitor:', err);
    }
    await delay(1000);
  }
}

monitor();