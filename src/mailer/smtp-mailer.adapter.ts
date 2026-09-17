import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailerPort } from './mailer.port';

@Injectable()
export class SmtpMailerAdapter implements MailerPort {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: this.config.getOrThrow<number>('MAIL_PORT'),
      secure: this.config.get<boolean>('MAIL_SECURE') ?? false,
      auth: {
        user: this.config.getOrThrow<string>('MAIL_USER'),
        pass: this.config.getOrThrow<string>('MAIL_PASS'),
      },
    });
    this.from = this.config.getOrThrow<string>('MAIL_FROM');
  }

  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Verify your email',
      text: `Your verification token: ${rawToken}`,
    });
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your password',
      text: `Your reset token: ${rawToken}`,
    });
  }
}
