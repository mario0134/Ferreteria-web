import { Controller, Get, Post, Patch, Param, Body, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Post()
  create(
    @Body()
    body: {
      code?: string;
      name?: string;
      description?: string;
      category_id?: number;
      purchase_price?: number;
      sale_price?: number;
      stock?: number;
      min_stock?: number;
    },
  ) {
    if (!body?.code?.trim() || !body?.name?.trim() || !body?.category_id) {
      throw new BadRequestException('Código, nombre y categoría son obligatorios');
    }
    return this.productsService.create({
      code: body.code.trim(),
      name: body.name.trim(),
      description: body?.description?.trim(),
      category_id: Number(body.category_id),
      purchase_price: Number(body?.purchase_price ?? 0),
      sale_price: Number(body?.sale_price ?? 0),
      stock: Number(body?.stock ?? 0),
      min_stock: Number(body?.min_stock ?? 5),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      category_id?: number;
      purchase_price?: number;
      sale_price?: number;
      min_stock?: number;
    },
  ) {
    return this.productsService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { is_active?: boolean }) {
    if (typeof body?.is_active !== 'boolean') {
      throw new BadRequestException('Debe indicar is_active como booleano (true o false)');
    }
    return this.productsService.setStatus(id, body.is_active);
  }
}
