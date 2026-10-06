import { Controller, Get } from '@nestjs/common';
import { SupportChannelsService } from './support-channels.service';

@Controller('support-channels')
export class SupportChannelsController {
  constructor(private service: SupportChannelsService) {}

  @Get()
  findAll() {
    return this.service.findAllPublic();
  }
}
