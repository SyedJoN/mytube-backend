import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./public/temp"),
  filename: (req, file, cb) => cb(null, uuidv4() + "-" + file.originalname),
});

// const fileFilter = (req, file, cb) => {
//   file.mimetype.startsWith("image/")
//     ? cb(null, true)
//     : cb(new Error("Only images are allowed"), false);
// };

export const upload = multer({
  storage,
  // limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit

});
