require('dotenv').config();

const get = (key, fallback) => {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : fallback;
};

const parseBool = (value, fallback = true) => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const withOptionalPort = (config) => {
  const port = process.env.DB_PORT;
  if (port !== undefined && port !== '') {
    return { ...config, port: Number(port) };
  }

  return config;
};

const baseConfig = {
  dialect: 'mysql',
};

module.exports = {
  development: withOptionalPort({
    ...baseConfig,
    username: get('DB_USERNAME', 'root'),
    password: get('DB_PASSWORD', ''),
    database: get('DB_NAME', 'been_there_app'),
    host: get('DB_HOST', '127.0.0.1'),
    logging: parseBool(process.env.DB_LOGGING, true),
  }),
  test: withOptionalPort({
    ...baseConfig,
    username: get('DB_USERNAME', 'been_user'),
    password: get('DB_PASSWORD', 'Been!New-2025'),
    database: get('DB_TEST_NAME', 'been_there_app_test'),
    host: get('DB_HOST', '127.0.0.1'),
    logging: parseBool(process.env.DB_LOGGING, false),
  }),
  production: withOptionalPort({
    ...baseConfig,
    username: get('DB_USERNAME'),
    password: get('DB_PASSWORD'),
    database: get('DB_NAME'),
    host: get('DB_HOST'),
    logging: parseBool(process.env.DB_LOGGING, false),
  }),
};
