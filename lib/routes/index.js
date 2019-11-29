const express = require('express')
const router = express.Router()

router.use('/api', require('./api'))
router.use('/user', require('./user'))
router.use('/admin', require('./admin'))

module.exports = router
