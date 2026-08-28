import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// File Transport
const fileTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
});

// Console Transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, context, trace,...meta }) => {
      return `${timestamp} [${context || 'Application'}] ${level}: ${message}${
        trace ? `\n${trace}` : ''
      }`;
    }),
  ),
});

// Main Logger
const logger = winston.createLogger({
  defaultMeta: { env: process.env.NODE_ENV },
  level: 'debug',
  format: winston.format.json(),
  transports: [
    // logstashTransport, 
    fileTransport, 
    consoleTransport],
});

// File Transport Error Handling
fileTransport.on('error', (err) => {
  logger.error('File transport error:', { error: err.message });
});

// Console Transport Error Handling (optional)
consoleTransport.on('error', (err) => {
  logger.error('Console transport error:', { error: err.message });
});

logger.on('error', (err) => {
  console.error('Winston encountered an error:', err.message, err.stack);
});


export { logger };

// Winston uses the following default log levels (in increasing order of severity):

//     silly: Lowest level for very detailed logs.
//     debug: Used for debugging information.
//     verbose: For detailed application-specific logs.
//     info: General operational logs.
//     warn: For warnings about potential issues.
//     error: For error messages.

// When you set level: 'info', the logger will only process logs with the levels:

//     info
//     warn
//     error

// Logs with lower severity, such as debug or silly, will be ignored.