const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorAuthentication {

  generate(email) {
    return new Promise((resolve, reject) => {
      let secret = speakeasy.generateSecret({length: 20});
      secret.otpauth_url = `otpauth://totp/${email}?secret=${secret.base32}&issuer=${process.env.WEBSITE_NAME}`
      QRCode.toDataURL(secret.otpauth_url)
        .then(imageURI => {
          resolve({
            secret,
            imageURI
          });
        })

    })
  }

  verify(secret, token ) {
    return new Promise((resolve, reject) => {
        const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        window: 1,
        token: token
        });
      resolve(verified);
    })
  }

}

module.exports = TwoFactorAuthentication
