const express = require('express')
const axios = require('axios')
const webSocket = require('ws')
const uuidv4 = require('uuid/v4');
const User = require('../../models/User')
const Web3 = require('../../components/Web3')
const methodList = require('../../constants/methods')

const router = express.Router()

const web3 = new Web3()

// SOCKET \\

const io = require('../../server')
const ws = new webSocket(process.env.WEB3_WS)

let subscriptionMap = {}

io.on('connection', (socket) => {
  const uuid = uuidv4()
  subscriptionMap[uuid] = {
    connected: true,
    socket: socket,
    subscriptions: {},
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
    })
  })

  socket.on('error', (error) => {})

  ws.on('message', (payload) => {
    const data = JSON.parse(payload)
    if(data.id && data.id === `${uuid}0`) { // Cancel subscription
      console.log(`[${uuid}] Client destroyed a subscription`)
    } else if(data.id && data.id === `${uuid}1`) { // Create subscription
      subscriptionMap[uuid].subscriptions[data.result] = true
      data.id = 1
      socket.send(JSON.stringify(data))
      console.log(`[${uuid}] Client created a subscription`)
    } else if(data.method && data.method === "eth_subscription") {
      if(subscriptionMap[uuid].subscriptions[data.params.subscription]) {
        if(subscriptionMap[uuid].connected) {
          socket.send(payload)
        }
      }
    }
  })
})

const successResponse = (response, message = null, data = null) => {
  response.status(200).send({
    success: true,
    timestamp: Date.now(),
    message,
    data
  })
}

const errorResponse = (response, message, status = 403) => {
  response.status(status).send({
    success: false,
    timestamp: Date.now(),
    message
  })
}

const verifyApiKey = async (request, response, next) => {
  const apiKey = request.headers.authorization
  if (!apiKey) return errorResponse(response, 'Invalid API key')
  const user = await User.findOne({apiKey})
  if(!user) return errorResponse(response, 'Invalid API key')
  return next()
}

const verifyApiKeyWeb3 = async (request, response, next) => {
  const { apiKey } = request.params
  if (!apiKey) return errorResponse(response, 'Invalid API key')
  const user = await User.findOne({apiKey})
  if(!user) return errorResponse(response, 'Invalid API key')
  return next()
}

const call = async (response, description, method, args = []) => {
  try {
    const payload = args.length > 0 ? await method(...args) : await method()
    successResponse(
      response,
      description,
      payload
    )
  } catch (error) {
    errorResponse(
      response,
      error.message || error
    )
  }
}

const getNonce = (from) => {
  return new Promise((resolve, reject) => {
    Promise.all([
      web3.http.eth.txpool.content(),
      web3.http.eth.getTransactionCount(from, 'pending')
    ])
    .then(data => {
      const txpool = data[0]
      let transactionCount = data[1]
      if(txpool.pending) {
        if(txpool.pending[from]) {
          const pendingNonces = Object.keys(txpool.pending[from])
          transactionCount = parseInt(pendingNonces[pendingNonces.length-1])+1
        }
      }
      resolve(transactionCount)
    })
    .catch(reject)
  })
}

const generateTransactionParams = (from, to, value) => {
  return new Promise((resolve, reject) => {
    Promise.all([
      web3.http.eth.getGasPrice(),
      getNonce(from)
    ])
    .then(data => {
      const gasPrice = data[0]
      const nonce = data[1]
      const transactionParams = {
        nonce,
        gasPrice: web3.http.eth.utils.toHex(gasPrice),
        gasLimit: '0x47b760',
        to: to,
        from: from,
        value: web3.http.eth.utils.toHex(value),
        data: payload
      }
      resolve({transactionParams, nonce})
    })
    .catch(reject)
  })
}

const sendSignedTransaction = async (signedTransaction) => {
  return new Promise((resolve, reject) => {
    web3.http.eth.sendSignedTransaction(signedTransaction.rawTransaction)
      .then(receipt => {
        resolve(receipt)
      })
      .catch(reject)
  })
}

// API endpoints

// Web3 HTTP Custom Provider

router.post('/web3/:apiKey', verifyApiKeyWeb3, (request, response) => {
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

router.post('/web3', (request, response) => {
  return errorResponse(response, 'API key not provided')
})

// Web3 WS Custom Provider






// RPC endpoint

router.post('/rpc', verifyApiKey, (request, response) => {
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
        return successResponse(response, method, reply.data)
      })
      .catch(error => {
        return errorResponse(response, error.message || error)
      })
  } catch (error) {
    return errorResponse(response, error.message || error)
  }
})

// General

router.get('/ping', (request, response) => {
  return successResponse(response, 'pong')
})

router.get('/stats', (request, response) => {
  return successResponse(response, 'Stats', {
    uptime: process.uptime(),
  });
})

// Web3

const ticker = process.env.TICKER || 'eth'

router.get(`/${ticker}/getGasPrice`, verifyApiKey, (request, response) => {
  call(
    response,
    'Returns the current gas price oracle. The gas price is determined by the last few blocks median gas price.',
    web3.http.eth.getGasPrice
  )
})

router.get(`/${ticker}/isSyncing`, verifyApiKey,(request, response) => {
  call(
    response,
    'Checks if the node is currently syncing and returns either a syncing object, or false.',
    web3.http.eth.isSyncing
  )
})

router.get(`/${ticker}/getBlockNumber`, verifyApiKey, (request, response) => {
  call(
    response,
    'Returns the current block number.',
    web3.http.eth.getBlockNumber,
  )
})

router.get(`/${ticker}/getBalance/:arg`, verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Get the balance of an address at a given block.',
    web3.http.eth.getBalance,
    [arg]
  )
})

router.get(`/${ticker}/getBlock/:arg`, verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns a block matching the block number or block hash.',
    web3.http.eth.getBlock,
    [arg]
  )
})

router.get(`/${ticker}/getBlockTransactionCount/:arg`, verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the number of transaction in a given block.',
    web3.http.eth.getBlockTransactionCount,
    [arg]
  )
})

router.get(`/${ticker}/getBlockUncleCount/:arg`, verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the number of uncles in a block from a block matching the given block hash.',
    web3.http.eth.getBlockUncleCount,
    [arg]
  )
})


// Utils

router.get('/utils/isAddress/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Checks if a given string is a valid Ethereum address. It will also check the checksum, if the address has upper and lowercase letters.',
    web3.http.utils.isAddress,
    [arg]
  )
})

router.get('/utils/toChecksumAddress/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Will convert an upper or lowercase Ethereum address to a checksum address.',
    web3.http.utils.toChecksumAddress,
    [arg]
  )
})

router.get('/utils/checkAddressChecksum/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Checks the checksum of a given address. Will also return false on non-checksum addresses.',
    web3.http.utils.checkAddressChecksum,
    [arg]
  )
})

router.get('/utils/toHex/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Will auto convert any given value to HEX. Number strings will interpreted as numbers. Text strings will be interpreted as UTF-8 strings.',
    web3.http.utils.toHex,
    [arg]
  )
})

router.get('/utils/hexToNumberString/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the number representation of a given HEX value as a string.',
    web3.http.utils.hexToNumberString,
    [arg]
  )
})

router.get('/utils/hexToNumber/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the number representation of a given HEX value.',
    web3.http.utils.hexToNumber,
    [arg]
  )
})

router.get('/utils/numberToHex/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the HEX representation of a given number value.',
    web3.http.utils.numberToHex,
    [arg]
  )
})

router.get('/utils/hexToUtf8/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the UTF-8 string representation of a given HEX value.',
    web3.http.utils.hexToUtf8,
    [arg]
  )
})

router.get('/utils/hexToAscii/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the ASCII string representation of a given HEX value.',
    web3.http.utils.hexToAscii,
    [arg]
  )
})

router.get('/utils/utf8ToHex/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the HEX representation of a given UTF-8 string.',
    web3.http.utils.utf8ToHex,
    [arg]
  )
})

router.get('/utils/asciiToHex/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns the HEX representation of a given ASCII string.',
    web3.http.utils.asciiToHex,
    [arg]
  )
})

router.get('/utils/hexToBytes/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns a byte array from the given HEX string.',
    web3.http.utils.hexToBytes,
    [arg]
  )
})


router.get('/utils/bytesToHex/:arg', verifyApiKey, (request, response) => {
  const { arg } = request.params
  call(
    response,
    'Returns a HEX string from a byte array.',
    web3.http.utils.bytesToHex,
    [arg]
  )
})



module.exports = router
