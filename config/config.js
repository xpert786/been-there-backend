require('dotenv').config();

module.exports = {
  development: {
    username: process.env.USERNAME || 'been_user',
    password: process.env.PASSWORD || 'Been!New-2025',
    database: process.env.DATABASE_NAME || 'been_there_app',
    host: process.env.HOSTNAME || '127.0.0.1',
    dialect: 'mysql',
    logging: true
  },
  test: {
    username: process.env.USERNAME || 'been_user',
    password: process.env.PASSWORD || 'Been!New-2025',
    database: process.env.DATABASE_NAME || 'been_there_app_test',
    host: process.env.HOSTNAME || '127.0.0.1',
    dialect: 'mysql'
  },
  production: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE_NAME,
    host: process.env.HOSTNAME,
    dialect: 'mysql'
  }
};
