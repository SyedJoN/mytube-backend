import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // use unique bhut sari same files ek hi naam ki ni hon later change it
  },
});

export const upload = multer({
  storage,
});
