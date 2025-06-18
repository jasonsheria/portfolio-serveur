import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { UsersModule } from '../users/users.module'; // Importer le module des utilisateurs si nécessaire
// Importer d'autres modules nécessaires ici
// Par exemple, si vous avez besoin de gérer des conversations, importez le module ConversationModule
// ou tout autre module pertinent
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from '../entity/messages/message.schema';
import { User, UserSchema } from '../entity/users/user.schema';
import { BotModule } from '../bot/bot.module'; // Importer le module Bot si MessagesService utilise des services de bot
@Module({
  imports: [
    // 3. Configurer MongooseModule pour ce module
    //    forFeature() rend les modèles listés ici disponibles pour l'injection dans ce module.
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
      // Si vous utilisez d'autres modèles (comme Conversation) dans ce service, ajoutez-les ici aussi :
      // { name: Conversation.name, schema: ConversationSchema },
    ]),
    // AuthModule, // Si MessagesService utilise des services d'authentification, importez AuthModule ici
    UsersModule, // Si MessagesService utilise des services d'utilisateurs, importez UsersModule ici
    forwardRef(() => BotModule), // Si MessagesService utilise des services de bot, importez BotModule ici avec forwardRef
    // Si MessagesService utilise des services d'autres modules, importez ces modules ici
    // par exemple, si canAccessConversation interagit avec des utilisateurs, vous pourriez avoir besoin d'importer un UsersModule
    // UsersModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService], // Si vous souhaitez que d'autres modules puissent utiliser MessagesService, décommentez cette ligne
})
export class MessagesModule {}
