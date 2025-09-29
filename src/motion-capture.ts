// src/motion-capture.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Miljøvariable
const CAMERA_IP = process.env.CAMERA_IP;
const USRNAME = process.env.USRNAME;
const PASSWORD = process.env.PASSWORD;

if (!CAMERA_IP || !USRNAME || !PASSWORD) {
  console.error("❌ Mangler miljøvariable: CAMERA_IP / USRNAME / PASSWORD");
  process.exit(1);
}

const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

const RTSP_LOW = `rtsp://${USRNAME}:${PASSWORD}@${CAMERA_IP}:554/stream2`;
const RTSP_HIGH = `rtsp://${USRNAME}:${PASSWORD}@${CAMERA_IP}:554/stream1`;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// 🎥 Start ffmpeg der gemmer snapshots med timestamp
function startHighStreamCapture() {
  console.log("Starter højopløsnings-stream capture...");
  const folder = path.join(SNAPSHOT_DIR, new Date().toISOString().split("T")[0]);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  ffmpeg(RTSP_HIGH)
    .inputOptions(["-rtsp_transport", "tcp", "-stimeout", "5000000"])
    .outputOptions("-q:v", "2")
    .on("error", (err) => {
      console.error("Fejl i HIGH ffmpeg:", err);
      setTimeout(startHighStreamCapture, 2000);
    })
    .on("end", () => console.log("ffmpeg stoppede – genstarter"))
    .save(path.join(folder, `stream-${Date.now()}.jpg`));
}

// 🔎 Find nyeste snapshot i hele mappen
function getLatestSnapshot(): string | null {
  let latestFile: string | null = null;
  let latestMtime = 0;

  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      const folder = path.join(SNAPSHOT_DIR, entry.name);
      fs.readdirSync(folder).forEach((f) => {
        if (f.endsWith(".jpg")) {
          const fp = path.join(folder, f);
          const mtime = fs.statSync(fp).mtimeMs;
          if (mtime > latestMtime) {
            latestMtime = mtime;
            latestFile = fp;
          }
        }
      });
    }
  });
  return latestFile;
}

// 🧹 Slet gamle billeder
function cleanupOldSnapshots(maxAgeDays = 7) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(SNAPSHOT_DIR, entry.name);
    if (entry.isDirectory()) {
      fs.readdirSync(fullPath).forEach((file) => {
        const filePath = path.join(fullPath, file);
        if (fs.statSync(filePath).mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Slettede gammelt snapshot:", filePath);
        }
      });
      if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
    }
  });
}

// 🌐 Webserver
const app = express();
const PORT = Number(process.env.PORT) || 10000;

app.set("etag", false);
app.use("/snapshots", express.static(SNAPSHOT_DIR, {
  etag: false,
  cacheControl: false,
  maxAge: 0,
}));

app.get("/", (_req, res) => {
  res.send("📸 Motion detection kører – se /latest og /photos");
});

// 🚀 /latest finder nyeste fil og sender den
app.get("/latest", (req, res) => {
  const latest = getLatestSnapshot();
  if (!latest) return res.status(404).send("Ingen snapshots endnu");
  const buf = fs.readFileSync(latest);
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Last-Modified", new Date().toUTCString());
  res.end(buf);
});

// 📂 /photos viser liste over alle billeder
app.get("/photos", (_req, res) => {
  const files: { path: string; mtime: number }[] = [];
  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      const folder = path.join(SNAPSHOT_DIR, entry.name);
      fs.readdirSync(folder).forEach((f) => {
        if (f.endsWith(".jpg")) {
          const fp = path.join(folder, f);
          files.push({ path: `/snapshots/${entry.name}/${f}`, mtime: fs.statSync(fp).mtimeMs });
        }
      });
    }
  });
  files.sort((a, b) => b.mtime - a.mtime);

  res.send(`
    <html>
      <head><title>📸 Galleri</title></head>
      <body>
        <h1>📸 Galleri (nyeste først)</h1>
        <p><a href="/latest?t=${Date.now()}" target="_blank">Åbn seneste billede</a></p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${files.map(f => `<a href="${f.path}?t=${f.mtime}" target="_blank">
            <img src="${f.path}?t=${f.mtime}" style="max-width:200px;border:1px solid #ccc;">
          </a>`).join("")}
        </div>
      </body>
    </html>
  `);
});

// 🧹 Cleanup manuelt
app.get("/cleanup", (_req, res) => {
  cleanupOldSnapshots(0);
  res.send("🧹 Cleanup kørt!");
});

app.listen(PORT, () => console.log(`🌐 Webserver kører på port ${PORT}`));

// Start capture og cleanup
startHighStreamCapture();
setInterval(() => cleanupOldSnapshots(7), 24 * 60 * 60 * 1000);