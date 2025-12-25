import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // info in prod, debug in dev
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // JSON logs are best for parsing by Docker & log aggregators
  ),
  transports: [
    // stdout for normal logs
    new winston.transports.Console({
      level: 'info',
      stderrLevels: [] // ensures info logs go to stdout
    }),
    // stderr for warnings & errors
    new winston.transports.Console({
      level: 'error',
      stderrLevels: ['error']
    })
  ]
});

// In development, pretty-print logs
if (process.env.NODE_ENV !== 'production') {
  logger.configure({
    level: process.env.LOG_LEVEL || 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ''
        }`;
      })
    ),
    transports: [new winston.transports.Console()]
  });
}

export default logger;
