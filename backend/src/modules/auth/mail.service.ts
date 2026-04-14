import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: SystemConfigService) {}

  async sendMfaCode(email: string, code: string) {
    const provider = await this.configService.get('EMAIL_PROVIDER') || 'smtp';
    const smtpConfig = await this.configService.get('EMAIL_CONFIG');
    const resendKey = await this.configService.get('RESEND_KEY');

    const subject = 'Tu código de verificación de netHylo';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Verificación de Seguridad</h2>
        <p>Has solicitado un código de acceso para netHylo.</p>
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
          ${code}
        </div>
        <p>Este código caduca en 5 minutos.</p>
      </div>
    `;

    try {
      if (provider === 'resend' && resendKey) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'netHylo <onboarding@resend.dev>', // Should be a verified domain in production
          to: email,
          subject,
          html,
        });
        this.logger.log(`MFA code sent via Resend to ${email}`);
        return;
      }

      // Default to SMTP
      const transporter = nodemailer.createTransport(smtpConfig && smtpConfig.host ? {
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port),
        secure: smtpConfig.port === '465',
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      } : {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });

      await transporter.sendMail({
        from: '"netHylo" <noreply@nethylo.com>',
        to: email,
        subject,
        html,
      });
      this.logger.log(`MFA code sent via SMTP to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${email}: ${error.message}`);
    }
  }
}
