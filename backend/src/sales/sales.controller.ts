import { Controller, Get, Post, Param, Body, Req, UseGuards, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { SalesService, CreateSaleItemInput, PaymentMethodType } from './sales.service';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      sale_code?: string;
      customer_id?: number;
      user_id?: number;
      payment_method?: string;
      items?: CreateSaleItemInput[];
    },
  ) {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('La venta debe incluir al menos un ítem en items');
    }

    const rawMethod = (body?.payment_method || 'EFECTIVO').toString().trim().toUpperCase();
    if (rawMethod !== 'EFECTIVO' && rawMethod !== 'QR') {
      throw new BadRequestException('El método de pago solo puede ser EFECTIVO o QR');
    }

    const normalizedItems: CreateSaleItemInput[] = body.items.map((item) => {
      const productId = Number(item?.product_id);
      const quantity = Number(item?.quantity);
      if (!productId || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException('Cada ítem debe tener product_id válido y quantity entera mayor a 0');
      }
      return { product_id: productId, quantity };
    });

    const saleCode =
      body.sale_code && body.sale_code.trim()
        ? body.sale_code.trim()
        : `VTA-${Date.now()}`;

    return this.salesService.create(saleCode, normalizedItems, {
      customer_id: body?.customer_id ? Number(body.customer_id) : undefined,
      user_id: req.user?.id ?? (body?.user_id ? Number(body.user_id) : undefined),
      payment_method: rawMethod as PaymentMethodType,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { user_id?: number }) {
    return this.salesService.cancel(id, req.user?.id ?? (body?.user_id ? Number(body.user_id) : undefined));
  }
}
