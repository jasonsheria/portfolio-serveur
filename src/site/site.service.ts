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
    @InjectModel(Template.name) private readonly templateModel: Model<Template>,
    @InjectModel('OfferedService') private readonly serviceModel: Model<OfferedService>,
    @InjectModel('Portfolio') private readonly portfolioModel: Model<any>,
    @InjectModel('Message') private readonly messageModel: Model<any>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
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
  }

  /**
   * Récupère un site et toutes ses entités associées par nom de site
   * Retourne : site, template, user, posts, portfolio, messages liés aux posts
   */
  async getSiteDetailsByName(siteName: string) {
    // 1. Trouver le site par nom
    const site = await this.siteModel.findOne({ siteName }).lean();
    if (!site) throw new NotFoundException(`Site '${siteName}' introuvable.`);

    // 2. Récupérer le user associé
    const user = await this.userModel.findById(site.user).lean();

    // 3. Récupérer le template associé au site
    const template = await this.templateModel.findOne({ site: site._id }).lean();

    // 4. Récupérer les posts associés au site
    const posts = await this.postModel.find({ site: site._id }).lean();

    // 5. Récupérer le portfolio associé au site
    let portfolio = null;
    if (this.portfolioModel) {
      portfolio = await this.portfolioModel.findOne({ site: site._id }).lean();
    }

    // 6. Récupérer les messages associés aux posts du site
    let messages = [];
    if (posts.length > 0 && this.messageModel) {
      const postIds = posts.map(p => p._id);
      messages = await this.messageModel.find({ post: { $in: postIds } }).lean();
    }

    return {
      site,
      user,
      template,
      posts,
      portfolio,
      messages,
    };
  }
}
