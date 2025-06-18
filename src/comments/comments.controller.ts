import { Controller, Post, Body, UseGuards, Req, Get, Param, Delete } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCommentDto, @Req() req) {
    // userId from JWT
    return this.commentsService.create(dto, req.user.userId);
  }

  @Get('post/:postId')
  async findByPost(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    // Only the owner can delete
    return this.commentsService.remove(id, req.user.userId);
  }
}