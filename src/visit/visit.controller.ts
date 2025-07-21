import { Controller, Get, Req, Post, Query } from '@nestjs/common';
import { VisitService } from './visit.service';
import { Request } from 'express';

@Controller('track')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post('visit')
  async trackVisit(@Req() req: Request, @Query('site') siteId: string) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;
    if (!siteId) return { success: false, message: 'siteId manquant' };
    await this.visitService.trackVisit(ip, siteId);
    return { success: true };
  }

  // Affiche les visites à partir d'un id de template (site stocké dans Visit = id de template)
  @Get('visits')
  async getVisitsByTemplate(@Query('site') templateId: string) {
    if (!templateId) return { success: false, message: 'siteId manquant' };
    return this.visitService.getVisitsByTemplate(templateId);
  }
}
