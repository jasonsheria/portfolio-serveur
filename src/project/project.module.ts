import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Projet, ProjetSchema } from '../entity/projet/projet.schema';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Projet.name, schema: ProjetSchema }])],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
})
export class ProjetModule {}
