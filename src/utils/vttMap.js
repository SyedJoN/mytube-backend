import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";

ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");

export const generateThumbnailsAndVTT = (videoPath, options = {}) => {
  const tempDir = path.resolve(process.cwd(), "public", "temp");
  const spriteName = `${uuidv4()}-sprite.jpg`;
  const vttName = `${uuidv4()}.vtt`;
  const spritePath = path.join(tempDir, spriteName);
  const vttPath = path.join(tempDir, vttName);

  const thumbnailCount = options.thumbnailCount || 100;
  const columns = options.columns || 10;
  const width = options.width || 160;
  const height = options.height || 90;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on("end", () => {
        // Combine thumbnails into sprite
        const tileOutput = path.join(tempDir, "thumb%03d.jpg");

        // ✅ Wrap paths in quotes to prevent issues with spaces
        const montageCmd = `magick montage "${tileOutput}" -tile ${columns}x -geometry ${width}x${height}+0+0 "${spritePath}"`;

        exec(montageCmd, (err, stdout, stderr) => {
          if (err) {
            console.error("Montage Error:", err);
            return reject(new Error(`Montage failed: ${stderr}`));
          }

          // Generate VTT file
          let vtt = "WEBVTT\n\n";
          for (let i = 0; i < thumbnailCount; i++) {
            const start = i;
            const end = i + 1;
            const row = Math.floor(i / columns);
            const col = i % columns;
            const x = col * width;
            const y = row * height;

            const formatTime = (seconds) =>
              new Date(seconds * 1000).toISOString().substr(11, 8) + ".000";

            vtt += `${formatTime(start)} --> ${formatTime(end)}\n`;
            vtt += `${spriteName}#xywh=${x},${y},${width},${height}\n\n`;
          }

          fs.writeFileSync(vttPath, vtt);
          resolve({
            spritePath,
            vttPath,
            totalThumbnails: thumbnailCount,
          });
        });
      })
      .on("error", reject)
      .screenshots({
        count: thumbnailCount,
        folder: tempDir,
        size: `${width}x${height}`,
        filename: "thumb%03d.jpg",
      });
  });
};
