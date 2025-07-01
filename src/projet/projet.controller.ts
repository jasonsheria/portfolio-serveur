import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ProjetService } from './projet.service';
import { Projet } from '../entity/projet/projet.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projet/api')
export class ProjetController {
  constructor(private readonly projetService: ProjetService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add-project')
  async addProject(@Body() body: Partial<Projet>, @Request() req,) {
    // Ajoute l'id utilisateur à partir du token
     const users = req.user;
    // Correction : extraire l'ID utilisateur depuis le JWT (userId ou sub)
    const user = users.userId || users.sub || users._id || users.id;
    
    if (!user) throw new Error('Utilisateur non authentifié');
    const projet = await this.projetService.createProjet({ ...body, user });
    return { project: projet };
  }
}
