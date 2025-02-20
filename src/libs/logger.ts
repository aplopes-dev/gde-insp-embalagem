import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.printf(({ level, message, timestamp, ...args }) => {
      const extraInfo = Object.keys(args).length ? `\n${JSON.stringify(args, null, 2)}` : "";
      return `[${timestamp}] ${level}: ${message}${extraInfo}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
