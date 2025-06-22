import * as nodemailer from 'nodemailer';

export async function sendSuggestionNotification(to: string, data: {
  senderFirstName: string,
  senderLastName: string,
  message: string,
  source: string,
  phone?: string,
  email?: string
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || smtpUser;

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
    to,
    subject: 'Nouveau message reçu via la plateforme',
    text: `Bonjour,\n\nVous avez reçu un message de la part de ${data.senderFirstName} ${data.senderLastName} depuis ${data.source} :\n\n"${data.message}"\n\nVous pouvez le joindre par téléphone : ${data.phone || 'non renseigné'} ou email : ${data.email || 'non renseigné'}.\n\nCeci est un message automatique.`
  };

  return transporter.sendMail(mailOptions);
}
