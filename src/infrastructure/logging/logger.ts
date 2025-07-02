import pino, { LoggerOptions } from 'pino';

const pinoOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
};

if (process.env.NODE_ENV !== 'production') {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  };
}

const logger = pino(pinoOptions);

export default logger;
