const nodemailer = require('nodemailer');

class Emailer {

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    })
  }

  reset(to, resetToken) {
    const subject = `${process.env.WEBSITE_NAME} | Reset Password`
    const link = `${process.env.WEBSITE_DOMAIN}/user/reset-password?email=${to}&resetToken=${resetToken}`
    const text = `
    A request to reset your password has been submitted. If you did not submit this request. If you did not request a password change, you can ignore this email.
    The following reset password link will expire in 24 hours. If you have a problem using the link below, please restart this process to receive a new link.
    ${link}
    If you have any questions, do not hesitate to contact us at ${process.env.WEBSITE_ADMIN_EMAIL}.
    Regards,
    ${process.env.WEBSITE_NAME}
    `
    if(to && subject && text) {
      this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
      }, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      })
    }
  }

  welcome(to, token) {
    const subject = `Welcome to ${process.env.WEBSITE_NAME}`
    const link = `${process.env.WEBSITE_DOMAIN}/user/verify-email?email=${to}&emailVerifiedToken=${token}`
    const text = `
    Welcome and thank you for signing up to ${process.env.WEBSITE_NAME}
    Please click on the following link to activate your account:
    ${link}
    If you have any questions, do not hesitate to contact us at ${process.env.WEBSITE_ADMIN_EMAIL}.
    Regards,
    ${process.env.WEBSITE_NAME}
    `
    if(to && subject && text) {
      this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
      }, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      })
    }
  }

  sendEmail(to, subject, text) {
    if(to && subject && text) {
      this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
      }, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    }
  }

}

module.exports = Emailer
