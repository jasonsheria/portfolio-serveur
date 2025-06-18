import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../entity/portfolio/portfolio.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
  ) {}

  async createPortfolio(data: any): Promise<Portfolio> {
    if (!data.user || !data.site || !data.type || !data.title || !data.imageUrl) {
      throw new BadRequestException('Paramètres obligatoires manquants');
    }
    const created = new this.portfolioModel(data);
    return created.save();
  }

  async getPortfolios(filter: any = {}): Promise<Portfolio[]> {
    if (!filter.user || !filter.site) {
      throw new BadRequestException('user et site sont obligatoires');
    }
    return this.portfolioModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async deletePortfolio(id: string): Promise<void> {
    const portfolio = await this.portfolioModel.findById(id);
    if (!portfolio) throw new NotFoundException('Portfolio non trouvé');
    // Suppression physique du fichier image
    if (portfolio.imageUrl && portfolio.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), portfolio.imageUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Erreur lors de la suppression du fichier image:', filePath, err);
      }
    }
    await this.portfolioModel.deleteOne({ _id: id });
  }

  async deleteBySite(siteId: string): Promise<void> {
    const portfolios = await this.portfolioModel.find({ site: siteId });
    for (const p of portfolios) {
      if (p.imageUrl && p.imageUrl.startsWith('/uploads/')) {
        try { fs.unlinkSync('.' + p.imageUrl); } catch {}
      }
    }
    await this.portfolioModel.deleteMany({ site: siteId });
  }
}