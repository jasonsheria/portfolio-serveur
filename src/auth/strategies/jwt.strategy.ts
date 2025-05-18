// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config'; // Pour utiliser ConfigService pour le secret
// Adaptez le chemin vers votre entité User
import { User } from '../../entity/users/user.schema'; // Assurez-vous que le chemin est correct
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService, // Injectez ConfigService
    ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'), // Utiliser ConfigService
    });
  }

  async validate(payload: any): Promise<Partial<User>> { // Le type de retour peut être plus générique si besoin
    // authService.validateUser gère maintenant les payloads temporaires et standards
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('Token invalide ou utilisateur non trouvé.');
    }
    return user; // Attache l'objet utilisateur (de la DB ou virtuel) à req.user
  }
}