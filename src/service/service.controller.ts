import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users/:userId/services')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async getAll(@Param('userId') userId: string) {
    return this.serviceService.getServicesByUser(userId);
  }

  @Post()
  async create(@Param('userId') userId: string, @Body() dto: any) {
    return this.serviceService.createServices(userId, dto);
  }

  @Patch(':serviceId')
  async update(@Param('userId') userId: string, @Param('serviceId') serviceId: string, @Body() dto: any) {
    return this.serviceService.updateService(serviceId, dto);
  }

  @Delete(':serviceId')
  async delete(@Param('userId') userId: string, @Param('serviceId') serviceId: string) {
    return this.serviceService.deleteService(serviceId);
  }
}
