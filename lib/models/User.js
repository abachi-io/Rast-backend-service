const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  uuid: String,
  email: String,
  password: String,
  emailVerified: {type: Boolean, default: false},
  emailVerifiedToken: String,
  twoFactorEnabled: {type: Boolean, default: false},
  twoFactorSecret: {type: String, default: ""},
  resetToken: {type: String, default: ""},
  resetTokenExpiry: {type: Number, default: 0},
  apiKey: {type: String, default: ""},
  secretKey: {type: String, default: ""},
  publicKey: {type: String, default: ""},
  challenge: {type: String, default: ""},
  challengeExpiry: {type: Number, default: 0},
  role: {type: String, default: "Member"},
});

userSchema.set('timestamps', true)

module.exports = mongoose.model('User', userSchema);
