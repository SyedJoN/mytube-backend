
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadToSupabase } from "./SupaBase.js";

ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");

export const generateThumbnailsAndVTT = async (videoPath, options = {}) => {
  const tempDir = path.resolve(process.cwd(), "public", "temp");
  const spriteName = `${uuidv4()}-sprite.jpg`;
  const vttName = `${uuidv4()}.vtt`;

  const spritePath = path.join(tempDir, spriteName);
  const vttPath = path.join(tempDir, vttName);

  const thumbnailCount = options.thumbnailCount ?? 100;
  const columns = options.columns ?? 10;
  const width = options.width ?? 240;
  const height = options.height ?? 135;

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      const fps = thumbnailCount / duration;
      const rows = Math.ceil(thumbnailCount / columns);

      const vf = `fps=${fps},scale=${width}:${height},tile=${columns}x${rows}`;

      ffmpeg(videoPath)
        .outputOptions(["-vf", vf, "-frames:v", "1"])
        .on("end", async () => {
        
          const uploadedSprite = await uploadToSupabase(spritePath, "video-sprites");
          if (!uploadedSprite?.url) return reject("Sprite upload failed");

          const spriteUrl = uploadedSprite.url;

      
          const formatTime = (s) => new Date(s * 1000).toISOString().substring(11, 23);
          let vtt = "WEBVTT\n\n";
          const step = duration / thumbnailCount;

          for (let i = 0; i < thumbnailCount; i++) {
            const start = i * step;
            const end = (i + 1) * step;
            const row = Math.floor(i / columns);
            const col = i % columns;
            const x = col * width;
            const y = row * height;

            vtt += `${formatTime(start)} --> ${formatTime(end)} align:start line:0%\n`;
            vtt += `${spriteUrl}#xywh=${x},${y},${width},${height}\n\n`;
          }

          fs.writeFileSync(vttPath, vtt);

          resolve({
            spritePath: spritePath,
            vttPath: vttPath,
            publicSpriteUrl: spriteUrl,
          });
        })
        .on("error", reject)
        .save(spritePath);
    });
  });
};


