const express = require('express')
const axios = require('axios')
const webSocket = require('ws')
const uuidv4 = require('uuid/v4');
const router = express.Router()

router.use('/api', require('./api'))
router.use('/user', require('./user'))
router.use('/admin', require('./admin'))

const User = require('../models/User')

const logger = require('../components/logger')
const { successResponse, errorResponse } = require('../helpers')
const methodList = require('../constants/methods')

const verifyApiKeyWeb3 = async (request, response, next) => {
  const { apiKey } = request.params
  if (!apiKey) return errorResponse(response, 'Invalid API key')
  const user = await User.findOne({apiKey})
  if(!user) return errorResponse(response, 'Invalid API key')
  return next()
}

// HTTP Custom Provider

router.post('/:apiKey', verifyApiKeyWeb3, (request, response) => {
  try {
    let { jsonrpc, method, params, id } = request.body
    if (!jsonrpc || !method || !params || !id) return errorResponse(response, 'Invalid RPC object')
    if (!methodList[method]) return errorResponse(response, 'Invalid method or insufficient privileges')
    const call = {
      jsonrpc,
      method,
      params,
      id
    }
    axios.post(process.env.WEB3_HTTP, call)
      .then(reply => {
        return response.send(reply.data)
        return successResponse(response, method, reply.data)
      })
      .catch(error => {
        return errorResponse(response, error.message || error)
      })
  } catch (error) {
    return errorResponse(response, error.message || error)
  }
})

router.post('/', (request, response) => {
  return errorResponse(response, 'API key not provided')
})

// WS Custom Provider

const io = require('../server')
const ws = new webSocket(process.env.WEB3_WS)

ws.on('open', () => {
  logger.info('Socket connected to Geth node')
})

setInterval(()=>{
  ws.ping()
},10000)

ws.on('pong', () => {
})

ws.on('message', (msg) => {
  console.log(msg)
})

ws.on('ping', () => {
  console.log('got ping, doing pongz')
  ws.pong(()=>{})
})



ws.on('close', () => {
  logger.debug('Socket disconnected from Geth node')

})

ws.on('error', (error) => {
  logger.error(error.message || error)
})

let subscriptionMap = {}

const errorResponseWS = (uuid, socket, message, close = true) => {
  if(subscriptionMap[uuid].connected) {
    socket.send(message)
    socket.close()
    subscriptionMap[uuid].connected = false
    console.log(socket.eventNames())
    socket.removeAllListeners();
    console.log(socket.eventNames())


  }
}

const sendWS = (uuid, socket, message) => {
  if(subscriptionMap[uuid].connected) {
    socket.send(message)
  }
}

io.on('connection', (socket, request) => {
  let tempListener
  const uuid = uuidv4()
  const apiKey = request.url
  if (!apiKey) return errorResponseWS(uuid, socket, 'Invalid API key, not sent. Recieved ')
  if(apiKey.length < 65) return errorResponseWS(uuid, socket, 'Invalid API key, too short')
  if(apiKey.length > 65) return errorResponseWS(uuid, socket, 'Invalid API key, too long')
  User.findOne({apiKey: apiKey.split('/')[1]})
    .then(user => {
      if(!user) return errorResponseWS(uuid, socket, 'Invalid API key, no matching user')
    })
    .catch(error => {
      return errorResponseWS(uuid, socket, 'Unknown error')
    })


  subscriptionMap[uuid] = {
    connected: true,
    socket: socket,
    apiKey: apiKey,
    subscriptions: {}
  }
  console.log(`[${uuid}] Client connected`)

  socket.on('message', (payload) => {
    const data = JSON.parse(payload)
    data.id = `${uuid}1`
    ws.send(JSON.stringify(data))
  })

  socket.on('close', () => {
    console.log(`[${uuid}] Client disconnected`)
    subscriptionMap[uuid].connected = false
    Object.keys(subscriptionMap[uuid].subscriptions).map((subscriptionId) => {
      const data = {
        jsonrpc: "2.0",
        id: `${uuid}0`,
        method: "eth_unsubscribe",
        params: [subscriptionId]
      }
      ws.send(JSON.stringify(data))
      console.log(`[${uuid}] Client destroyed a subscription`)
    })
    socket.removeAllListeners()
    tempListener.removeEventListener('message')

  })

  socket.on('error', (error) => {})

  tempListener = ws.on('message', (payload) => {
    const data = JSON.parse(payload)
    if(data.id && data.id === `${uuid}0`) { // Cancel subscription
      console.log(`[${uuid}] Client destroyed a subscription`)
    } else if(data.id && data.id === `${uuid}1`) { // Create subscription
      subscriptionMap[uuid].subscriptions[data.result] = true
      data.id = 1
      sendWS(uuid, socket, JSON.stringify(data))
      console.log(`[${uuid}] Client created a subscription`)
    } else if(data.method && data.method === "eth_subscription") {
      if(subscriptionMap[uuid].subscriptions[data.params.subscription]) {
        sendWS(uuid, socket, payload)
      }
    }
  })
})

module.exports = router
