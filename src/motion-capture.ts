// src/motion-capture.ts
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import express from "express";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ESM helper til __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMERA_IP = "85.83.245.186";
const USERNAME = "Mlkv3TapoC100";
const PASSWORD = "C100Opat";

// Lav opløsning til motion detection
const RTSP_LOW = `rtsp://${USERNAME}:${PASSWORD}@${CAMERA_IP}:554/stream2`;
// Høj opløsning til snapshots
const RTSP_HIGH = `rtsp://${USERNAME}:${PASSWORD}@${CAMERA_IP}:554/stream1`;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const argQuality = process.argv.find((a) => a.startsWith("--quality="));
const outputQuality = argQuality ? parseInt(argQuality.split("=")[1], 10) : 2;

let jimpPromise: Promise<any> | null = null;
async function getJimp() {
  if (!jimpPromise) jimpPromise = import("jimp");
  return jimpPromise;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Henter ét frame fra en RTSP-stream som buffer
async function grabFrame(rtspUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    ffmpeg(rtspUrl)
      .inputOptions(["-rtsp_transport", "tcp", "-stimeout", "5000000"])
      .frames(1)
      .format("image2")
      .outputOptions("-q:v 2")
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on("data", (chunk) => chunks.push(chunk));
  });
}

// Sammenligner to billeder og returnerer true hvis ændringen overstiger threshold
async function hasMotion(prev: Buffer, curr: Buffer, threshold = 0.02): Promise<boolean> {
  const jimp = await getJimp();
  const Jimp = jimp.Jimp;
  if (!Jimp) throw new Error("Jimp klasse ikke fundet i modulet");

  const img1 = await Jimp.read(prev);
  const img2 = await Jimp.read(curr);

  const targetWidth = 160;
  img1.resize({ w: targetWidth });
  img2.resize({ w: targetWidth });

  const { data: d1, width, height } = img1.bitmap as { data: Buffer; width: number; height: number };
  const { data: d2 } = img2.bitmap as { data: Buffer };

  let diffPixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < d1.length && i < d2.length; i += 4) {
    const dr = Math.abs(d1[i] - d2[i]);
    const dg = Math.abs(d1[i + 1] - d2[i + 1]);
    const db = Math.abs(d1[i + 2] - d2[i + 2]);
    if (dr + dg + db > 50) diffPixels++;
  }

  const changeRatio = diffPixels / totalPixels;
  return changeRatio > threshold;
}

const latestImagePath = path.join(__dirname, "latest.jpg");

// Starter en baggrunds-ffmpeg-proces, der hele tiden opdaterer latest.jpg
function startHighStreamCapture() {
  console.log("Starter højopløsnings-stream capture i baggrunden...");
  ffmpeg(RTSP_HIGH)
    .inputOptions(["-rtsp_transport", "tcp", "-stimeout", "5000000"])
    .outputOptions("-q:v", `${outputQuality}`)
    .outputOptions("-update", "1")
    .output(latestImagePath)
    .on("error", (err) => {
      console.error("Fejl i højopløsnings-stream:", err);
      setTimeout(startHighStreamCapture, 2000);
    })
    .run();
}

// Tager et snapshot ved at kopiere latest.jpg til dato-mappe med tidsstempel
async function takeSnapshot() {
  const now = new Date();
  const dateFolder = now.toISOString().split("T")[0];
  const timeStamp = now.toTimeString().split(" ")[0].replace(/:/g, "-");

  const folderPath = path.join(__dirname, dateFolder);
  ensureDir(folderPath);

  const filename = path.join(folderPath, `${timeStamp}.jpg`);

  try {
    fs.copyFileSync(latestImagePath, filename);
    console.log(`📸 Snapshot gemt: ${filename}`);
  } catch (err) {
    console.error("Kunne ikke kopiere snapshot:", err);
  }
}

// Overvåger bevægelse og tager snapshots ved ændring
async function monitor() {
  console.log("Starter lokal motion detection...");
  let prevFrame = await grabFrame(RTSP_LOW);

  while (true) {
    try {
      const currFrame = await grabFrame(RTSP_LOW);
      if (await hasMotion(prevFrame, currFrame)) {
        console.log("🚨 Bevægelse registreret! Gemmer snapshot...");
        await takeSnapshot();
        await delay(3000);
      }
      prevFrame = currFrame;
    } catch (err) {
      console.error("Fejl i monitor:", err);
    }
    await delay(1000);
  }
}

// 🚀 Start motion detection
startHighStreamCapture();
monitor();

// 🌐 Webserver til snapshots
const app = express();
const PORT = process.env.PORT || 10000;

// Gør snapshots tilgængelige som statiske filer
app.use(express.static(__dirname));

// Healthcheck
app.get("/", (req, res) => {
  res.send("📸 Motion detection service kører – snapshots ligger i undermapperne.");
});

// Seneste snapshot
app.get("/latest", (req, res) => {
  res.sendFile(latestImagePath);
});

app.listen(PORT, () => {
  console.log(`🌐 Webserver kører på port ${PORT}`);
});