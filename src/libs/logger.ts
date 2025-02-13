import winston from "winston";

const severity = winston.format((log) => {
  log["severity"] = log.level.toUpperCase();
  return log;
});

const errorReport = winston.format((log) => {
  if (log instanceof Error) {
    log.err = {
      name: log.name,
      message: log.message,
      stack: log.stack,
    };
  }
  return log;
});

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.splat(),
    severity(),
    errorReport(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
export default logger;
