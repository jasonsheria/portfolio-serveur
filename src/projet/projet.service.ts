import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Projet, ProjetDocument } from '../entity/projet/projet.schema';

@Injectable()
export class ProjetService {
  constructor(
    @InjectModel(Projet.name) private projetModel: Model<ProjetDocument>,
  ) {}

  async createProjet(data: Partial<Projet>): Promise<Projet> {
    const projet = new this.projetModel(data);
    return projet.save();
  }

  async getProjetsByUser(userId: string): Promise<Projet[]> {
    return this.projetModel.find({ userId }).sort({ anneeDebut: -1 }).lean();
  }
}
