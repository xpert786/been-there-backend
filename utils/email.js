const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

sgMail.setApiKey(process.env.SENDGRID_API_KEY );

/**
 * Send an email using SendGrid and EJS template
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.templateName
 * @param {Object} options.templateData
 */
async function sendEmail({ to, subject, templateName, templateData = {} }) {
  const templatePath = path.join(__dirname, '..', 'views', templateName);

  const html = await ejs.renderFile(templatePath, templateData);

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'salesitinfonity@gmail.com',
    subject,
    html,
  };

  await sgMail.send(msg);
}

module.exports = { sendEmail };

