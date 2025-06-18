import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Template, TemplateSchema } from '../entity/template/template.schema';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }]),
    UsersModule,
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
