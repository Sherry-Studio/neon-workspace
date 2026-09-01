import { env } from '../config/env';
import { logger } from '../config/logger';

interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Minimal transactional email sender. If SMTP is not configured the message is
 * logged instead (useful in development). Swap in nodemailer / a provider SDK
 * behind this same interface for production.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.info({ to: mail.to, subject: mail.subject, text: mail.text }, '[email:dev] not sent (SMTP disabled)');
    return;
  }
  // Production: integrate nodemailer here.
  // const transport = nodemailer.createTransport({ host: env.SMTP_HOST, ... });
  // await transport.sendMail({ from: env.EMAIL_FROM, ...mail });
  logger.info({ to: mail.to, subject: mail.subject }, 'email sent');
}

export function buildVerificationEmail(username: string, link: string): Mail {
  return {
    to: '',
    subject: 'Verify your NEON ARCADE account',
    text: `Hi ${username}, confirm your email: ${link}`,
    html: `<p>Hi ${username},</p><p>Confirm your email address:</p><p><a href="${link}">${link}</a></p>`,
  };
}

export function buildResetEmail(username: string, link: string): Mail {
  return {
    to: '',
    subject: 'Reset your NEON ARCADE password',
    text: `Hi ${username}, reset your password: ${link}`,
    html: `<p>Hi ${username},</p><p>Reset your password (link expires soon):</p><p><a href="${link}">${link}</a></p>`,
  };
}
