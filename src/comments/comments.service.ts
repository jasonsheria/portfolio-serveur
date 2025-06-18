import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from '../entity/comments/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from '../entity/users/user.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string) {
    const commentData: any = {
      ...createCommentDto,
      user: userId,
    };
    if (typeof createCommentDto.parentComment === 'string' && createCommentDto.parentComment.length > 0) {
      commentData.parentComment = createCommentDto.parentComment;
    }
    // Do NOT set parentComment to null if not present
    return new this.commentModel(commentData).save();
  }

  async findByPost(postId: string) {
    // Fetch all comments for a post, populate user, and sort by createdAt
    const comments = await this.commentModel.find({ post: postId })
      .populate('user', 'username email profileUrl')
      .sort({ createdAt: 1 })
      .lean();
    // Build nested structure
    const map = new Map();
    comments.forEach(c => map.set(c._id.toString(), { ...c, replies: [] }));
    const roots = [];
    for (const c of comments) {
      if (c.parentComment) {
        const parent = map.get(c.parentComment.toString());
        if (parent) parent.replies.push(map.get(c._id.toString()));
      } else {
        roots.push(map.get(c._id.toString()));
      }
    }
    return roots;
  }

  async findOne(id: string) {
    return this.commentModel.findById(id).populate('user', 'username email profileUrl');
  }

  async remove(id: string, userId: string) {
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.user.toString() !== userId) throw new ForbiddenException('Not allowed');
    await this.commentModel.deleteOne({ _id: id });
    // Optionally: delete all replies recursively
    await this.commentModel.deleteMany({ parentComment: id });
    return { deleted: true };
  }
}
