import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './visit.schema';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { Template, TemplateSchema } from '../entity/template/template.schema';
@Module({
  imports: [MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }, {name: Template.name, schema: TemplateSchema}])],
  providers: [VisitService],
  controllers: [VisitController],
  exports: [VisitService],
})
export class VisitModule {}
