import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  create(@Body() body: { name?: string; description?: string }) {
    if (!body?.name || !body.name.trim()) {
      throw new BadRequestException('El nombre de la categoría es obligatorio');
    }
    return this.categoriesService.create(body.name.trim(), body.description?.trim());
  }
}
