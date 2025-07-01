import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';

export type ProjetDocument = Projet & Document;

@Schema({ timestamps: true })
export class Projet {
  @Prop({ required: true })
  titre: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  poste: string;

  @Prop({ required: true })
  anneeDebut: number;

  @Prop()
  anneeFin?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user:  User;
}

export const ProjetSchema = SchemaFactory.createForClass(Projet);
