import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Suggestion } from './suggestion.schema';
import { UsersService } from '../users/users.service';
import { sendSuggestionNotification } from './suggestion.mailer';

@Injectable()
export class SuggestionService {
  constructor(
    @InjectModel(Suggestion.name) private suggestionModel: Model<Suggestion>,
    private readonly usersService: UsersService,
  ) {}

  async create(data: Partial<Suggestion>): Promise<Suggestion> {
    console.log('[SUGGESTION] Début création suggestion', data);
    const suggestion = new this.suggestionModel({
      ...data,
      requestedAt: data.requestedAt || new Date(),
    });
    const saved = await suggestion.save();
    console.log('[SUGGESTION] Suggestion sauvegardée en base', saved);

    // Envoi d'email de notification si userId fourni
    if (data.userId) {
      try {
        const user = await this.usersService.findById(data.userId as string);
        console.log('[SUGGESTION] Utilisateur destinataire trouvé :', user);
        if (user && user.email) {
          await sendSuggestionNotification(user.email, {
            senderFirstName: data.firstName || '',
            senderLastName: data.lastName || '',
            message: data.message || '',
            source: data.source || '',
            phone: data.phone || '',
            email: data.email || ''
          });
          console.log('[SUGGESTION] Email de notification envoyé à', user.email);
        } else {
          console.log('[SUGGESTION] Aucun email trouvé pour le destinataire');
        }
      } catch (e) {
        console.error('[SUGGESTION] Erreur lors de l\'envoi de l\'email de notification :', e);
      }
    }
    return saved;
  }

  async findByUserId(userId: string): Promise<Suggestion[]> {
    return this.suggestionModel.find({ userId }).exec();
  }
}
