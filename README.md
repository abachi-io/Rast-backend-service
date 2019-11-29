# Rast

Rast is a hosted Ledgerium node that lets users to run applications without setting up their own node. We provide access to a selection of standard JSON-RPC API, with the addition of custom methods to make development easier.

## Getting started

After sign up, you will create your API keys to use within your app when making requests to Rast.

##### Example Request
```javascript
  const axios = require('axios')

  const apiKey = 'yourApiKey'
  const block = 200

  axios.get(`https://toorak.ledgerium.io/rast/api/xlg/getBlock/${block}`, {
    headers: {
      apiKey: apiKey
    }
  })
  .then(console.log)
  .catch(console.log)

```

##### Example Response
```javascript
{
  success: true,
  timestamp: 1574993884840,
  message: "Returns a block matching the block number or block hash.",
  data: {
    difficulty: "1",
    extraData: "0xd98301080c846765746889676f312e31312e3131856c696e7578000000000000f90164f85494645cab2686477cd244562d4bd95a75f157a4c05594a79f57a6884a71a25fd17c21549796a53c06737694f232a4bf183cf17d09bea23e19ceff58ad9dbfed94f7dce95345c5a5917360571165260cf0e8d98918b841ee0dad47729398aebc51b9fc1b0858fff57ad679b5b3335252da8bae63bfd8e020b7b0ceb94125463644998ed112bddef05855aebf39701e718c5ed6189fb2da00f8c9b841620ec5a5a2a71c97b2c98cb6f0cf3b2cac9991c686810ac6838d625d0485545e2d25c84ffa13263b70f759f760d15f48cb91dbe5335e3a9c36ea5ce70415b44800b8416866fde0548f3399114ade4c99dea4e911c582ad90ba2c09a90ae553dba1e0c05036f62af159754d47f04e521052e33f4fb373e2daebb72bb8ad7f9d8988120701b8419ab74eb8dac86eb43273acbc8951cc2d51b766c234ceebfd2031da606ac26ec6077db987b7101c33dd662e37ca8fa862f6b20266fd57334b015f0162a1527ff401",
    gasLimit: 9007199254740000,
    gasUsed: 0,
    hash: "0x608a2fb0693c6f71ccdfef70ee1ff0a09ad6fc2a0c741d7c7b1602ae6be29e6f",
    logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    miner: "0xA79f57A6884a71A25fD17C21549796a53c067376",
    mixHash: "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    nonce: "0x0000000000000000",
    number: 200,
    parentHash: "0x7998aafff29a8db356c8328698eaaa6bdad7c2d1e7e1e8311ca5316b04bb6202",
    receiptsRoot: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
    sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    size: 906,
    stateRoot: "0xd936ec34269d2f46f0e56043e37e07cd3dc5e6dcb0c1d9ea124aec950040c3f9",
    timestamp: 1564032729,
    totalDifficulty: "201",
    transactions: [ ],
    transactionsRoot: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
    uncles: [ ],
    validators: [
      "0xa79f57a6884a71a25fd17c21549796a53c067376",
      "0xf7dce95345c5a5917360571165260cf0e8d98918",
      "0xf232a4bf183cf17d09bea23e19ceff58ad9dbfed"
    ]
  }
}
```




# Private
### Setting up

`git clone `

`cd rast`

`npm i`


`touch .env`

`nano .env`

```
  SERVER_PORT=2906
  MONGO_HOST=127.0.0.1
  MONGO_DB=userManagement
  BCRYPT_SALT_ROUNDS=14
  JWT_SECRET={?Fd]o#G&Wcqa)An<C@dlJT}&LG1VX
  WEBSITE_NAME=Rast
  WEBSITE_DOMAIN=https://toorak.ledgerium.io/rast
  SMTP_HOST=
  SMTP_PORT=
  SMTP_USER=
  SMTP_PASSWORD=
  WEB3_HTTP=http://toorak01.ledgerium.io:8545
  WEB3_WS=http://toorak01.ledgerium.io:9000
```
