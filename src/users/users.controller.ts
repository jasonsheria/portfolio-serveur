import { Controller, Put, Body, Param, UseGuards, UploadedFile, UseInterceptors, Req, BadRequestException, Delete, Get, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from './current-user.decorator';

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
    console.log('[BACKEND][deleteAccount] req.user =', req.user);
    // L'utilisateur authentifié est injecté par le guard JWT
    const user = req.user;
const userId = user._id || user.userId || user.id || user.sub;
if (!user || !userId) {
  throw new BadRequestException('Utilisateur non authentifié.');
}
const userDb = await this.usersService.findByIdWithPassword(userId.toString());
    if (!userDb) {
      throw new BadRequestException('Utilisateur non trouvé.');
    }
    // Vérification du mot de passe (utilise la méthode comparePassword d'AuthService)
    const isValid = await this.authService.comparePassword(password, userDb.password);
    if (!isValid) {
      throw new BadRequestException('Mot de passe incorrect.');
    }
    // Suppression de l'utilisateur et de ses données liées
    await this.usersService.deleteUserAndRelatedData(userId.toString());
    return { message: 'Compte supprimé avec succès.' };
  }

  // --- ADMIN CRUD ---
  @UseGuards(JwtAuthGuard)
  @Get('admins')
  async getAllAdmins() {
    return this.usersService.findAllAdmins();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admins/:id')
  async getAdminById(@Param('id') id: string) {
    return this.usersService.findAdminById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.updateAdmin(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admins/:id')
  async deleteAdmin(
    @Param('id') id: string,
    @Body('password') password: string,
    @CurrentUser() user: any
  ) {
    if (!password) {
      return { message:'Le mot de passe de confirmation est requis.' };
    }
    const currentAdminId = user && (user._id || user.id || user.userId || user.sub);
    if (!currentAdminId) {
      return { message:'Administrateur authentifié introuvable.' };
    }
    await this.usersService.deleteAdmin(id, password, currentAdminId);
    return { message: 'Administrateur supprimé avec succès.' };
  }
}
