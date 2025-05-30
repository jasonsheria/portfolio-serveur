import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageForum } from '../entity/messages/message_forum.schema';

@Injectable()
export class MessageForumService {
  constructor(
    @InjectModel(MessageForum.name) private messageForumModel: Model<MessageForum>,
  ) {}

  async createMessage(data: { user: string; content: string; type: string; date?: Date, isCompressed?: boolean; size?: number, filename?: string }) {
    if (!data.date) {
      data.date = new Date();
    }
   console.log('Creating message:', data);
    const message = new this.messageForumModel(data);
    return message.save();
  }

  async getAllMessages() {
    return this.messageForumModel.find().populate('user').sort({ date: 1 }).exec();
  }

  // Fetch messages with pagination: get messages before a certain date, limited by 'limit'
  async getMessagesPaginated({ before, limit }: { before?: Date, limit?: number }) {
    const query: any = {};
    if (before) {
      query.date = { $lt: before };
    }
    const messages = await this.messageForumModel
      .find(query)
      .populate('user')
      .sort({ date: -1 }) // newest first
      .limit(limit || 10)
      .exec();
    // Return in chronological order (oldest first)
    return messages.reverse();
  }

  // Count how many messages are older than a given date
  async countOlderMessages(before: Date) {
    return this.messageForumModel.countDocuments({ date: { $lt: before } });
  }
}
