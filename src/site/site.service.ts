import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Site } from '../entity/site/site.schema';
import { User } from '../entity/users/user.schema';
import { Media } from '../entity/media/media.schema';
import * as path from 'path';
import * as fs from 'fs';
import { OfferedService, OfferedServiceSchema } from '../entity/service/service.schema';


@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site.name) private readonly siteModel: Model<Site>,
    @InjectModel(Media.name) private readonly mediaModel: Model<Media>,
    @InjectModel('OfferedService') private readonly serviceModel: Model<OfferedService>,
  ) {}

  async createOrUpdateSite(user: User, data: any): Promise<any> {
    const userId = (user as any)._id ? (user as any)._id.toString() : user.id?.toString();
    if (!userId) {
      console.error('[SiteService] ERREUR: Impossible de déterminer l\'ID utilisateur pour la création du site.');
      throw new Error('Impossible de déterminer l\'ID utilisateur pour la création du site.');
    }
    let site = await this.siteModel.findOne({ user: userId });
    let createdMedia = null;
    // Gestion du media (image de service)
    if (data.service_image) {
      const username = user.username || user.email || userId;
      const destDir = path.join(process.cwd(), 'public', 'uploads', username.toString());
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const srcPath = path.join(process.cwd(), data.service_image);
      const fileName = path.basename(data.service_image);
      const destPath = path.join(destDir, fileName);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        data.service_image = `/uploads/${username}/${fileName}`;
      } else {
        data.service_image = `/uploads/${username}/${fileName}`;
      }
    }
    // Création ou mise à jour du site
    if (!site) {
      if ((user as any).isAdmin === true) {
        data["monSite"] = `http://localhost:5000/user/${userId}`;
      }
      site = new this.siteModel({ ...data, user: userId });
    } else {
      Object.assign(site, data);
      site.user = userId;
    }
    // Création du service lié
    let createdService = null;
    if (data.service_name) {
      const serviceData = {
        user: userId,
        service_name: data.service_name,
        service_descriptions: data.service_descriptions,
        domaine_service: data.domaine_service,
        service_image: data.service_image,
      };
      createdService = await this.serviceModel.create(serviceData);
    }
    try {
      await site.save();
    } catch (err) {
      console.error('[SiteService] ERREUR lors du save:', err);
      throw err;
    }
    return { site, service: createdService, media: createdMedia };
  }

  async getSiteByUser(userId: string): Promise<Site | null> {
    return this.siteModel.findOne({ user: userId });
  }
}
