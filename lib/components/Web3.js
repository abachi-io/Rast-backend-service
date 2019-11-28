const web3  = require('web3')

class Web3 {
    constructor() {
      this.host = process.env.WEB3_HTTP || 'http://localhost:8545/'
      this.http = new web3(new web3.providers.HttpProvider(this.host));
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

    // isAddress(address) {
    //   return this.web3Http.utils.isAddress(address)
    // }
}

module.exports = Web3;
