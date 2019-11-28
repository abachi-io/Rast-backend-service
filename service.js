const dotenv = require('dotenv').config()
const logger = require('./lib/components/logger');

logger.info('Initiating service...')

const server = require('./lib/server.js')
