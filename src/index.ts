import path from "path";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import express, { Application } from "express";
import moment from "moment";
import { createServer } from "https";
import * as fs from "fs";
import logger from "@/libs/logger";

import dataSource from "./config/data-source";
import { toJapanDateTime } from "./utils/datetime";
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
app.get("/_ah/warmup", (req, res) => {
  const currentDate = new Date();
  logger.info("current datetime (local) : " + moment(currentDate).format("YYYY/MM/DD HH:mm:ss"));
  logger.info(
    "current datetime (JST) : " + moment(toJapanDateTime(currentDate)).format("YYYY/MM/DD HH:mm:ss"),
  );

  res.send("warmup");
});

const server = process.env.NODE_HTTPS === "true"
  ? createServer({
      key: fs.readFileSync("./.misc/localhost-key.pem"),
      cert: fs.readFileSync("./.misc/localhost.pem"),
    }, app)
  : app;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${ PORT }`);
  logger.info(`Environment ${ process.env.ENV }`);
});

// establish database connection
dataSource.initialize()
  .then(() => {
    logger.info("Data Source has been initialized!");
    app.use("/api", Router);
  })
  .catch((err) => {
    logger.error(`Error during Data Source initialization: ${ err }`);
  });
