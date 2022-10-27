import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const transport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, 'logs/application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
});

export default winston.createLogger({
  format: winston.format.combine(
    winston.format.splat(),
    // format log times
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    // Add color
    winston.format.colorize(),
    // setup format log
    winston.format.printf((log) => {
      if (log.stack) return `[${log.timestamp}] [${log.level}] ${log.stack}`;
      return `[${log.timestamp}] [${log.level}] ${log.message}`;
    })
  ),
  transports: [transport],
});
