import mongoose from "mongoose";
import {DB_NAME} from "./constant.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./env",
});

connectDB();

/* 
import express from "express";

const app = express();


(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (err) => {
        console.log("Err: ", err);
        throw err
    });

    app.listen(process.env.PORT, () => {
        console.log(`App is listening on port ${process.env.PORT}`)
    })
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }
})();
*/
