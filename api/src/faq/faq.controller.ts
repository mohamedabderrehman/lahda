import { Controller, Get } from '@nestjs/common';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private faq: FaqService) {}

  @Get()
  findAll() {
    return this.faq.findAll();
  }
}
