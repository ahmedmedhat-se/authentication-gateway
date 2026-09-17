export const MAILER = Symbol('MAILER');

export interface MailerPort {
  sendVerificationEmail(to: string, rawToken: string): Promise<void>;
  sendPasswordResetEmail(to: string, rawToken: string): Promise<void>;
}
