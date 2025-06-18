import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Template } from '../entity/template/template.schema';
import * as fs from 'fs';
import * as path from 'path';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TemplateService {
  constructor(
    @InjectModel(Template.name) private templateModel: Model<Template>,
    private usersService: UsersService,
  ) {}

  async createTemplate(data: any, files: Express.Multer.File[], userId: string, siteId: string): Promise<Template> {
    if (!data.url || !data.type || !files || files.length === 0) {
      throw new BadRequestException('Champs obligatoires manquants');
    }
    if (files.length > 3) {
      throw new BadRequestException('Maximum 3 images autorisées');
    }
    // Sauvegarder les images
    const imageUrls: string[] = [];
    const uploadDir = path.join(process.cwd(), 'uploads', 'templates', siteId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    for (const file of files) {
      const ext = path.extname(file.originalname);
      const filename = `template_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      imageUrls.push(`/uploads/templates/${siteId}/${filename}`);
    }
    const created = new this.templateModel({
      url: data.url,
      type: data.type,
      images: imageUrls,
      site: siteId,
      user: userId,
    });
    return created.save();
  }

  async getTemplatesBySite(siteId: string): Promise<Template[]> {
    return this.templateModel.find({ site: siteId, isPublic: true }).sort({ createdAt: -1 }).exec();
  }

  async getTemplate(id: string): Promise<Template> {
    const tpl = await this.templateModel.findById(id);
    if (!tpl) throw new NotFoundException('Template non trouvé');
    return tpl;
  }

  async deleteTemplate(id: string, userId: string, password: string): Promise<void> {
    const tpl = await this.templateModel.findOne({ _id: id, isPublic: true });
    if (!tpl) throw new NotFoundException('Template non trouvé ou non public');
    if (tpl.user.toString() !== userId) throw new BadRequestException('Utilisateur non autorisé');
    // Vérification du mot de passe
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestException('Mot de passe incorrect');
    // Suppression physique des images
    if (tpl.images && Array.isArray(tpl.images)) {
      for (const imgUrl of tpl.images) {
        const imgPath = path.join(process.cwd(), imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl);
        try {
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        } catch (err) {
          console.error('Erreur suppression image:', imgPath, err);
        }
      }
    }
    await this.templateModel.deleteOne({ _id: id });
  }

  async updateTemplate(id: string, data: any): Promise<Template> {
    const tpl = await this.templateModel.findOne({ _id: id, isPublic: true });
    if (!tpl) throw new NotFoundException('Template non trouvé ou non public');
    Object.assign(tpl, data);
    return tpl.save();
  }

  // Liste tous les templates publics d'un type donné
  async getPublicTemplatesByType(type: string, isPublic: boolean): Promise<Template[]> {
    const filter: any = { isPublic };
    if (type) filter.type = type;
    console.log('Filtre utilisé pour recherche de templates:', filter);
    const results = await this.templateModel.find(filter).sort({ createdAt: -1 }).exec();
    console.log('Nombre de templates trouvés:', results.length);
    return results;
  }
  // Liste tous les templates sans condition
  async getAllTemplates(): Promise<Template[]> {
    return this.templateModel.find().sort({ createdAt: -1 }).exec();
  }
}
