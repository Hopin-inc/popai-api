import winston from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";

export default winston.createLogger({
  format: winston.format.combine(
    winston.format.splat(),
    // format log times
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    // Add color
    winston.format.colorize(),
    // setup format log
    winston.format.printf((log) => {
      if (log.stack) return `[${log.timestamp}] [${log.level}] ${log.stack}`;
      return `[${log.timestamp}] [${log.level}] ${log.message}`;
    })
  ),
  transports: [
    // display by console
    new winston.transports.Console(),
    // display by Cloud Logging
    new LoggingWinston(),
  ],
});
