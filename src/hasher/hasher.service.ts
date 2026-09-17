import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HasherService {
  private readonly cost: number;

  constructor(private readonly configService: ConfigService) {
    this.cost = this.configService.get<number>('BCRYPT_COST', 12);
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      return false;
    }
  }
}
