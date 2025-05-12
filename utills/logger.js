const {createLogger, transports, format} = require('winston');
const path = require('path');
const logger = createLogger({
  format: format.combine(
    format.timestamp({format: 'YYYY-MM-DD HH:mm:ss:ms'}),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.File({
      filename: path.join(__dirname,'../logs/all-logs.log'),
      json: true,
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new transports.Console(),
  ]
});

module.exports = logger;