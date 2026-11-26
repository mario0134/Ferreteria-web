import { Controller, Get, Post, Param, Query, Body, Req, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller()
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Post('inventory/entries')
  registerEntry(
    @Req() req: any,
    @Body()
    body: {
      product_id?: number;
      quantity?: number;
      reference?: string;
      user_id?: number;
    },
  ) {
    const productId = Number(body?.product_id);
    const quantity = Number(body?.quantity);
    if (!productId || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Debe indicar product_id válido y quantity entera mayor a 0');
    }
    return this.operationsService.registerEntry({
      product_id: productId,
      quantity,
      reference: body?.reference?.trim() || 'Entrada de inventario',
      user_id: req.user?.id ?? (body?.user_id ? Number(body.user_id) : undefined),
    });
  }

  @Get('inventory/movements')
  getMovements(
    @Query('type') type?: string,
    @Query('product_id') productId?: string,
  ) {
    return this.operationsService.getMovements({
      type: type?.trim().toUpperCase(),
      product_id: productId ? Number(productId) : undefined,
    });
  }

  @Get('inventory/low-stock')
  getLowStock() {
    return this.operationsService.getLowStock();
  }

  @Get('customers')
  getCustomers(@Query('search') search?: string) {
    return this.operationsService.getCustomers(search);
  }

  @UseGuards(JwtAuthGuard)
  @Post('customers')
  createCustomer(@Body() body: { name?: string; phone?: string; email?: string }) {
    if (!body?.name?.trim()) {
      throw new BadRequestException('El nombre del cliente es obligatorio');
    }
    return this.operationsService.createCustomer({
      name: body.name.trim(),
      phone: body?.phone?.trim() || undefined,
      email: body?.email?.trim() || undefined,
    });
  }

  @Get('suppliers')
  getSuppliers(@Query('search') search?: string) {
    return this.operationsService.getSuppliers(search);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Post('suppliers')
  createSupplier(
    @Body()
    body: {
      name?: string;
      contact_name?: string;
      phone?: string;
      email?: string;
      address?: string;
    },
  ) {
    if (!body?.name?.trim()) {
      throw new BadRequestException('El nombre o razón social del proveedor es obligatorio');
    }
    return this.operationsService.createSupplier({
      name: body.name.trim(),
      contact_name: body?.contact_name?.trim() || undefined,
      phone: body?.phone?.trim() || undefined,
      email: body?.email?.trim() || undefined,
      address: body?.address?.trim() || undefined,
    });
  }

  @Get('reports/summary')
  getSummary() {
    return this.operationsService.getSummary();
  }

  @Get('reports/detailed')
  getDetailedReport() {
    return this.operationsService.getDetailedReport();
  }

  @Get('health/db')
  healthDb() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('check/:id')
  checkId(@Param('id', ParseIntPipe) id: number) {
    return { id };
  }
}
