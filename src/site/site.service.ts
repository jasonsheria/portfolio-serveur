import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; // Import Types
import { Site } from '../entity/site/site.schema';
import { User } from '../entity/users/user.schema';
import { Media } from '../entity/media/media.schema';
import { Post } from '../entity/posts/post.schema';
import { Category } from '../entity/posts/category.schema'; // Import Category schema
import { Tag } from '../entity/posts/tag.schema'; // Import Tag schema
import { Template } from '../entity/template/template.schema'; // Import Template schema
import { Portfolio } from '../entity/portfolio/portfolio.schema'; // Import Portfolio schema
import { Message } from '../entity/messages/message.schema'; // Import Message 
import { Projet } from '../entity/projet/projet.schema'; // Import Projet schema
import * as path from 'path';
import * as fs from 'fs';
import { OfferedService, OfferedServiceSchema } from '../entity/service/service.schema';


@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site.name) private readonly siteModel: Model<Site>,
    @InjectModel(Media.name) private readonly mediaModel: Model<Media>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>, // Inject CategoryModel
    @InjectModel(Tag.name) private readonly tagModel: Model<Tag>, // Inject TagModel
    @InjectModel(Template.name) private readonly templateModel: Model<Template>,    @InjectModel('OfferedService') private readonly serviceModel: Model<OfferedService>,
    @InjectModel(Portfolio.name) private readonly portfolioModel: Model<Portfolio>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Projet.name) private readonly projetModel: Model<Projet>,
  ) { }
  async createOrUpdateSite(user: User, data: any): Promise<any> {
    const userId = (user as any)._id ? (user as any)._id.toString() : user.id?.toString();
    if (!userId) {
      // console.error('[SiteService] ERREUR: Impossible de déterminer l\'ID utilisateur pour la création du site.');
      throw new Error('Impossible de déterminer l\'ID utilisateur pour la création du site.');
    }
    // Vérifier unicité du nom de site (siteName)
    if (data.siteName && !data.siteId) {
      console.log('site name existe mais pas de propriété siteId');
      const existingSite = await this.siteModel.findOne({ siteName: data.siteName });
      if (existingSite) {
        return { success: false, message: 'Ce nom de site n\'est pas valide, veuillez en choisir un autre !' };
      }
      // pour le cas de mise à jour, on ne vérifie pas l'unicité
      // si le siteName n'est pas modifié, mais que le siteId existe déjà, et le siteName n'est pas vide, on fais la mise à jpur
    } else if (data.siteName && data.siteId) {
      // console.log('site name n\'existe pas mais propriété siteId existe');
      const existingSite = await this.siteModel.findById(data.siteId);
      if (existingSite && existingSite.siteName) {
        const siteNameExists = await this.siteModel.findOne({ siteName: existingSite.siteName, _id: { $ne: data.siteId } });
        if (siteNameExists) {
          // on continue la mise à jour
          data.siteName = existingSite.siteName; // on garde le nom de site existant
        }
      }
      // mettre à jour les champs de configuration
      const configFields = {
        siteName: data.siteName,
        siteType: data.siteType || "",
        primaryColor: data.primaryColor || "",
        siteDescription: data.siteDescription || "",
        enableComments: data.enableComments || "",
        itemsPerPage: data.itemsPerPage || "",
        socialLinks: data.socialLinks || "",
        contactEmail: data.contactEmail || "",
        googleAnalyticsKey: data.googleAnalyticsKey || "",
        siteLanguage: data.siteLanguage || "",
      };
      // ...existing code...

      // 1. Mettre à jour le site avec uniquement les champs de configFields
      // console.log(" creation nouveau site avec siteId ");
      const siteupdate = await this.siteModel.findByIdAndUpdate(
        data.siteId,
        { $set: configFields },
        { new: true }
      ).exec();

      // 2. Mettre à jour le template landingPageTemplate si il existe
      // mais avant rechercher le template par son Id ayant comme association le siteId si cest different si le siteId est différent de celui du template on le met à jour

      if (data.landingPageTemplate) {
        console.log(" Mise à jour du template de la landing page ")

        const temp = await this.templateModel.find(this.templateModel.find({ site: data.siteId })).exec();
        console.log("Template trouvé:", temp, " pour le site:", data.siteId);

        temp.forEach(temps => {
          // if (temps._id.toString() !== data.landingPageTemplate.toString()) {
          //   console.log(
          //     "Template trouvé:", temps,
          //     "pour le site:", data.siteId,
          //     "après avoir casté nous avons:", temps._id.toString(),
          //     "et le data.landingPageTemplate:", data.landingPageTemplate.toString()
          //   );
          // }
          this.templateModel.findByIdAndUpdate(
            temps._id,
            { isPublic: true, site: null },
            { new: true }
          ).exec();

        });

        const template = await this.templateModel.findById(data.landingPageTemplate).exec();
        if (template) {
          await this.templateModel.findByIdAndUpdate(
            data.landingPageTemplate,
            { site: data.siteId, isPublic: false },
            { new: true }
          ).exec();
        }
      }

      // 3. Mettre à jour ou créer le ServiceModel associé
      if (data.service_name) {
        const newServ = new this.serviceModel(
          {
            site: data.siteId,
            service_name: data.service_name,
            service_descriptions: data.service_descriptions,
            domaine_servicee: data.domaine_service,
            service_image: data.service_image,
          }
        );
        try {
          await newServ.save();
        } catch (err) {
          // console.error('[SiteService] ERREUR lors de la sauvegarde du service:', err);
          return { success: false, message: 'Erreur lors de la sauvegarde du service.' };
        }



      }
      // ...existing code...
      return { success: true, site: siteupdate };
    }
    // Création d'un nouveau site (pas de mise à jour)
    const configFields = {
      siteName: data.siteName,
      siteType: data.siteType,
      notifications: data.notifications,
      isSecure: data.isSecure,
      isAuth: data.isAuth,
      hasBlog: data.hasBlog,
    };
    const site = new this.siteModel({ ...data, ...configFields, user: userId });
    try {
      await site.save();
    } catch (err) {
      // console.error('[SiteService] ERREUR lors du save:', err);
      return { success: false, message: 'Erreur lors de la création du site.' };
    }
    return { success: true, site };
  }

  async getSiteByUser(userId: string): Promise<Site | null> {
    return this.siteModel.findOne({ user: userId });
  }

  async getSitesByUser(userId: string): Promise<Site[]> {
    const sites = await this.siteModel.find({ user: userId }).exec(); // Added await and .exec()
    return sites;
  }

  async deleteSite(siteId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const site = await this.siteModel.findById(siteId).exec();

    if (!site) {
      throw new NotFoundException(`Site with ID "${siteId}" not found.`);
    }

    const siteOwnerId = site.user.toString();
    if (siteOwnerId !== userId) {
      throw new UnauthorizedException(`User does not have permission to delete site "${siteId}".`);
    }

    const siteObjectId = new Types.ObjectId(siteId);

    // Find all posts associated with the site
    const postsToDelete = await this.postModel.find({ site: siteObjectId }).exec();
    const deletedPostIds = postsToDelete.map(p => p._id);

    let allCategoryIdsFromDeletedPosts: Types.ObjectId[] = [];
    let allTagIdsFromDeletedPosts: Types.ObjectId[] = [];

    if (postsToDelete.length > 0) {
      postsToDelete.forEach(post => {
        if (post.categories && post.categories.length > 0) {
          allCategoryIdsFromDeletedPosts.push(...post.categories.map(cat => new Types.ObjectId(cat.toString())));
        }
        if (post.tags && post.tags.length > 0) {
          allTagIdsFromDeletedPosts.push(...post.tags.map(tag => new Types.ObjectId(tag.toString())));
        }
      });

      const mediaIdsFromPosts = postsToDelete.reduce((acc, post) => {
        if (post.media && post.media.length > 0) {
          acc.push(...post.media.map(id => id.toString()));
        }
        return acc;
      }, [] as string[]);

      if (mediaIdsFromPosts.length > 0) {
        const uniqueMediaIds = [...new Set(mediaIdsFromPosts)];
        const mediaDocsToDelete = await this.mediaModel.find({ _id: { $in: uniqueMediaIds } }).exec();

        for (const mediaDoc of mediaDocsToDelete) {
          if (mediaDoc.url) {
            const filePath = path.join(process.cwd(), 'public', mediaDoc.url);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (err) {
              console.error(`Error deleting media file ${filePath}:`, err);
            }
          }
        }
        await this.mediaModel.deleteMany({ _id: { $in: uniqueMediaIds } }).exec();
      }

      await this.postModel.deleteMany({ _id: { $in: deletedPostIds } }).exec();
    }

    // Delete orphaned categories
    const uniqueCategoryIdsFromDeletedPosts = [...new Set(allCategoryIdsFromDeletedPosts.map(id => id.toString()))];
    for (const categoryId of uniqueCategoryIdsFromDeletedPosts) {
      const categoryObjectId = new Types.ObjectId(categoryId);
      const otherPostsWithCategory = await this.postModel.findOne({
        categories: categoryObjectId,
        _id: { $nin: deletedPostIds } // Exclude posts that were just deleted
      }).exec();
      if (!otherPostsWithCategory) {
        await this.categoryModel.findByIdAndDelete(categoryObjectId).exec();
      }
    }

    // Delete orphaned tags
    const uniqueTagIdsFromDeletedPosts = [...new Set(allTagIdsFromDeletedPosts.map(id => id.toString()))];
    for (const tagId of uniqueTagIdsFromDeletedPosts) {
      const tagObjectId = new Types.ObjectId(tagId);
      const otherPostsWithTag = await this.postModel.findOne({
        tags: tagObjectId,
        _id: { $nin: deletedPostIds } // Exclude posts that were just deleted
      }).exec();
      if (!otherPostsWithTag) {
        await this.tagModel.findByIdAndDelete(tagObjectId).exec();
      }
    }

    // Delete the Site document
    const result = await this.siteModel.deleteOne({ _id: siteObjectId, user: userId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Site with ID "${siteId}" not found or user not authorized (deletion step).`);
    }

    return { success: true, message: 'Site, associated posts, media, and orphaned categories/tags deleted successfully.' };
  }  /**
   * Récupère un site et toutes ses entités associées par ID de template
   * Retourne : site, template, user, posts, portfolio, messages liés aux posts
   */
  async getSiteDetailsByName(templateId: string) {
    // 1. Trouver le template par ID
    const template = await this.templateModel.findById(templateId).lean();
    if (!template) throw new NotFoundException(`Template avec l'ID '${templateId}' introuvable.`);
    
    // 2. Récupérer le site associé au template
    const site = await this.siteModel.findById(template.site).lean();
    if (!site) throw new NotFoundException(`Site associé au template '${templateId}' introuvable.`);
      // 3. Récupérer le user associé au site
    const user = await this.userModel.findById(site.user).lean();

    // 4. Récupérer les posts associés au site
    const postsWithMedia = await this.postModel.find({ site: site._id }).lean();    // 5. Récupérer TOUS les portfolios associés au site
     // 1. Récupérer tous les IDs de médias
    const mediaIds = postsWithMedia.reduce((acc, post) => {
      if (post.media && post.media.length > 0) {
        acc.push(...post.media.map(media => media.toString()));
      }
      return acc;
    }, [] as string[]);

    // 2. Récupérer tous les documents médias
    let medias: any[] = [];
    if (mediaIds.length > 0) {
      medias = await this.mediaModel.find({ _id: { $in: mediaIds } }).lean();
    }
     // 3. Créer une map pour accès rapide par ID
    const mediaMap = medias.reduce((acc, media) => {
      acc[media._id.toString()] = media;
      return acc;
    }, {} as Record<string, any>);

    // 4. Remplacer les IDs par les objets médias complets dans chaque post
    const posts = postsWithMedia.map(post => ({
      ...post,
      media: Array.isArray(post.media)
        ? post.media.map((id: any) => mediaMap[id.toString()]).filter(Boolean)
        : [],
    }));

    let portfolios = [];
    try {
      if (this.portfolioModel) {
        // Convertir site._id en string pour éviter les problèmes d'ObjectId
        const siteIdString = site._id.toString();
        portfolios = await this.portfolioModel.find({ 
          site: { $in: [site._id, siteIdString] } 
        }).lean();
      }
    } catch (error) {
      console.error('[ERROR] Erreur lors de la récupération des portfolios:', error);
    }

    // 6. Récupérer les messages associés aux posts du site
    
    let messages = [];
    if (posts.length > 0 && this.messageModel) {
      const postIds = posts.map(p => p._id);
      messages = await this.messageModel.find({ post: { $in: postIds } }).lean();
    }
    // 7. Récupérer les services offerts associés au site
    let services = [];
    try {
      if (this.serviceModel) {
        // Correction : matcher à la fois ObjectId et string
        services = await this.serviceModel.find({ site: { $in: [site._id, site._id.toString()] } }).lean();
      }
    } catch (error) {
      console.error('[ERROR] Erreur lors de la récupération des services:', error);
    }
    let projet = [];
    try {
      if (this.projetModel) {
        // Convertir site._id en string pour éviter les problèmes d'ObjectId
        const userIdString = user._id.toString();
        projet = await this.projetModel.find({ 
          user: { $in: [user._id, userIdString] } 
        }).lean();
      }
    } catch (error) {
      console.error('[ERROR] Erreur lors de la récupération des projets:', error);
    }

    return {GlobalData: [      site,
      user,
      template,
      posts,
      portfolios,
      messages,
      services,
      projet
    ]};
  }
}
