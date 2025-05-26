import { Controller, Post, Body, UseGuards, Request, Get, UseInterceptors, UploadedFile } from '@nestjs/common';
import { SiteService } from './site.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @UseGuards(JwtAuthGuard)
  @Post('save')
  @UseInterceptors(FileInterceptor('service_image', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads/services');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `service_${Date.now()}_${uuidv4()}${ext}`;
        cb(null, filename);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(null, false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  }))
  @UseGuards(JwtAuthGuard)
  async saveSite(
    @Request() req,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const user = req.user;
    // Correction : extraire l'ID utilisateur depuis le JWT (userId ou sub)
    const userId = user.userId || user.sub || user._id || user.id;
    let finalImagePath = undefined;
    if (file) {
      // Déplace l'image uploadée dans le bon dossier public/uploads/username/
      const username = user.email;
      const destDir = path.join(process.cwd(), 'public', 'uploads', username.toString());
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const srcPath = file.path;
      const fileName = path.basename(file.filename);
      const destPath = path.join(destDir, fileName);
      fs.copyFileSync(srcPath, destPath);
      finalImagePath = `/uploads/${username}/${fileName}`;
      body.service_image = finalImagePath;
    }
    // Correction ici : forcer le champ user à être un id (string ou ObjectId)
    body.user = userId;
    const result = await this.siteService.createOrUpdateSite({ ...user, _id: userId }, body);
    return { success: true, ...result };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySite(@Request() req) {
    const user = req.user;
    const site = await this.siteService.getSiteByUser((user as any)._id ? (user as any)._id : user.id);
    return { site };
  }
}
