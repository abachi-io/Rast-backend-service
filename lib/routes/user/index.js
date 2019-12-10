const express                   = require('express')
const router                    = express.Router()
const uuidv4                    = require('uuid/v4');
const validator                 = require('validator');
const cuid                      = require('cuid');
const jwt                       = require('jsonwebtoken');
const bcrypt                    = require('bcrypt');
const crypto                    = require('crypto');
const sigUtil                   = require('eth-sig-util');

const Emailer                   = require('../../components/Emailer');
const KeyPairGenerator          = require('../../components/KeyPairGenerator');
const TwoFactorAuthentication   = require('../../components/TwoFactorAuthentication');
const User                      = require('../../models/User');

const emailer                   = new Emailer;
const keyPairGenerator          = new KeyPairGenerator;
const twoFactorAuthentication   = new TwoFactorAuthentication;

const saltRounds                = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 14;

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

const createToken = (user) => {
  return jwt.sign({uuid: user.uuid, email: user.email, role: user.role},
    process.env.JWT_SECRET || '{?Fd]o#G&Wcqa)An<C@dlJT}&LG1VX',
    {expiresIn: '1d'})
};

const verifyToken = (request, response, next) => {
  const { token} = request.headers;
  if(!token) return errorResponse(response, 'Token missing');
  jwt.verify(token, process.env.JWT_SECRET || '{?Fd]o#G&Wcqa)An<C@dlJT}&LG1VX', (error, decoded) => {
    if(error) return errorResponse(response, 'Token invalid or expired');
    request.token = token;
    request.decoded = decoded;
    next();
  })
};


// ************ \\
// AUTHENTICATED \\

router.post('/token', verifyToken, (request, response) => {
  const {token, decoded} = request;
  return successResponse(response, 'Token status', {token, decoded});
})

router.get('/accountInfo', verifyToken, (request, response) => {
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      let apiKeys = false
      if(user.apiKey !== "" && user.secretKey !== "") {
        apiKeys = true
      }
      return successResponse(response, 'Account Info', {
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        apiKeysEnabled: user.apiKey ? true : false,
        apiKey: user.apiKey
      })
    })
})

router.get('/publicKey', verifyToken, (request, response) => {
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      const payload = {
        enabled: user.publicKey ? true : false,
        publicKey: user.publicKey
      }
      user.save()
      return successResponse(response, 'Publc Key', payload);
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.post('/publicKey', verifyToken, (request, response) => {
  const { publicKey } = request.body;
  if(!publicKey) return errorResponse(response, 'Public key not sent');
  if(typeof publicKey !== "string") return errorResponse(response, 'Public key not sent');
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      user.publicKey = publicKey.toLowerCase()
      user.save()
      return successResponse(response, 'Public key login has been successfully enabled');
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.delete('/publicKey', verifyToken, (request, response) => {
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      user.publicKey = ''
      user.save()
      return successResponse(response, 'Public key login has been successfully disabled');
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.get('/apiKeys', verifyToken, (request, response) => {
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      // if(!user.twoFactorEnabled) return errorResponse(response, "You must have 2FA enabled to generate API keys")
      if(user.apiKey === "" || user.secretKey === "") {
        keyPairGenerator.generate()
          .then(keys => {
            user.apiKey = keys.apiKey
            user.secretKey = keys.secretKey
            user.save()
            return successResponse(response, 'Generated API keys', keys);
          })
          .catch(error => {
            console.log(error);
            return errorResponse(response, 'Something unexpected went wrong, please try again');
          })
      } else {
        return errorResponse(response, 'API keys already exist');
      }
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.delete('/apiKeys', verifyToken, (request, response) => {
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      user.apiKey = ""
      user.secretKey = ""
      user.save()
      return successResponse(response, 'API keys have been successfully disabled');

    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.get('/twoFactor', verifyToken, (request, response) => {
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      if(user.twoFactorEnabled && user.twoFactorSecret !== "") return errorResponse(response, 'You already have 2FA enabled');
      twoFactorAuthentication.generate(user.email)
        .then(data => {
          user.twoFactorSecret = data.secret.base32
          user.save()
          return successResponse(response, '2FA intergration initiated', data);
        })
        .catch(error => {
          console.log(error);
          return errorResponse(response, '2FA generation error, please try again');
        })
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.post('/twoFactor', verifyToken, (request, response) => {
  const { twoFactor } = request.body;
  if(!twoFactor) return errorResponse(response, '2FA code missing');
  if(twoFactor.length !== 6) return errorResponse(response, '2FA code invalid');
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(user.twoFactorEnabled && user.twoFactorSecret !== "") return errorResponse(response, 'You already have 2FA enabled');
      twoFactorAuthentication.verify(user.twoFactorSecret, twoFactor)
        .then(verified => {
          if(verified) {
            user.twoFactorEnabled = true
            user.save()
            return successResponse(response, '2FA has been successfully enabled');

          } else {
            return errorResponse(response, '2FA code does not match secret');
          }
        })
        .catch(error => {
          console.log(error);
          return errorResponse(response, '2FA verification process failed, please try again');
        })
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.delete('/twoFactor', verifyToken, (request, response) => {
  const { twoFactor } = request.body;
  if(!twoFactor) return errorResponse(response, '2FA code missing');
  if(twoFactor.length !== 6) return errorResponse(response, '2FA code invalid');
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      twoFactorAuthentication.verify(user.twoFactorSecret, twoFactor)
        .then(verified => {
          if(verified) {
            user.twoFactorEnabled = false
            user.save()
            return successResponse(response, '2FA has been successfully disabled');

          } else {
            return errorResponse(response, '2FA code does not match secret');
          }
        })
        .catch(error => {
          console.log(error);
          return errorResponse(response, '2FA verification process failed, please try again');
        })
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.put('/update', verifyToken, (request, response) => {
  const { oldPassword, password, passwordConfirm } = request.body;
  const {token, decoded} = request;
  if(!oldPassword || !password || !passwordConfirm) return errorResponse(response, 'Missing field(s)');
  if(password !== passwordConfirm) return errorResponse(response, 'New passwords do not match');
  if(password.length < 5) return errorResponse(response, 'New password is too short');
  if(password.length > 15) return errorResponse(response, 'New password is too long (Max 15 characters)');
  User.findOne({uuid: request.decoded.uuid})
    .then(user => {
      if(!user) return errorResponse(response, 'User ID not found');
      bcrypt.compare(oldPassword, user.password)
        .then(match =>{
            if(match) {
              bcrypt.hash(password, saltRounds)
                .then(hash => {
                  user.password = hash;
                  user.save()
                  return successResponse(response, 'Password changed successful');

                })
                .catch(error => {
                  console.log(error);
                  return errorResponse(response, 'Something unexpected went wrong, please try again');
                })

            } else {
              return errorResponse(response, 'Provided current password is wrong. Try again');
            }
        });
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

// ************** \\
// UNAUTHENTICATED \\

router.post('/forgot', (request, response) => {
  const { email } = request.body;
  if(!email) return errorResponse(response, 'Missing Email');
  if(!validator.isEmail(email)) return errorResponse(response, 'Invalid Email');
  User.findOne({email: email.toLowerCase()})
    .then(user => {
      if(!user) return errorResponse(response, 'Email reset link has been sent to your email');
      const resetToken = cuid();
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 86400000;
      user.save()
      emailer.reset(email, resetToken);
      return successResponse(response, 'Email reset link has been sent to your email');
    })
})

router.post('/reset', (request, response) => {
  const { email, resetToken, password, passwordConfirm } = request.body;
  if(!email || !resetToken, !password || !passwordConfirm) return errorResponse(response, 'Missing field(s)');
  if(!validator.isEmail(email)) return errorResponse(response, 'Invalid Email');
  if(password !== passwordConfirm) return errorResponse(response, 'Passwords do not match');
  if(password.length < 5) return errorResponse(response, 'Password too short');
  if(password.length > 15) return errorResponse(response, 'Password too long (Max 15 characters)');
  User.findOne({email: email.toLowerCase()})
    .then(user => {
      if(!user) return errorResponse(response, 'Wrong reset password token. Try again or click forgot password to request a new one.');
      if(user.resetToken !== resetToken) return errorResponse(response, 'Wrong reset password token. Try again or click forgot password to request a new one.');
      if(Date.now() > user.resetTokenExpiry) return errorResponse(response, 'Reset password token has expired. Click forgot password to request a new one.');
      bcrypt.hash(password, saltRounds)
        .then(hash => {
          user.password = hash;
          user.resetTokenExpiry = Date.now();
          user.save()
          return successResponse(response, 'Password reset successful');

        })
        .catch(error => {
          console.log(error);
          return errorResponse(response, 'Something unexpected went wrong, please try again');
        })
    })
    .catch(error => {
      console.log(error);
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.post('/verify', (request, response) => {
  const { email, emailVerifiedToken} = request.body;
  if(!email || !emailVerifiedToken) return errorResponse(response, 'Missing field(s)');
  if(!validator.isEmail(email)) return errorResponse(response, 'Invalid Email');
  User.findOne({email: email.toLowerCase()})
    .then(user => {
      if(!user) return errorResponse(response, 'Wrong verification token. Try again or click resend e-mail verification to recieve a new one.');
      if(user.emailVerified) return errorResponse(response, `${email} has already been verified`);
      if(user.emailVerifiedToken !== emailVerifiedToken) return errorResponse(response, 'Wrong verification token. Try again or click resend e-mail verification to recieve a new one.');
      user.emailVerified = true
      user.role = 'Member'
      user.save()
      return successResponse(response, `${email} has been successfully verified`);
    })
    .catch(error => {
      console.log(error)
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.post('/register', (request, response) => {
  const { email, password, passwordConfirm } = request.body;
  if(!email || !password || !passwordConfirm) return errorResponse(response, 'Missing field(s)');
  if(!validator.isEmail(email)) return errorResponse(response, 'Invalid Email');
  if(password !== passwordConfirm) return errorResponse(response, 'Passwords do not match');
  if(password.length < 5) return errorResponse(response, 'Password too short');
  if(password.length > 15) return errorResponse(response, 'Password too long (Max 15 characters)');
  User.findOne({email: email.toLowerCase()})
    .then(doc => {
      if(doc) return errorResponse(response, 'E-mail address already exists');
      const uuid = uuidv4();
      const emailVerifiedToken = cuid();
      bcrypt.hash(password, saltRounds)
        .then(hash => {
          User.create({uuid, email, password: hash, emailVerifiedToken})
            .then(user => {
              emailer.welcome(user.email, user.emailVerifiedToken)
              return successResponse(response, 'Registration successful', {token: createToken(user)});
            })
            .catch(error => {
              console.log(error)
              return errorResponse(response, 'Something unexpected went wrong, please try again');
            })
        })
        .catch(error => {
          console.log(error)
          return errorResponse(response, 'Something unexpected went wrong, please try again');
        })
    })
    .catch(error => {
      console.log(error)
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})

router.post('/login', (request, response) => {
  const { email, password, twoFactor } = request.body;
  if(!email || !password) return errorResponse(response, 'Missing field(s)');
  if(!validator.isEmail(email)) return errorResponse(response, 'Invalid Email');
  User.findOne({email: email.toLowerCase()})
    .then(user => {
      if(!user) return errorResponse(response, 'Wrong password. Try again or click Forgot password to reset it.');
      bcrypt.compare(password, user.password)
        .then(match =>{
            if(match) {
              if(!user.twoFactorEnabled) return successResponse(response, 'Login successful', {token: createToken(user), require2FA: false});
              if(!twoFactor) return successResponse(response, 'Login successful', {token: null, require2FA: true});
              twoFactorAuthentication.verify(user.twoFactorSecret, twoFactor)
                .then(verified => {
                  if(!verified) return errorResponse(response, 'Invalid 2FA code');
                  return successResponse(response, 'Login successful', {token: createToken(user), require2FA: false});
                })
            } else {
              return errorResponse(response, 'Wrong password. Try again or click Forgot password to reset it.');
            }
        });
    })
})


router.post('/login2', (request, response) => {
  const { publicKey, challenge, signature } = request.body;
  if(!publicKey) return errorResponse(response, 'Missing field(s)');
  User.findOne({publicKey: publicKey.toLowerCase()})
    .then(user => {
      if(!user) return errorResponse(response, 'No account is associated with this key');
      if(!challenge) {
        const challenge = crypto.createHash('sha256').update((Math.random().toString())).digest('hex')
        user.challenge = challenge
        user.challengeExpiry = Date.now() + 600000
        user.save()
        return successResponse(response, 'Challenge generation successful', {challenge: challenge, requireSig: true});
      } else {
        if(challenge !== user.challenge) return errorResponse(response, 'Challenge does not match user challenge');
        if(Date.now() >= user.challengeExpiry) return errorResponse(response, 'Challenge expired');
        const recovered = sigUtil.recoverPersonalSignature({ data: challenge, sig: signature});
        if(user.publicKey !== recovered.toLowerCase()) return errorResponse(response, 'This waas not signed by the users private key');
        user.challengeExpiry = Date.now()
        user.save()
        return successResponse(response, 'Login successful', {token: createToken(user), requireSig: false});
      }
    })
    .catch(error => {
      console.log(error)
      return errorResponse(response, 'Something unexpected went wrong, please try again');
    })
})




module.exports = router
