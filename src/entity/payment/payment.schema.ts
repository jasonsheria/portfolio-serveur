import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';
import { Site } from '../site/site.schema';
@Schema()
export class Payment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    client : User;
    @Prop({ type: Types.ObjectId, ref: 'Site', required: false })
    site: Site;
    @Prop({ required: false })
    cardHolderName: string;
    @Prop({ required: false, unique: false })
    mobileNumber: string;
    @Prop({ required: false })
    mobileMoneyPin: string;
    @Prop({ required: false })
    cardNumber: string;
    @Prop({ required: false })
    expiryDate: string;
    @Prop({ required: false })
    cvv: string;
    @Prop({ required: true })
    amount: number;
    @Prop({ required: false })
    paymentMethod: string;
    @Prop({ required: false })
    planId : number;
    @Prop({ required: false })
    mobileMoneyProvider: string;

    @Prop({ default: Date.now })
    createdAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
