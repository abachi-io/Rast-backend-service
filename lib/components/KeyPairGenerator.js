const crypto = require('crypto');
const logger = require('./logger')

class KeyPairGenerator {

  generate() {
    return new Promise((resolve, reject) => {
      Promise.all([crypto.randomBytes(32), crypto.randomBytes(32)])
        .then(keys => {
          const apiKey = keys[0].toString('hex');
          const secretKey = keys[1].toString('hex');
          resolve({
            apiKey,
            secretKey
          });

        })
        .catch(error => {
          logger.error(error);
          reject(false);
        })
    })
  }

}

module.exports = KeyPairGenerator
