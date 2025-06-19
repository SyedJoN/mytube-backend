import ImageKit from "imagekit";
import fs from "fs";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const uploadOnImageKit = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) return null;

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileName = Date.now() + "-" + localFilePath.split("/").pop();

    const response = await imagekit.upload({
      file: fileBuffer,
      fileName,
    });

    fs.unlinkSync(localFilePath);

    return {
      url: response.url,
      fileId: response.fileId,
    };
  } catch (error) {
    console.error("ImageKit Upload Error:", error?.message || error);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath); 
    return null;
  }
};

export { uploadOnImageKit };
