const web3  = require('web3')

class Web3 {
    constructor() {
      this.host = process.env.WEB3_HTTP || 'http://toorak01.ledgerium.io:8545/'
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
}

module.exports = Web3;
