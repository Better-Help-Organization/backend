import { Module } from '@nestjs/common';
import { MessageService } from './.service';
import { MessageController } from './.controller';

@Module({
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
