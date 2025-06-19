import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { v4 as uuidv4 } from "uuid";


ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");

export const extractMetadataAndThumbnail = (videoPath) => {
  return new Promise((resolve, reject) => {
    const thumbnailPath = path.join("public/temp", `${uuidv4()}.png`);

    ffmpeg(videoPath)
      .on("filenames", (filenames) => {
        console.log("Thumbnail will be named:", filenames[0]);
      })
      .on("end", () => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) return reject(err);
          resolve({
            duration: metadata.format.duration,
            thumbnailPath,
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
