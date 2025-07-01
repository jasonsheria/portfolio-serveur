import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Projet, ProjetSchema } from '../entity/projet/projet.schema';
import { ProjetService } from './projet.service';
import { ProjetController } from './projet.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Projet.name, schema: ProjetSchema }])],
  providers: [ProjetService],
  controllers: [ProjetController],
  exports: [ProjetService],
})
export class ProjetModule {}
