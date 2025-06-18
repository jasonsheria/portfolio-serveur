import {
  Controller,
  Post as HttpPost, 
  Put, 
  Body,
  UseInterceptors,
  UploadedFiles,
  Req,
  BadRequestException,
  Get,
  Query,
  Request,
  UseGuards,
  Delete, 
  Param,  
  Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PostsService } from './posts.service';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchPostsByCriteriaDto } from './dto/search-criteria.dto'; // IMPORTED DTO

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard) 
  @HttpPost('create')
  @UseInterceptors(
    FilesInterceptor('media', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, 
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image') || file.mimetype.startsWith('video')) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
    })
  )
  async createPost(
    @Req() req, 
    @Body() body, 
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let parsedBody = body;
    if (body.postData && typeof body.postData === 'string') {
      try {
        parsedBody = JSON.parse(body.postData);
      } catch (e) {
        throw new BadRequestException('Invalid JSON in postData field.');
      }
    }

    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub;
    const siteIdRaw = parsedBody.siteId || parsedBody.site;

    if (!userIdRaw || typeof userIdRaw.toString() !== 'string' || !/^[a-fA-F0-9]{24}$/.test(userIdRaw.toString())) {
      console.error('Controller Error: User ID from token is invalid or missing.', { userIdRaw });
      throw new BadRequestException('User ID is invalid or missing from token (format).');
    }
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      console.error('Controller Error: Site ID from parsed body is invalid or missing.', { siteIdRaw });
      throw new BadRequestException('Site ID is invalid or missing in postData (format).');
    }

    let userId: Types.ObjectId;
    let siteId: Types.ObjectId;

    try {
      userId = new Types.ObjectId(userIdRaw.toString());
      siteId = new Types.ObjectId(siteIdRaw);
    } catch (e) {
      console.error('Controller Error: Error casting IDs to ObjectId.', { userIdRaw, siteIdRaw, error: e });
      throw new BadRequestException('Invalid ID format for User or Site (ObjectId cast failed).');
    }
    
    const post = await this.postsService.createPostWithMedia(userId, parsedBody, files, siteId);
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getPostsByUserAndSite(
    @Request() req,
    @Query('siteId') siteIdRaw: string
  ) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    if (!userIdRaw || typeof userIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(userIdRaw)) {
      throw new BadRequestException('User ID is invalid or missing (format).');
    }
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      throw new BadRequestException('Site ID is invalid or missing (format).');
    }
    const userId = new Types.ObjectId(userIdRaw);
    const siteId = new Types.ObjectId(siteIdRaw);
    const posts = await this.postsService.getPostsByUserAndSite(userId, siteId);
    return posts;
  }

  @UseGuards(JwtAuthGuard)
  @Get('details/:id')
  async getPostDetails(
    @Request() req,
    @Param('id') postIdRaw: string,
    @Query('siteId') siteIdRaw: string,
  ) {
    if (!postIdRaw || typeof postIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(postIdRaw)) {
      throw new BadRequestException('Post ID is invalid.');
    }
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      throw new BadRequestException('Site ID is invalid or missing.');
    }

    const postId = new Types.ObjectId(postIdRaw);
    const siteId = new Types.ObjectId(siteIdRaw);
    
    return this.postsService.getPostByIdAndSite(postId, siteId );
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/:id') 
  @UseInterceptors( 
    FilesInterceptor('media', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, 
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image') || file.mimetype.startsWith('video')) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
    }),
  )
  async updatePost(
    @Request() req,
    @Param('id') postIdRaw: string,
    @Body() body: any, 
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let parsedBody = body;
    if (body.postData && typeof body.postData === 'string') {
      try {
        parsedBody = JSON.parse(body.postData);
      } catch (e) {
        throw new BadRequestException('Invalid JSON in postData field.');
      }
    }

    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub; 
    const siteIdRaw = parsedBody.siteId || parsedBody.site;

    if (!userIdRaw || typeof userIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(userIdRaw.toString())) {
      console.error('User ID from token is invalid or missing:', userIdRaw);
      throw new BadRequestException('User ID is invalid or missing from token (format).');
    }
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      console.error('Site ID from parsed body is invalid or missing:', siteIdRaw);
      throw new BadRequestException('Site ID is invalid or missing in postData (format).');
    }

    let userId: Types.ObjectId;
    let postId: Types.ObjectId;
    let siteId: Types.ObjectId;

    try {
      userId = new Types.ObjectId(userIdRaw.toString());
      postId = new Types.ObjectId(postIdRaw);
      siteId = new Types.ObjectId(siteIdRaw);
    } catch (e) {
      console.error('Error casting IDs to ObjectId:', e, { userIdRaw, postIdRaw, siteIdRaw });
      throw new BadRequestException('Invalid ID format for User, Post, or Site (ObjectId cast failed).');
    }
    
    return this.postsService.updatePost(postId, userId, siteId, parsedBody, files);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(
    @Request() req,
    @Param('id') postIdRaw: string,
    @Query('siteId') siteIdRaw: string
  ) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;

    if (!userIdRaw || typeof userIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(userIdRaw)) {
      throw new BadRequestException('User ID is invalid or missing.');
    }
    if (!postIdRaw || typeof postIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(postIdRaw)) {
      throw new BadRequestException('Post ID is invalid.');
    }
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      throw new BadRequestException('Site ID is invalid or missing.');
    }

    const userId = new Types.ObjectId(userIdRaw);
    const postId = new Types.ObjectId(postIdRaw);
    const siteId = new Types.ObjectId(siteIdRaw);

    return this.postsService.deletePost(postId, userId, siteId);
  }

  // Renamed and modified to accept a single criteria object in the body
  @HttpPost('search-body') 
  async searchPostsBody(
    @Body() body: any,
    @Request() req,
    @Res() res: any
  ) {
    const { criterias, page = 1, limit = 6 } = body;
    if (Array.isArray(criterias)) {
      const allResults: any[] = [];
      let total = 0;
      for (const criteria of criterias) {
        const [posts, count] = await Promise.all([
          this.postsService.searchPostsByCriteria({ ...criteria, page, limit }),
          this.postsService.countPostsByCriteria(criteria)
        ]);
        if (Array.isArray(posts)) {
          allResults.push(...posts);
        }
        total += count;
      }
      // Déduplique par _id
      const uniqueResults = Array.from(new Map(allResults.map(p => [String(p._id), p])).values());
      res.set('X-Total-Count', total.toString());
      return res.json(uniqueResults);
    } else {
      // Cas rétrocompatible : un seul critère
      const [posts, count] = await Promise.all([
        this.postsService.searchPostsByCriteria({ ...body, page, limit }),
        this.postsService.countPostsByCriteria(body)
      ]);
      res.set('X-Total-Count', count.toString());
      return res.json(posts);
    }
  }

  @Put('like/:id')
  async likePost(@Param('id') postId: string) {
    // Incrémente likesCount atomiquement
    return this.postsService.incrementLikesCount(postId);
  }


  @Put('unlike/:id')
  async unlikePost(@Param('id') postId: string) {
    // Décrémente likesCount atomiquement
    return this.postsService.decrementLikesCount(postId);
  }

  // Route non sécurisée pour récupérer un post par son id (public)
  @Get('public/:id')
  async getPublicPost(@Param('id') postId: string) {
    return this.postsService.getPublicPostById(postId);
  }

//   @UseGuards(JwtAuthGuard)
//   @Get('search') // Changed from HttpPost to Get if criteria are passed as query params
//   async searchPosts(
//     @Query() criteria: SearchPostsByCriteriaDto, // Use @Query to get criteria from query parameters
//     @Request() req,
//   ) {
//     const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub;
//     const authenticatedUserId = userIdRaw ? new Types.ObjectId(userIdRaw.toString()) : undefined;

//     // SiteId is now optional in DTO. If it's required for this GET endpoint,
//     // the check should remain, otherwise it can be removed or made conditional.
//     // For instance, if siteId or siteName must be present:
//     if (!criteria.siteId && !criteria.siteName) {
//       throw new BadRequestException('Either siteId or siteName must be provided.');
//     }
//     if (criteria.siteId && (typeof criteria.siteId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(criteria.siteId))) {
//       throw new BadRequestException('Provided siteId is invalid.');
//     }

//     return this.postsService.searchPostsByCriteria(criteria);
//   }
 }
