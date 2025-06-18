// src/auth/auth.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module'; // Assurez-vous que ce chemin est correct
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importer ConfigModule et ConfigService
import { JwtStrategy } from './strategies/jwt.strategy'; // Votre JwtStrategy
import { UsersService } from 'src/users/users.service'; // Assurez-vous que ce chemin est correct
import { GatewayModule } from '../chat/gateway.module'; // Importer le module qui exporte ChatGateway
@Module({
  imports: [
    forwardRef(() => UsersModule), // Correction ici
    PassportModule.register({ defaultStrategy: 'jwt' }), // Définir la stratégie par défaut si ce n'est pas déjà fait
    ConfigModule, // Assurez-vous que ConfigModule est global ou importé ici
    JwtModule.registerAsync({
      imports: [ConfigModule], // Pour pouvoir injecter ConfigService
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '2h' }, // <-- Durée augmentée à 2h
      }),
      inject: [ConfigService],
    }),
    GatewayModule, // <-- Ajout ici pour fournir ChatGateway
  ],
  providers: [AuthService, JwtStrategy, UsersService], // UsersService est déjà dans UsersModule mais peut être listé si directement utilisé ici pour clarté
  controllers: [AuthController],
  exports: [AuthService, JwtModule], // Exporter JwtModule si d'autres modules en ont besoin
})
export class AuthModule {}