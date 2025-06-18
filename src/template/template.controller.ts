import { Controller, Post, Get, Param, Body, UploadedFiles, UseInterceptors, Req, BadRequestException, Patch, Delete, Query } from '@nestjs/common';
import { TemplateService } from './template.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

@Controller('template')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post('create')
  @UseInterceptors(FilesInterceptor('images', 3))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req: Request
  ) {
    const userId = body.userId;
    const siteId = body.siteId;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    if (!siteId) throw new BadRequestException('Site manquant');
    return this.templateService.createTemplate(body, files, userId, siteId);
  }

  @Post('site')
  async getBySite(@Body() body: any) {
    const siteId = body.siteId;
    if (!siteId) throw new BadRequestException('Site manquant');
    return this.templateService.getTemplatesBySite(siteId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    if (id === 'getall') {
      // Redirige vers la vraie méthode getAllTemplates si l'URL est /template/getall
      return this.getAllTemplates();
    }
    console.log('[BACKEND][TemplateController] getOne called with id:', id);
    return this.templateService.getTemplate(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: any) {
    const { userId, password } = body;
    if (!userId || !password) throw new BadRequestException('Utilisateur ou mot de passe manquant');
    await this.templateService.deleteTemplate(id, userId, password);
    return { message: 'Template supprimé' };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updated = await this.templateService.updateTemplate(id, body);
    return updated;
  }
  
  // Nouvelle route pour lister les templates publics filtrés par type
  @Get()
  async getPublicTemplatesByType(@Query('type') type: string, @Query('isPublic') isPublic: string) {
    // isPublic peut être 'true' ou 'false' en string
    const isPublicBool = isPublic =='true';
    return this.templateService.getPublicTemplatesByType(type, isPublicBool);
  }
  // ajouter une autre fonction qui returne tous les templates sans condition
  @Get('getall')
  async getAllTemplates() {
    console.log('[BACKEND][TemplateController] getAllTemplates called');
    return this.templateService.getAllTemplates();
  }
}
