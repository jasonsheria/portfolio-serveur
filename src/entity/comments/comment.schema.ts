import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
    post: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ required: true })
    content: string;
    // createdAt et updatedAt seront ajoutés par `timestamps: true` si vous l'activez
    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
    parentComment: Types.ObjectId | null;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
