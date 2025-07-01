import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { UsersModule } from '../users/users.module';
import { Site, SiteSchema } from '../entity/site/site.schema';
import { Media, MediaSchema } from '../entity/media/media.schema';
import { OfferedService, OfferedServiceSchema } from '../entity/service/service.schema';
import { Post, PostSchema } from '../entity/posts/post.schema'; // Import Post schema
import { Category, CategorySchema } from '../entity/posts/category.schema'; // Import Category schema
import { Tag, TagSchema } from '../entity/posts/tag.schema'; // Import Tag schema
import { Template, TemplateSchema } from '../entity/template/template.schema'; // Import Template schema
import { Portfolio, PortfolioSchema } from '../entity/portfolio/portfolio.schema'; // Import Portfolio schema
import { Message, MessageSchema } from '../entity/messages/message.schema'; // Import Message schema
import { User, UserSchema } from '../entity/users/user.schema'; // Import User schema
import { Projet, ProjetSchema } from '../entity/projet/projet.schema'; // Import Project schema
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Template.name, schema: TemplateSchema }, // Add TemplateModel provider
      { name: Site.name, schema: SiteSchema },
      { name: Media.name, schema: MediaSchema },
      { name: 'OfferedService', schema: OfferedServiceSchema },
      { name: Post.name, schema: PostSchema }, // Add PostModel provider
      { name: Category.name, schema: CategorySchema }, // Add CategoryModel provider
      { name: Tag.name, schema: TagSchema }, // Add TagModel provider
      { name: Portfolio.name, schema: PortfolioSchema }, // Add PortfolioModel provider
      { name: Message.name, schema: MessageSchema }, // Add MessageModel provider
      { name: User.name, schema: UserSchema }, // Add UserModel provider
      { name: Projet.name, schema: ProjetSchema }, // Add ProjectModel provider
    ]),
    UsersModule,
  ],
  providers: [SiteService],
  controllers: [SiteController],
  exports: [SiteService, MongooseModule], // Ajout de l'export du MongooseModule pour Site
})
export class SiteModule {}
