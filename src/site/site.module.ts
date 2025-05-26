import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { UsersModule } from '../users/users.module';
import { Site, SiteSchema } from '../entity/site/site.schema';
import { Media, MediaSchema } from '../entity/media/media.schema';
import { OfferedService, OfferedServiceSchema } from '../entity/service/service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Site.name, schema: SiteSchema },
      { name: Media.name, schema: MediaSchema },
      { name: 'OfferedService', schema: OfferedServiceSchema },
    ]),
    UsersModule,
  ],
  providers: [SiteService],
  controllers: [SiteController],
  exports: [SiteService],
})
export class SiteModule {}
