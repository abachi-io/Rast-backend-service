const express = require('express');
const router = express.Router();
const jwt  = require('jsonwebtoken');

const User = require('../../models/User')

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
  });
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

const isAdmin = (request, response, next) => {
  if(request.decoded.role !== "Admin") return errorResponse(response, 'Insufficient privileges');
  next()
};

router.get('/db', verifyToken, isAdmin, (request, response) => {
  User.find({})
    .then(users => {
      return successResponse(response, 'Find users', users)
    })
})

router.delete('/db', verifyToken, isAdmin, (request, response) => {
  User.deleteMany({})
    .then(users => {
      return successResponse(response, 'Find users', users)
    })
})


module.exports = router;
