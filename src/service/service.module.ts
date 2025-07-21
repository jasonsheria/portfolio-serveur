import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferedService, OfferedServiceSchema } from '../entity/service/service.schema';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OfferedService.name, schema: OfferedServiceSchema },
    ]),
  ],
  providers: [ServiceService],
  controllers: [ServiceController],
  exports: [ServiceService],
})
export class ServiceModule {}
