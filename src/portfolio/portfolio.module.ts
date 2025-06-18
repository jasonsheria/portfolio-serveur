import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Portfolio, PortfolioSchema } from '../entity/portfolio/portfolio.schema';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Portfolio.name, schema: PortfolioSchema }])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
