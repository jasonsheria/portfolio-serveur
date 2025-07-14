import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post } from '../entity/posts/post.schema';
import { Media } from '../entity/media/media.schema';
import { Category } from '../entity/posts/category.schema';
import { Tag } from '../entity/posts/tag.schema';
import { Site } from '../entity/site/site.schema';
import { User } from '../entity/users/user.schema';
import { Comment } from '../entity/comments/comment.schema'; // Import du modèle Comment
import { SearchPostsByCriteriaDto, CriterionDto } from './dto/search-criteria.dto'; // Corrected import path for SearchPostsByCriteriaDto
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(Media.name) private mediaModel: Model<Media>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Tag.name) private tagModel: Model<Tag>,
    @InjectModel(Site.name) private siteModel: Model<Site>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>, // Ajout injection du modèle Comment
  ) { }

  private async findOrCreateByName(model: Model<Category | Tag>, name: string): Promise<Types.ObjectId> {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new BadRequestException(`Invalid name provided for ${model.modelName}: \"${name}\"`);
    }
    const trimmedName = name.trim();
    let doc;
    try {
      doc = await model.findOne({ name: trimmedName });
      if (!doc) {
        doc = await model.create({ name: trimmedName });
      }
    } catch (error) {
      console.error(`Database error in findOrCreateByName for ${model.modelName} with name \"${trimmedName}\":`, error);
      throw new InternalServerErrorException(`Failed to find or create ${model.modelName} with name \"${trimmedName}\".`);
    }

    if (!doc || !doc._id) {
      console.error(`Document or document _id is undefined after findOrCreateByName for ${model.modelName} with name \"${trimmedName}\". Doc: ${JSON.stringify(doc)}`);
      throw new InternalServerErrorException(`Failed to retrieve _id for ${model.modelName} with name \"${trimmedName}\".`);
    }

    return doc._id;
  }

  async createPostWithMedia(
    userId: Types.ObjectId,
    postData: any,
    files: Express.Multer.File[],
    siteId: Types.ObjectId,
  ) {
    // Validate userId
    if (!userId || !(userId instanceof Types.ObjectId)) {
      // This check is crucial. If userId is a string, it needs conversion in the controller.
      console.error('Service Error: userId is not a valid ObjectId instance or is missing.', userId);
      throw new BadRequestException('User ID is invalid or missing.');
    }

    // Vérifier que le site existe
    if (!siteId || !(siteId instanceof Types.ObjectId)) {
      throw new BadRequestException('Site ID is invalid or missing.');
    }
    const site = await this.siteModel.findById(siteId);
    if (!site) {
      throw new NotFoundException(`Site not found for ID: ${siteId}`);
    }

    const categoryIds: Types.ObjectId[] = [];
    if (postData.categories && Array.isArray(postData.categories)) {
      for (const categoryName of postData.categories) {
        if (typeof categoryName === 'string') {
          try {
            const categoryId = await this.findOrCreateByName(this.categoryModel, categoryName);
            categoryIds.push(categoryId);
          } catch (error) {
            console.error(`Error processing category \"${categoryName}\"":`, error);
            throw new InternalServerErrorException(`Failed to process category: ${categoryName}`);
          }
        } else {
          console.warn('Skipping non-string category name:', categoryName);
        }
      }
    }

    const tagIds: Types.ObjectId[] = [];
    if (postData.tags && Array.isArray(postData.tags)) {
      for (const tagName of postData.tags) {
        if (typeof tagName === 'string') {
          try {
            const tagId = await this.findOrCreateByName(this.tagModel, tagName);
            tagIds.push(tagId);
          } catch (error) {
            console.error(`Error processing tag \"${tagName}\"":`, error);
            throw new InternalServerErrorException(`Failed to process tag: ${tagName}`);
          }
        } else {
          console.warn('Skipping non-string tag name:', tagName);
        }
      }
    }

    // Explicitly construct the object for post creation
    // Exclude original categories, tags, and user from postData to avoid conflicts
    const { categories, tags, user, site: siteFromBody, ...restOfPostData } = postData;

    const newPostPayload = {
      ...restOfPostData, // title, content, status etc.
      user: userId,
      site: siteId, // Associer le site au post
      categories: categoryIds,
      tags: tagIds,
      media: [], // Initialize media, will be populated after media creation
    };

    let post: Post;
    try {
      post = await this.postModel.create(newPostPayload);
    } catch (validationError) {
      console.error('Mongoose validation error during post creation:', validationError);
      console.error('Payload causing error:', newPostPayload);
      throw validationError; // Re-throw the original Mongoose error
    }


    // Création des médias et association au post
    const mediaDocsIds: Types.ObjectId[] = await Promise.all(
      files.map(async (file): Promise<Types.ObjectId> => {
        const media = await this.mediaModel.create({
          post: post._id,
          user: userId,
          site: siteId, // Associer le site au média aussi
          url: `/uploads/posts/${file.filename}`,
          filename: file.filename,
          type: file.mimetype.startsWith('image/') ? 'image' : file.mimetype.startsWith('video/') ? 'video' : 'file',
        });
        return media._id as Types.ObjectId;
      })
    );

    // Mise à jour du post avec les IDs des médias
    post.media = mediaDocsIds;
    await post.save();

    // Peupler les références pour retourner les infos complètes
    // Use the correct populate syntax for Mongoose
    return this.postModel.findById(post._id).populate(['media', 'categories', 'tags', 'user', 'site']).exec();
  }

  /**
   * Récupère tous les posts d'un user et d'un site, avec population media, catégories, tags
   */
  async getPostsByUserAndSite(userId: Types.ObjectId, siteId: Types.ObjectId) {
    if (!userId || !siteId) {
      throw new BadRequestException('UserId et SiteId requis');
    }
    // On récupère tous les posts liés à ce user et ce site
    return this.postModel.find({ user: userId, site: siteId })
      .populate(['media', 'categories', 'tags', 'user', 'site'])
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPostByIdAndSite(postId: Types.ObjectId, siteId: Types.ObjectId, userId?: Types.ObjectId) {
    if (!postId || !siteId) {
      throw new BadRequestException('PostId et SiteId sont requis.');
    }

    const query: any = { _id: postId, site: siteId };
    if (userId) {
      query.user = userId;
    }

    const post = await this.postModel.findOne(query)
      .populate(['media', 'categories', 'tags', 'user', 'site'])
      .exec();

    if (!post) {
      throw new NotFoundException(`Post non trouvé avec ID: ${postId} pour le site ${siteId}`);
    }
    return post;
  }

  async updatePost(
    postId: Types.ObjectId,
    userId: Types.ObjectId,
    siteId: Types.ObjectId,
    postData: any,
    files: Express.Multer.File[],
  ): Promise<Post> {
    const post = await this.postModel.findOne({
      _id: postId,
      user: userId,
      site: siteId,
    });

    if (!post) {
      throw new NotFoundException(
        `Post not found or user not authorized to update. PostId: ${postId}, UserId: ${userId}, SiteId: ${siteId}`,
      );
    }

    // Update basic fields
    if (postData.title) post.title = postData.title;
    if (postData.content) post.content = postData.content;
    if (postData.status) post.status = postData.status;

    // Update categories
    if (postData.categories && Array.isArray(postData.categories)) {
      const categoryIds: Types.ObjectId[] = [];
      for (const categoryName of postData.categories) {
        if (typeof categoryName === 'string') {
          try {
            const categoryId = await this.findOrCreateByName(
              this.categoryModel,
              categoryName,
            );
            categoryIds.push(categoryId);
          } catch (error) {
            console.error(`Error processing category \"${categoryName}\"":`, error);
            throw new InternalServerErrorException(
              `Failed to process category: ${categoryName}`,
            );
          }
        }
      }
      post.categories = categoryIds;
    }

    // Update tags
    if (postData.tags && Array.isArray(postData.tags)) {
      const tagIds: Types.ObjectId[] = [];
      for (const tagName of postData.tags) {
        if (typeof tagName === 'string') {
          try {
            const tagId = await this.findOrCreateByName(this.tagModel, tagName);
            tagIds.push(tagId);
          } catch (error) {
            console.error(`Error processing tag \"${tagName}\"":`, error);
            throw new InternalServerErrorException(
              `Failed to process tag: ${tagName}`,
            );
          }
        }
      }
      post.tags = tagIds;
    }

    // --- Revised Media Handling ---
    const currentMediaObjectIds: Types.ObjectId[] = post.media ? [...post.media] : [];
    const retainedMediaIdsFromClient: string[] = postData.retainedMediaIds || [];

    const finalMediaObjectIds: Types.ObjectId[] = [];
    const mediaObjectsToDelete: Types.ObjectId[] = [];

    // 1. Determine which of the current media should be kept or deleted
    for (const mediaId of currentMediaObjectIds) {
      if (retainedMediaIdsFromClient.includes(mediaId.toString())) {
        finalMediaObjectIds.push(mediaId); // This media is retained
      } else {
        mediaObjectsToDelete.push(mediaId); // This media is not retained, mark for deletion
      }
    }

    // 2. Delete media marked for deletion
    if (mediaObjectsToDelete.length > 0) {
      for (const mediaIdToDelete of mediaObjectsToDelete) {
        const mediaDoc = await this.mediaModel.findById(mediaIdToDelete);
        if (mediaDoc) {
          // Optionally delete file from server:
          // import * as fs from 'fs';
          // import * as path from 'path';
          // const filePath = path.join('uploads', mediaDoc.filename); // Assuming CWD is project root
          // try { fs.unlinkSync(filePath); } catch (err) { console.error('Failed to delete media file:', mediaDoc.filename, err); }
          await this.mediaModel.findByIdAndDelete(mediaIdToDelete);
        }
      }
    }

    // 3. Add new media if files are uploaded
    if (files && files.length > 0) {
      const newMediaDocsIds: Types.ObjectId[] = await Promise.all(
        files.map(async (file): Promise<Types.ObjectId> => {
          const media = await this.mediaModel.create({
            post: post._id,
            user: userId, // Assuming userId is the ObjectId of the user
            site: siteId,   // Assuming siteId is the ObjectId of the site
            url: `/uploads/posts/${file.filename}`,
            filename: file.filename,
            type: file.mimetype.startsWith('image/')
              ? 'image'
              : file.mimetype.startsWith('video/')
                ? 'video'
                : 'file',
          });
          return media._id as Types.ObjectId;
        }),
      );
      finalMediaObjectIds.push(...newMediaDocsIds); // Add new media to the final list
    }

    // Deduplicate finalMediaObjectIds to prevent issues if an ID was somehow in both retained and new (highly unlikely with this logic)
    const uniqueFinalMediaObjectIdsStrings = Array.from(new Set(finalMediaObjectIds.map(id => id.toString())));
    post.media = uniqueFinalMediaObjectIdsStrings.map(idStr => new Types.ObjectId(idStr));
    // --- End of Revised Media Handling ---

    try {
      await post.save();
      return this.postModel
        .findById(post._id)
        .populate(['media', 'categories', 'tags', 'user', 'site'])
        .exec();
    } catch (validationError) {
      console.error('Mongoose validation error during post update:', validationError);
      throw validationError;
    }
  }

  async deletePost(postId: Types.ObjectId, userId: Types.ObjectId, siteId: Types.ObjectId): Promise<{ message: string }> {
    if (!postId || !userId || !siteId) {
      throw new BadRequestException('PostId, UserId et SiteId sont requis pour la suppression.');
    }

    const post = await this.postModel.findOne({ _id: postId, user: userId, site: siteId });

    if (!post) {
      throw new NotFoundException(`Post non trouvé ou non autorisé pour la suppression. PostId: ${postId}, UserId: ${userId}, SiteId: ${siteId}`);
    }

    // Supprimer les médias associés (fichiers et entrées DB)
    if (post.media && post.media.length > 0) {
      for (const mediaId of post.media) {
        const media = await this.mediaModel.findById(mediaId);
        if (media) {
          // Suppression physique du fichier
          if (media.filename) {
            const filePath = path.join('/upload', 'posts', media.filename);
            try { fs.unlinkSync(filePath); } catch (err) { /* ignore */ }
          }
          await this.mediaModel.findByIdAndDelete(mediaId);
        }
      }
    }

    await this.postModel.findByIdAndDelete(postId);
    return { message: 'Post supprimé avec succès' };
  }

  // MODIFIED METHOD IMPLEMENTATION
  async searchPostsByCriteria(
    criteria: SearchPostsByCriteriaDto,
  ): Promise<any[]> { // Changement du type de retour pour inclure commentsCount
    console.log('[searchPostsByCriteria] Appel avec critères:', JSON.stringify(criteria));
    // --- LOGIQUE DE FILTRAGE SPÉCIFIQUE DEMANDÉE ---
    // Correction : n'exclure que si la combinaison n'est PAS demandée
    if (!(
      (criteria.siteName === 'demo-1' && criteria.userEmail === 'jasongachaba1@gmail.com') ||
      (criteria.siteName === 'demo-2' && criteria.userEmail === 'raisgachaba@gmail.com')
    )) {
      // Si la combinaison n'est pas autorisée, on retourne []
      return [];
    }
    // Si siteName n'est ni demo-1 ni demo-2, on laisse passer (ou on peut aussi return [] si tu veux tout bloquer)

    const query: any = {};

    const {
      siteId: criteriaSiteId,
      siteName,
      userEmail,
      userId: criteriaUserId,
      categoryName,
      categoryId: criteriaCategoryId,
      tagName,
      tagId: criteriaTagId,
      title,
      status,
      dateFrom,
      dateTo,
      page: criteriaPage,
      limit: criteriaLimit,
      sortBy: criteriaSortBy,
      sortOrder: criteriaSortOrder,
    } = criteria;

    const page = criteriaPage && Number(criteriaPage) > 0 ? Number(criteriaPage) : 1;
    const limit = criteriaLimit && Number(criteriaLimit) > 0 ? Number(criteriaLimit) : 10;
    const sortBy = criteriaSortBy || 'createdAt';
    const sortOrder = criteriaSortOrder === 'asc' ? 1 : -1;

    if (criteriaSiteId) {
      try {
        query.site = new Types.ObjectId(criteriaSiteId);
      } catch (error) {
        throw new BadRequestException(`Invalid siteId format: ${criteriaSiteId}`);
      }
    } else if (siteName) {
      const site = await this.siteModel.findOne({ siteName: siteName }).select('_id user').lean();
      console.log('[searchPostsByCriteria] Recherche site:', siteName, '=>', site);
      if (!site) {
        console.warn(`Site not found for name: ${siteName}`);
        return [];
      }
      query.site = site._id;
    }

    if (criteriaUserId) {
      try {
        query.user = new Types.ObjectId(criteriaUserId);
      } catch (error) {
        throw new BadRequestException(`Invalid userId format in criteria: ${criteriaUserId}`);
      }
    } else if (userEmail) {
      const user = await this.userModel.findOne({ email: userEmail }).select('_id').lean();
      console.log('[searchPostsByCriteria] Recherche user:', userEmail, '=>', user);
      if (user) {
        query.user = user._id;
      } else {
        console.warn(`User not found for email: ${userEmail}`);
        return [];
      }
    }

    if (criteriaCategoryId) {
      try {
        query.categories = new Types.ObjectId(criteriaCategoryId);
      } catch (error) {
        throw new BadRequestException(`Invalid categoryId format: ${criteriaCategoryId}`);
      }
    } else if (categoryName) {
      const category = await this.categoryModel.findOne({ name: categoryName }).select('_id').lean();
      if (category) {
        query.categories = category._id;
      } else {
        return [];
      }
    }

    if (criteriaTagId) {
      try {
        query.tags = new Types.ObjectId(criteriaTagId);
      } catch (error) {
        throw new BadRequestException(`Invalid tagId format: ${criteriaTagId}`);
      }
    } else if (tagName) {
      const tag = await this.tagModel.findOne({ name: tagName }).select('_id').lean();
      if (tag) {
        query.tags = tag._id;
      } else {
        return [];
      }
    }

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        try {
          query.createdAt.$gte = new Date(dateFrom);
        } catch (error) {
          throw new BadRequestException(`Invalid dateFrom format: ${dateFrom}`);
        }
      }
      if (dateTo) {
        try {
          query.createdAt.$lte = new Date(dateTo);
        } catch (error) {
          throw new BadRequestException(`Invalid dateTo format: ${dateTo}`);
        }
      }
    }

    console.log("Executing search with query:", JSON.stringify(query, null, 2));
    console.log(`Page: ${page}, Limit: ${limit}, SortBy: ${sortBy}, SortOrder: ${sortOrder}`);

    const posts = await this.postModel.find(query)
      .populate('media')
      .populate('categories')
      .populate('tags')
      .populate({ path: 'user', select: '-password' })
      .populate('site')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    // Pour chaque post, compter les commentaires liés et ajouter commentsCount
    const postIds = posts.map(post => post._id);
    // On suppose que le modèle Comment existe et s'appelle 'Comment'
    const commentsCounts = await this['commentModel'].aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const commentsCountMap = {};
    commentsCounts.forEach(cc => { commentsCountMap[cc._id.toString()] = cc.count; });

    // Retourner les posts enrichis avec commentsCount
    return posts.map(post => ({
      ...post,
      commentsCount: commentsCountMap[post._id.toString()] || 0
    }));
  }

  /**
   * Retourne le nombre total de posts correspondant aux critères (sans pagination)
   */
  async countPostsByCriteria(criteria: SearchPostsByCriteriaDto): Promise<number> {
    // Copie de la logique de construction du query depuis searchPostsByCriteria
    const {
      siteId: criteriaSiteId,
      siteName,
      userEmail,
      userId: criteriaUserId,
      categoryName,
      categoryId: criteriaCategoryId,
      tagName,
      tagId: criteriaTagId,
      title,
      status,
      dateFrom,
      dateTo,
      // pagination ignorée
      // tri ignoré
    } = criteria;
    const query: any = {};

    if (criteriaSiteId) {
      try {
        query.site = new Types.ObjectId(criteriaSiteId);
      } catch (error) {
        throw new BadRequestException(`Invalid siteId format: ${criteriaSiteId}`);
      }
    } else if (siteName) {
      const site = await this.siteModel.findOne({ siteName: siteName }).select('_id user').lean();
      if (!site) return 0;
      query.site = site._id;
    }

    if (criteriaUserId) {
      try {
        query.user = new Types.ObjectId(criteriaUserId);
      } catch (error) {
        throw new BadRequestException(`Invalid userId format in criteria: ${criteriaUserId}`);
      }
    } else if (userEmail) {
      const user = await this.userModel.findOne({ email: userEmail }).select('_id').lean();
      if (user) {
        query.user = user._id;
      } else {
        return 0;
      }
    }

    if (criteriaCategoryId) {
      try {
        query.categories = new Types.ObjectId(criteriaCategoryId);
      } catch (error) {
        throw new BadRequestException(`Invalid categoryId format: ${criteriaCategoryId}`);
      }
    } else if (categoryName) {
      const category = await this.categoryModel.findOne({ name: categoryName }).select('_id').lean();
      if (category) {
        query.categories = category._id;
      } else {
        return 0;
      }
    }

    if (criteriaTagId) {
      try {
        query.tags = new Types.ObjectId(criteriaTagId);
      } catch (error) {
        throw new BadRequestException(`Invalid tagId format: ${criteriaTagId}`);
      }
    } else if (tagName) {
      const tag = await this.tagModel.findOne({ name: tagName }).select('_id').lean();
      if (tag) {
        query.tags = tag._id;
      } else {
        return 0;
      }
    }

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        try {
          query.createdAt.$gte = new Date(dateFrom);
        } catch (error) {
          throw new BadRequestException(`Invalid dateFrom format: ${dateFrom}`);
        }
      }
      if (dateTo) {
        try {
          query.createdAt.$lte = new Date(dateTo);
        } catch (error) {
          throw new BadRequestException(`Invalid dateTo format: ${dateTo}`);
        }
      }
    }

    // Même logique d'autorisation que searchPostsByCriteria
    if (!(
      (criteria.siteName === 'demo-1' && criteria.userEmail === 'jasongachaba1@gmail.com') ||
      (criteria.siteName === 'demo-2' && criteria.userEmail === 'raisgachaba@gmail.com')
    )) {
      return 0;
    }

    return this.postModel.countDocuments(query);
  }

  async incrementLikesCount(postId: string) {
    const updated = await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );
    if (!updated) throw new NotFoundException('Post not found');
    return { likesCount: updated.likesCount };
  }

  async decrementLikesCount(postId: string) {
    const updated = await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );
    if (!updated) throw new NotFoundException('Post not found');
    if (updated.likesCount < 0) {
      updated.likesCount = 0;
      await updated.save();
    }
    return { likesCount: updated.likesCount };
  }

  // Récupérer un post par son id (public, sans guard)
  async getPublicPostById(postId: string) {
    if (!postId || typeof postId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(postId)) {
      throw new BadRequestException('Post ID is invalid.');
    }
    const post = await this.postModel.findById(postId)
      .populate('user')
      .populate('categories')
      .populate('tags')
      .populate('media');
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }
}
