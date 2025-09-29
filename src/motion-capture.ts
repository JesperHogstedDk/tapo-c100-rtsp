// src/motion-capture.ts
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import express from "express";
import dotenv from "dotenv";

dotenv.config(); // indlæs .env lokalt

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ESM helper til __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📌 Miljøvariable
const CAMERA_IP = process.env.CAMERA_IP ;
const USERNAME = process.env.USRNAME ;
const PASSWORD = process.env.PASSWORD ;

// Snapshot‑mappe
const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

const RTSP_LOW = `rtsp://${USERNAME}:${PASSWORD}@${CAMERA_IP}:554/stream2`;
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

const latestImagePath = path.join(SNAPSHOT_DIR, "latest.jpg");

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

  const folderPath = path.join(SNAPSHOT_DIR, dateFolder);
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

// 🧹 Slet gamle billeder (ældre end X dage)
function cleanupOldSnapshots(maxAgeDays = 7) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(SNAPSHOT_DIR, entry.name);

    try {
      const stats = fs.statSync(fullPath);

      if (entry.isDirectory()) {
        fs.readdirSync(fullPath).forEach((file) => {
          const filePath = path.join(fullPath, file);
          const fileStats = fs.statSync(filePath);
          if (fileStats.mtimeMs < cutoff) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Slettede gammelt snapshot: ${filePath}`);
          }
        });

        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`🗑️ Slettede tom mappe: ${fullPath}`);
        }
      } else {
        if (stats.mtimeMs < cutoff && entry.name !== "latest.jpg") {
          fs.unlinkSync(fullPath);
          console.log(`🗑️ Slettede gammel fil: ${fullPath}`);
        }
      }
    } catch (err) {
      console.error("Fejl under cleanup:", err);
    }
  });
}

// 🚀 Start motion detection
startHighStreamCapture();
monitor();

// 🌐 Webserver til snapshots
const app = express();
const PORT = Number(process.env.PORT) || 10000;

app.use(express.static(SNAPSHOT_DIR));

app.get("/", (req, res) => {
  res.send("📸 Motion detection service kører – snapshots ligger i /snapshots.");
});

app.get("/latest", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(latestImagePath);
});

// 📂 Liste over alle fotos
app.get("/photos", (req, res) => {
  const files: string[] = [];

  // Gennemgå snapshot-mapper
  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      const folderPath = path.join(SNAPSHOT_DIR, entry.name);
      fs.readdirSync(folderPath).forEach((file) => {
        if (file.endsWith(".jpg")) {
          files.push(`${entry.name}/${file}`);
        }
      });
    }
  });

  // Sortér nyeste først (både mapper og filer)
  files.sort((a, b) => b.localeCompare(a));

  const html = `
    <html>
      <head>
        <title>📸 Snapshot galleri</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          h1 { margin-bottom: 20px; }
          .grid { display: flex; flex-wrap: wrap; gap: 10px; }
          .grid a { text-decoration: none; }
          .grid img { max-width: 200px; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <h1>📸 Snapshot galleri (nyeste først)</h1>
        <div class="grid">
          ${files
            .map(
              (f) =>
                `<a href="/${f}?t=${Date.now()}" target="_blank">
                   <img src="/${f}?t=${Date.now()}" alt="${f}">
                 </a>`
            )
            .join("\n")}
        </div>
      </body>
    </html>
  `;
  res.send(html);
});

// 🧹 Endpoint til manuel cleanup
app.get("/cleanup", (req, res) => {
  cleanupOldSnapshots(0);
  res.send("🧹 Cleanup kørt!");
});

app.listen
app.listen(PORT, () => {
  console.log(`🌐 Webserver kører på port ${PORT}`);
});

// Kør cleanup ved opstart og derefter dagligt
cleanupOldSnapshots(7);
setInterval(() => cleanupOldSnapshots(7), 24 * 60 * 60 * 1000);