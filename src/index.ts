import path from "path";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import express, { Application } from "express";
import moment from "moment";

import AppDataSource from "./config/data-source";
import { toJapanDateTime } from "./utils/common";
import Router from "./routes";

const myEnv = dotenv.config({ path: path.join(__dirname, ".env") });
dotenvExpand.expand(myEnv);

const PORT = process.env.PORT || 8080;

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
app.use(cookieParser());
app.use(express.static("public"));
// app.use(bodyParser.json());
app.use(cors({
  origin: process.env.CLIENT_BASE_URL,
  credentials: true,
}));

app.get("/_ah/warmup", (req, res) => {
  const currentDate = new Date();
  console.log("current datetime (local) : " + moment(currentDate).format("YYYY/MM/DD HH:mm:ss"));
  console.log(
    "current datetime (JST) : " + moment(toJapanDateTime(currentDate)).format("YYYY/MM/DD HH:mm:ss")
  );

  res.send("warmup");
});

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
  console.log("Enviroment", process.env.ENV);
});

// establish database connection
AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    app.use("/api", Router);
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });
