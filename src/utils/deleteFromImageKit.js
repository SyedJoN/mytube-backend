import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const deleteFromImageKit = async (fileId) => {
  try {
    if (!fileId) return null;

    const result = await imagekit.deleteFile(fileId);
    console.log("ImageKit file deleted:", result);
    return result;
  } catch (error) {
    console.error("Error deleting ImageKit file:", error);
    return null;
  }
};

export { deleteFromImageKit };
