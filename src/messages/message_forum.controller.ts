import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessageForumService } from './message_forum.service';

@Controller('forum-messages')
export class MessageForumController {
  constructor(private readonly messageForumService: MessageForumService) {}

  @Post()
  async create(@Body() body: { user: string; content: string; type: string; date?: Date }) {
    return this.messageForumService.createMessage(body);
  }

  @Get()
  async findAll() {
    return this.messageForumService.getAllMessages();
  }
}
