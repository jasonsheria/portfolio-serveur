import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users/:userId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async getAll(@Param('userId') userId: string) {
    return this.projectService.findAllByUser(userId);
  }

  @Post()
  async create(@Param('userId') userId: string, @Body() dto: any) {
    return this.projectService.create(userId, dto);
  }

  @Patch(':projectId')
  async update(@Param('userId') userId: string, @Param('projectId') projectId: string, @Body() dto: any) {
    return this.projectService.update(userId, projectId, dto);
  }

  @Delete(':projectId')
  async delete(@Param('userId') userId: string, @Param('projectId') projectId: string) {
    return this.projectService.delete(userId, projectId);
  }
}
