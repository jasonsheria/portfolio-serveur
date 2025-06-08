import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; // Import Types
import { Site } from '../entity/site/site.schema';
import { User } from '../entity/users/user.schema';
import { Media } from '../entity/media/media.schema';
import { Post } from '../entity/posts/post.schema';
import { Category } from '../entity/posts/category.schema'; // Import Category schema
import { Tag } from '../entity/posts/tag.schema'; // Import Tag schema
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
    @InjectModel('OfferedService') private readonly serviceModel: Model<OfferedService>,
  ) {}

  async createOrUpdateSite(user: User, data: any): Promise<any> {
    const userId = (user as any)._id ? (user as any)._id.toString() : user.id?.toString();
    if (!userId) {
      console.error('[SiteService] ERREUR: Impossible de déterminer l\'ID utilisateur pour la création du site.');
      throw new Error('Impossible de déterminer l\'ID utilisateur pour la création du site.');
    }
    // Vérifier unicité du nom de site (siteName)
    if (data.siteName) {
      const existingSite = await this.siteModel.findOne({ siteName: data.siteName });
      if (existingSite) {
        return { success: false, message: 'Ce nom de site n\'est pas valide, veuillez en choisir un autre !' };
      }
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
      console.error('[SiteService] ERREUR lors du save:', err);
      throw err;
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
}
