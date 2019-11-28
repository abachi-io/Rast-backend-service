const mongoose = require('mongoose');
const logger = require('./logger')
mongoose.connect('mongodb://127.0.0.1/userManagement', { useNewUrlParser: true, useUnifiedTopology: true, }, (error) => {
  if(!error) return;
  logger.error('Connection to MongoDB unsuccessful')
})

const db = mongoose.connection

db.on('connected', () => {
  logger.info('Connected to MongoDB')
});
