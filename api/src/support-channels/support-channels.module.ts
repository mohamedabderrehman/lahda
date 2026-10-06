import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportChannelsController } from './support-channels.controller';
import { SupportChannelsService } from './support-channels.service';

@Module({
  imports: [PrismaModule],
  controllers: [SupportChannelsController],
  providers: [SupportChannelsService],
  exports: [SupportChannelsService],
})
export class SupportChannelsModule {}
