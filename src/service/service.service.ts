import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OfferedService } from '../entity/service/service.schema';

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(OfferedService.name) private readonly serviceModel: Model<OfferedService>,
  ) {}

  async createServices(user: any, services: any[]): Promise<any[]> {
    if (!services || !Array.isArray(services)) return [];
    const userId = (user as any)._id ? (user as any)._id.toString() : user.id;
    const docs = services.map(s => ({ ...s, user: userId }));
    return this.serviceModel.insertMany(docs);
  }

  async getServicesByUser(userId: string): Promise<OfferedService[]> {
    return this.serviceModel.find({ user: userId });
  }

  async getServiceById(serviceId: string): Promise<OfferedService | null> {
    return this.serviceModel.findById(serviceId);
  }

  async updateService(serviceId: string, update: Partial<OfferedService>): Promise<OfferedService | null> {
    return this.serviceModel.findByIdAndUpdate(serviceId, update, { new: true });
  }

  async deleteService(serviceId: string): Promise<any> {
    return this.serviceModel.findByIdAndDelete(serviceId);
  }
}
