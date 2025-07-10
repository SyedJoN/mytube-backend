// ffmpeg.js
import ffmpeg from "fluent-ffmpeg";
import {Vibrant} from "node-vibrant/node";
import path from "path";
import {v4 as uuidv4} from "uuid";
import Color from "color";
import fs from "fs";

ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");

export const extractMetadataAndThumbnail = (videoPath) => {
  return new Promise((resolve, reject) => {
    const tempDir = path.resolve(process.cwd(), "public", "temp");
    const id = uuidv4();

    const thumbnailFilename = `${id}.png`;
    const previewFilename = `${id}_preview.mp4`;

    const thumbnailPath = path.join(tempDir, thumbnailFilename);
    const previewPath = path.join(tempDir, previewFilename);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, {recursive: true});
    }

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ["50%"],
        filename: thumbnailFilename,
        folder: tempDir,
        size: "640x360",
      })
      .on("end", () => {
        ffmpeg.ffprobe(videoPath, async (err, metadata) => {
          if (err) return reject(err);

          const duration = metadata.format.duration;
          const previewStart = Math.min(1, duration / 4); // Start around 1s in

          ffmpeg(videoPath)
            .setStartTime(previewStart)
            .duration(2)
            .size("640x360")
            .noAudio()
            .output(previewPath)
            .on("end", async () => {
              try {
                const palette = await Vibrant.from(thumbnailPath).getPalette();
                const swatch =
                  palette.Vibrant ||
                  palette.DarkVibrant ||
                  palette.Muted ||
                  palette.LightVibrant ||
                  palette.DarkMuted ||
                  palette.LightMuted;

                if (swatch && swatch._rgb?.length === 3) {
                  const [r, g, b] = swatch._rgb;
                  const baseColor = Color.rgb(r, g, b);
                  const white = Color.rgb(255, 255, 255);
                  const activeColor = baseColor.darken(0.2).rgb().array();
                  const primaryColor = white.mix(baseColor, 0.2).rgb().array();
                  const secondaryColor = white
                    .mix(baseColor, 0.5)
                    .rgb()
                    .array();

                  const toRgbString = (arr) =>
                    `rgb(${arr.map(Math.round).join(",")})`;

                  resolve({
                    duration,
                    thumbnailPath,
                    previewPath,
                    activeColor: toRgbString(activeColor),
                    primaryColor: toRgbString(primaryColor),
                    secondaryColor: toRgbString(secondaryColor),
                  });
        
                }
              } catch (colorError) {
                console.warn("Color extraction failed:", colorError);
                     await fs.promises.unlink(thumbnailPath).catch(console.warn);
                  await fs.promises.unlink(previewPath).catch(console.warn);
              }
            })
            .on("error", (err) => {
              fs.unlink(thumbnailPath, () => {});
              fs.unlink(previewPath, () => {});
              reject(err);
            })
            .run();
        });
      })
      .on("error", reject);
  });
};
