import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import sharp from "sharp";
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
  const targetWidth = options.width ?? 240; 

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const duration = metadata.format.duration;
      const fps = thumbnailCount / duration;

      // Get original video resolution
      const videoStream = metadata.streams.find(s => s.codec_type === "video");
      const originalWidth = videoStream.width;
      const originalHeight = videoStream.height;
      const aspectRatio = originalWidth / originalHeight;

      // Calculate height based on targetWidth and aspect ratio
      const targetHeight = Math.round(targetWidth / aspectRatio);
      const rows = Math.ceil(thumbnailCount / columns);

      const vf = `fps=${fps},scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},tile=${columns}x${rows}`;

      ffmpeg(videoPath)
        .outputOptions(["-vf", vf, "-frames:v", "1"])
        .save(spritePath)
        .on("end", async () => {
          try {
            const { width: totalWidth, height: totalHeight } = await sharp(spritePath).metadata();

            // Real tile sizes
            const realTileWidth = Math.floor(totalWidth / columns);
            const realTileHeight = Math.floor(totalHeight / rows);

            // Upload sprite
            const uploadedSprite = await uploadToSupabase(spritePath, "video-sprites");
            if (!uploadedSprite?.url) return reject("Sprite upload failed");
            const spriteUrl = uploadedSprite.url;

            // Create VTT
            const formatTime = (s) =>
              new Date(s * 1000).toISOString().substring(11, 23);
            let vtt = "WEBVTT\n\n";
            const step = duration / thumbnailCount;

            for (let i = 0; i < thumbnailCount; i++) {
              const start = i * step;
              const end = (i + 1) * step;
              const row = Math.floor(i / columns);
              const col = i % columns;
              const x = col * realTileWidth;
              const y = row * realTileHeight;

              vtt += `${formatTime(start)} --> ${formatTime(end)}\n`;
              vtt += `${spriteUrl}#xywh=${x},${y},${realTileWidth},${realTileHeight}\n\n`;
            }

            fs.writeFileSync(vttPath, vtt);

            // Upload VTT
            const uploadedVtt = await uploadToSupabase(vttPath, "video-sprites");
            if (!uploadedVtt?.url) return reject("VTT upload failed");

            resolve({
              spritePath: spriteUrl,
              vttPath: uploadedVtt.url,
              columns,
              tileWidth: realTileWidth,
              tileHeight: realTileHeight,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on("error", reject);
    });
  });
};
