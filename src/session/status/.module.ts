import { Module } from '@nestjs/common';
import { StatusService } from './.service';
import { StatusController } from './.controller';

@Module({
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
