// src/users/users.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserSchema } from '../entity/users/user.schema';
import { Payment, PaymentSchema } from '../entity/payment/payment.schema';
import { MongooseModule } from '@nestjs/mongoose'; // 1. Importer MongooseModule
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module'; // Importer AuthModule ici

@Module({
  imports: [
    // 4. Configurer MongooseModule pour ce module spécifique.
    //    forFeature() rend les modèles listés disponibles POUR L'INJECTION DANS CE MODULE.
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema }, // Ajout du modèle Payment
      // Si d'autres modèles sont utilisés dans ce module, ajoutez-les ici aussi :
      // { name: AnotherEntity.name, schema: AnotherEntitySchema },
    ]),
    forwardRef(() => AuthModule), // Correction ici
    // 5. Importer d'autres modules dont UsersService ou UsersController dépendent
    //    (par exemple, si votre contrôleur utilise un service d'authentification, ou si votre service utilisateur a besoin d'une config, etc.)
    // ConfigModule, // Exemple si vous utilisez @nestjs/config
    // AuthModule, // Exemple si vous injectez AuthService dans UsersService ou UsersController
  ],
   controllers: [UsersController], // Si vous avez un contrôleur pour gérer les utilisateurs
  providers: [UsersService],
  exports: [UsersService, MongooseModule], // Exportez aussi MongooseModule pour exposer le provider UserModel
})
export class UsersModule {}