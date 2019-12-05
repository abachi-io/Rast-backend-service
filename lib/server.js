const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const socket = require('ws')

const logger = require('./components/logger')
const database = require('./components/database')

const app = express()
const port = process.env.SERVER_PORT || 2906

const server = app.listen(port, () => {
  app.use(express.json())
  app.use(helmet())
  app.use(cors())
  app.use('/', require('./routes'))
  logger.info(`Listening on port: ${port}`)
})

module.exports = new socket.Server({server})
