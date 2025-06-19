// ffmpeg.js
import ffmpeg from "fluent-ffmpeg";
import { Vibrant } from "node-vibrant/node";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import Color from 'color'; // <--- Re-import the color library

ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");

export const extractMetadataAndThumbnail = (videoPath) => {
  return new Promise((resolve, reject) => {
    const tempDir = path.resolve(process.cwd(), "public", "temp");
    const thumbnailFilename = `${uuidv4()}.png`;
    const thumbnailPath = path.join(tempDir, thumbnailFilename);

    ffmpeg(videoPath)
      .on("filenames", (filenames) => {
        console.log("Thumbnail will be named:", filenames[0]);
      })
      .on("end", () => {
        ffmpeg.ffprobe(videoPath, async (err, metadata) => {
          if (err) return reject(err);

          // Initialize with default HEX strings
          let dominantColorHex = '#333333';
          let darkHoverColorHex = '#222222';
          let lightTextColorHex = '#FFFFFF';

          try {
            const palette = await Vibrant.from(thumbnailPath).getPalette();

            const selectedSwatch =
              palette.Vibrant ||
              palette.DarkVibrant ||
              palette.Muted ||
              palette.LightVibrant ||
              palette.DarkMuted ||
              palette.LightMuted;

            if (selectedSwatch && selectedSwatch._rgb && Array.isArray(selectedSwatch._rgb) && selectedSwatch._rgb.length === 3) {
              const [r, g, b] = selectedSwatch._rgb;
              
            
              const baseColor = Color({ r, g, b });
              
              dominantColorHex = baseColor.hex();

             
              if (baseColor.isDark()) {
                darkHoverColorHex = baseColor.darken(0.1).hex();
              } else {
                darkHoverColorHex = baseColor.darken(0.2).hex();
              }
              lightTextColorHex = baseColor.isDark() ? '#FFFFFF' : '#000000';

            } else {
              console.warn("node-vibrant: No suitable swatch or valid _rgb array found. Using default colors.");
            }
          } catch (colorError) {
            console.error("Error extracting or manipulating colors:", colorError);
         
          }

          resolve({
            duration: metadata.format.duration,
            thumbnailPath,
            dominantColorHex,    
            darkHoverColorHex,
            lightTextColorHex,
          });
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .screenshots({
        timestamps: ["50%"],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: "640x360",
      });
  });
};