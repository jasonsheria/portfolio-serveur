import { Controller, Get, Post, Delete, Body, Param, Query, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  async create(@Body() body: any) {
    if (!body.user || !body.site) {
      throw new BadRequestException('Paramètres obligatoires manquants');
    }
    return this.portfolioService.createPortfolio(body);
  }

  @Get("getAll")
  async findAll(@Query() query: any) {
    if (!query.user || !query.site) {
      throw new BadRequestException('user et site sont obligatoires');
    }
    return this.portfolioService.getPortfolios(query);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.portfolioService.deletePortfolio(id);
    return { message: 'Portfolio supprimé' };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/upload/portfolio', // <-- persistent disk for portfolio uploads
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `portfolio_${Date.now()}${ext}`;
        cb(null, filename);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(null, false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    return { url: `/uploads/portfolio/${file.filename}` };
  }
}
