import { Controller, Put, Body, Param, UseGuards, UploadedFile, UseInterceptors, Req, BadRequestException, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // Route de mise à jour du profil utilisateur (hors email/password)
  @UseGuards(JwtAuthGuard)
  @Put('profile/:id')
  @UseInterceptors(FileInterceptor('profileFile'))
  async updateProfile(
    @Param('id') id: string,
    @Body() updateData: any,
    @UploadedFile() profileFile?: any, // Correction: utiliser 'any' pour éviter l'erreur de type
    @Req() req?: any
  ) {
    // Sécurité : l'utilisateur ne peut mettre à jour que son propre profil
    if (req.user && req.user._id && req.user._id.toString() !== id) {
      throw new BadRequestException('Vous ne pouvez modifier que votre propre profil.');
    }
    // Ajout du fichier uploadé si présent
    if (profileFile) {
      updateData.profileFile = profileFile;
    }
    return this.usersService.updateUser(id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('api/delete-account')
  async deleteAccount(@Req() req, @Body('password') password: string) {
    // L'utilisateur authentifié est injecté par le guard JWT
    const user = req.user;
    if (!user || !user._id) {
      throw new BadRequestException('Utilisateur non authentifié.');
    }
    // On récupère l'utilisateur complet (pour le hash du mot de passe)
    const userDb = await this.usersService.findByIdWithPassword(user._id.toString());
    if (!userDb) {
      throw new BadRequestException('Utilisateur non trouvé.');
    }
    // Vérification du mot de passe (utilise la méthode comparePassword d'AuthService)
    const isValid = await this.authService.comparePassword(password, userDb.password);
    if (!isValid) {
      throw new BadRequestException('Mot de passe incorrect.');
    }
    // Suppression de l'utilisateur et de ses données liées
    await this.usersService.deleteUserAndRelatedData(user._id.toString());
    return { message: 'Compte supprimé avec succès.' };
  }
}
