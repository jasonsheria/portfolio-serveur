import {Module, forwardRef} from '@nestjs/common'
import { UsersModule } from 'src/users/users.module'
import { MessagesModule } from 'src/messages/messages.module'
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
@Module({
    imports :[forwardRef(() => MessagesModule), UsersModule],
    controllers :[BotController],
    providers : [BotService, BotController],
    exports : [BotService]
})
export class BotModule{}