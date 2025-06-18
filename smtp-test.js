// Script de test SMTP Nodemailer pour Gmail
require('dotenv').config();
const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT, 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.SMTP_FROM || smtpUser;
const toEmail = smtpUser; // S'auto-envoie pour test

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true pour 465, false sinon
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

const mailOptions = {
  from: fromEmail,
  to: "sheriajason343@gmail.com",
  subject: 'Test SMTP Nodemailer ✔',
  text: 'Ceci est un test SMTP depuis Nodemailer (Node.js)',
  html: '<b>Ceci est un test SMTP depuis Nodemailer (Node.js)</b>',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error('Erreur SMTP:', error);
  }
  console.log('Message envoyé: %s', info.messageId);
  console.log('Aperçu URL: %s', nodemailer.getTestMessageUrl(info));
});
