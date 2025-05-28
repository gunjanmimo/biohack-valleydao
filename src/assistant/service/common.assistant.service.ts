import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommonAssistantService {
  constructor(private configService: ConfigService) {}
}
