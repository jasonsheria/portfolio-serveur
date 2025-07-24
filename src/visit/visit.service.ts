import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Visit } from './visit.schema';
import { Template } from '../entity/template/template.schema';
@Injectable()
export class VisitService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    @InjectModel(Template.name) private templateModel: Model<Template>,
  ) {}

  async trackVisit(ip: string, siteId: string) {
    const find = await this.visitModel.findOne({ ip, template: new Types.ObjectId(siteId), date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).exec();
    if (find) {
    //   console.log('[VISIT] Visite déjà enregistrée pour l\'IP', ip, 'et le site', siteId);
      return find; // Si la visite existe déjà, on la retourne
    }
    return this.visitModel.create({ ip, template: new Types.ObjectId(siteId), date: new Date() });
  }

  async getVisitsBySite(siteId: string) {
    return this.visitModel.find({ template: new Types.ObjectId(siteId) }).sort({ date: -1 }).exec();
  }

  // Recherche les visites à partir d'un id de template (site stocké dans Visit = id de template)
  async getVisitsByTemplate(siteId: string) {
    const temp = new Types.ObjectId(siteId);
    
    // Retourne les visites associées à ce template
    const tpl = await this.templateModel.findOne({site: siteId});
    // recuperer l'id de tpl
    if (!tpl) {
      console.warn('[VISIT] Aucune template trouvée pour l\'id', siteId);
      return [];
    }
    console.log('[VISIT] Recherche des visites pour le template', tpl._id);
    // Retourne les visites associées à ce template
    const data = this.visitModel.find({ template: tpl._id })
      .sort({ date: -1 });
      console.log(data);
      return data;

  }
}
