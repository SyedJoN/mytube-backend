
import connectDB from "./db/index.js";
import dotenv from "dotenv";
import {app} from "./app.js";


dotenv.config();

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("Express connection Failed", err);
      throw err;
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`App listening on PORT ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.log("DB Connection Failed !!!", error);
  });

/* 



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
