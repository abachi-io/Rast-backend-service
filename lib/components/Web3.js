const web3  = require('web3')

class Web3 {
    constructor() {
      this.http = new web3(new web3.providers.HttpProvider(process.env.WEB3_HTTP || 'http://toorak01.ledgerium.io:8545/'));
      this.ws = new web3(new web3.providers.WebsocketProvider(process.env.WEB3_WS || 'http://toorak01.ledgerium.io:9000/'))
      this.http.eth.extend({
        property: 'txpool',
        methods: [{
          name: 'content',
          call: 'txpool_content'
        },{
          name: 'inspect',
          call: 'txpool_inspect'
        },{
          name: 'status',
          call: 'txpool_status'
        }]
      })
    }

    getNonce(from) {
      return new Promise((resolve, reject) => {
        Promise.all([
          this.web3.http.eth.txpool.content(),
          this.web3.http.eth.getTransactionCount(from, 'pending')
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

    generateTransactionParams(from, to, value) {
      return new Promise((resolve, reject) => {
        Promise.all([
          this.web3.http.eth.getGasPrice(),
          this.getNonce(from)
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

    async sendSignedTransaction(signedTransaction) {
      return new Promise((resolve, reject) => {
        this.web3.http.eth.sendSignedTransaction(signedTransaction.rawTransaction)
          .then(receipt => {
            resolve(receipt)
          })
          .catch(reject)
      })
    }
}

module.exports = Web3;
