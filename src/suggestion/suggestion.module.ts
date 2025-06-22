import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Suggestion, SuggestionSchema } from '../entity/suggestion/suggestion.schema';
import { SuggestionService } from './suggestion.service';
import { SuggestionController } from './suggestion.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Suggestion.name, schema: SuggestionSchema }]),
    forwardRef(() => UsersModule),
  ],
  providers: [SuggestionService],
  controllers: [SuggestionController],
})
export class SuggestionModule {}
