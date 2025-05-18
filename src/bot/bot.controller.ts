import { Controller, Post, Body } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
    constructor(private readonly botService: BotService) {}

    @Post('send')
    async sendBotMessage(@Body('message') message: string): Promise<{ response: string }> {
        const response = await this.botService.predilect(message);
        return { response };
    }
}
