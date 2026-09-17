import { Injectable, Logger } from '@nestjs/common';
import { MailerPort } from './mailer.port';

interface CapturedEmail {
  to: string;
  rawToken: string;
}

@Injectable()
export class FakeMailerAdapter implements MailerPort {
  private readonly logger = new Logger(FakeMailerAdapter.name);
  private readonly verificationEmails: CapturedEmail[] = [];
  private readonly resetEmails: CapturedEmail[] = [];

  sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    this.verificationEmails.push({ to, rawToken });
    this.logger.log(`[FAKE] verification email queued for ${to}`);
    return Promise.resolve();
  }

  sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    this.resetEmails.push({ to, rawToken });
    this.logger.log(`[FAKE] reset email queued for ${to}`);
    return Promise.resolve();
  }

  getLastVerificationToken(email: string): string | undefined {
    return this.verificationEmails.findLast((e) => e.to === email)?.rawToken;
  }

  getLastResetToken(email: string): string | undefined {
    return this.resetEmails.findLast((e) => e.to === email)?.rawToken;
  }

  clear(): void {
    this.verificationEmails.length = 0;
    this.resetEmails.length = 0;
  }
}
