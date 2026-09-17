import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER } from './mailer.port';
import type { MailerPort } from './mailer.port';
import { FakeMailerAdapter } from './fake-mailer.adapter';
import { SmtpMailerAdapter } from './smtp-mailer.adapter';

@Global()
@Module({
  providers: [
    FakeMailerAdapter,
    {
      provide: MAILER,
      inject: [ConfigService, FakeMailerAdapter],
      useFactory: (
        config: ConfigService,
        fake: FakeMailerAdapter,
      ): MailerPort => {
        const driver = config.get<string>('MAIL_DRIVER') ?? 'fake';
        if (driver === 'smtp') {
          return new SmtpMailerAdapter(config);
        }
        return fake;
      },
    },
  ],
  exports: [MAILER],
})
export class MailerModule {}
