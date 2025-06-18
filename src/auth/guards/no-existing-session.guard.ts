// src/auth/guards/no-existing-session.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NoExistingSessionGuard implements CanActivate {
  private readonly logger = new Logger(NoExistingSessionGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        try {
          await this.jwtService.verifyAsync(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });
          // Si la vérification réussit, une session est active
          this.logger.warn('Tentative de connexion Google alors qu\'une session formulaire est active.');
          throw new ForbiddenException(
            'Vous êtes déjà connecté. Veuillez vous déconnecter avant de vous connecter avec Google.',
          );
        } catch (error) {
          // Token invalide ou expiré -> pas de session active valide, on permet de continuer
          this.logger.verbose(`Token existant invalide : ${error.message}. Autorisation de connexion Google.`);
          return true;
        }
      }
    }
    return true; // Pas d'en-tête Auth ou pas de Bearer token
  }
}