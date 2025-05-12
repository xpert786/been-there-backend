//require('dotenv').config(); 
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

module.exports = {
  
  'production': {
    'username': process.env.USERNAME,
    'password': process.env.PASSWORD,
    'database': process.env.DATABASE_NAME,
    'host':     process.env.HOSTNAME,
  
    'dialect': 'mysql',
    'logging':  true,
    
  },
  'test': {
    'username': 'root',
    'password': '',
    'database': 'travelo',
    'host': '127.0.0.1',
    'dialect': 'mysql'
  },
  'development': {
    'username':  'root',  
    'password':  '',
    'database':'travelo', 
    'host':     process.env.HOSTNAME,
    'dialect': 'mysql'
  }
  
  
};

