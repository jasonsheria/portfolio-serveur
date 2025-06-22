import { Body, Controller, Post, Query, Get } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { Suggestion } from './suggestion.schema';

@Controller('suggest')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {
    console.log('[SUGGESTION] Contrôleur instancié');
  }

  @Post('/messages')
  async createSuggestion(@Body() body: Partial<Suggestion>) {
    console.log('[SUGGESTION] Requête reçue pour enregistrement :', body);
    const created = await this.suggestionService.create(body);
    console.log('[SUGGESTION] Suggestion enregistrée :', created);
    return { message: 'Suggestion enregistrée', suggestion: created };
  }

  @Post()
  async getSuggestionsByUserId(@Body('userId') userId: string) {
    if (!userId) {
      return { message: 'userId requis', suggestions: [] };
    }
    const suggestions = await this.suggestionService.findByUserId(userId);
    return { suggestions };
  }

  @Get()
  async getSuggestionsByUserIdQuery(@Query('userId') userId: string) {
    if (!userId) {
      return { message: 'userId requis', suggestions: [] };
    }
    const suggestions = await this.suggestionService.findByUserId(userId);
    return { suggestions };
  }
}
