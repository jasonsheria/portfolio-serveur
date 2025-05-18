import { forwardRef, Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { MessagesModule } from "../messages/messages.module";
import { BotModule } from "../bot/bot.module"; // Importer le module Bot si nécessaire
@Module({
        imports: [forwardRef(() => AuthModule), UsersModule, MessagesModule, BotModule],
        providers: [ChatGateway],
        exports: [ChatGateway],

})
export class GatewayModule{
  
 
    
}