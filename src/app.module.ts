import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './entity/users/user.schema';
import { MessageSchema } from './entity/messages/message.schema';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import * as dotenv from 'dotenv';
// import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importer ici
import { MongooseModuleOptions } from '@nestjs/mongoose'; // Importer les options de MongooseModule
import { MongooseOptionsFactory } from '@nestjs/mongoose'; // Importer l'interface pour les options de MongooseModule
import { GatewayModule } from './chat/gateway.module';
import { BotModule } from './bot/bot.module';
import { PaymentModule } from './payment/payment.module';

import { SiteModule } from './site/site.module';
import { MessageForumModule } from './messages/message_forum.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { PortfolioModule } from './portfolio/portfolio.module'; // Ajouté pour exposer les routes portfolio
import { TemplateModule } from './template/template.module';
import { SuggestionModule } from './suggestion';
import { ProjectModule } from './project/project.module'; // Importer ProjectModule
import { ProjetModule } from './projet/projet.module'; // Importer ProjetModule
import { UploadController } from './upload/upload.controller';
import { VisitModule } from './visit/visit.module'; // Ajout du module de tracking visite
import { ServiceModule } from './service/service.module'; // Importer le module de service
@Module({
  imports: [
      // Charger le module de configuration en premier.
    // .env sera chargé automatiquement par forRoot() si le package dotenv est installé.
    ConfigModule.forRoot({
      isGlobal: true, // Rend ConfigService disponible globalement sans avoir à l'importer partout
      // ignoreEnvFile: false, // Par défaut, charge .env si present
      // envFilePath: '.env', // Chemin par défaut
    }),
    // Utiliser forRootAsync pour pouvoir injecter ConfigService et charger l'URI de manière asynchrone
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Importer ConfigModule ici si isGlobal: false ci-dessus
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'), // Lire l'URI depuis la variable d'environnement
        // Vous pouvez aussi lire d'autres options de Mongoose ici
         useNewUrlParser: true,
         useUnifiedTopology: true,
      }),
      inject: [ConfigService], // Injecter ConfigService dans la useFactory
    }),
    AuthModule,
    MessagesModule,
    UsersModule,
    GatewayModule,
    BotModule,
    PaymentModule,
    SiteModule,
    MessageForumModule,
    PostsModule,
    CommentsModule,
    PortfolioModule, // Ajouté ici pour activer les routes portfolio
    TemplateModule, // Ajouté pour activer les routes template
    SuggestionModule,
    ProjectModule, // Ajouté ici pour activer les routes projet
    ProjetModule, // Ajouté ici pour activer les routes projet
    VisitModule, // Ajouté ici pour activer le tracking des visites
    ServiceModule, // Ajouté pour activer les routes de service
  ],
  controllers: [AppController, UploadController],
  providers: [AppService],
})
export class AppModule {}
