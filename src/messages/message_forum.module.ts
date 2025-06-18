import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageForum, MessageForumSchema } from '../entity/messages/message_forum.schema';
import { MessageForumService } from './message_forum.service';
import { MessageForumController } from './message_forum.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageForum.name, schema: MessageForumSchema },
    ]),
  ],
  providers: [MessageForumService],
  controllers: [MessageForumController],
  exports: [MessageForumService],
})
export class MessageForumModule {}
