import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessagesService } from './messages.service'; // Assurez-vous que le service est correctement importé
import { botDTO } from '../bot/dto/bot.dto'; // Assurez-vous que le DTO est correctement importé
import { BotService } from '../bot/bot.service';

@Controller('messages')
export class MessagesController {
    constructor(
        private readonly messagesService: MessagesService, // Remplacez 'any' par le type approprié
        private readonly botService: BotService, // Assurez-vous que le service Bot est injecté si nécessaire
    ) {}

    @Post('send')
    async sendMessage(@Body() messageDto: botDTO): Promise<{ response: string }> {
        // Récupérer le message utilisateur
        const message = messageDto.message;
        // Appeler le service bot pour obtenir la réponse prédictive
        const response = await this.botService.predilect(message);
        // (Optionnel) Vous pouvez enregistrer la question/réponse en base ici via messagesService
        // await this.messagesService.create({ text: message, response });
        // Retourner la réponse au frontend
        return { response };
    }
}
