import { forwardRef, Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { MessagesModule } from "../messages/messages.module";
import { BotModule } from "../bot/bot.module"; // Importer le module Bot si nécessaire
import { MessageForumModule } from '../messages/message_forum.module';
@Module({
        imports: [forwardRef(() => AuthModule), UsersModule, MessagesModule, BotModule, MessageForumModule],
        providers: [ChatGateway],
        exports: [ChatGateway],

})
export class GatewayModule{
  
 
    
}