import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface CreateSaleItemInput {
  product_id: number;
  quantity: number;
}

export type PaymentMethodType = 'EFECTIVO' | 'QR';

@Injectable()
export class SalesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const sql = `
      SELECT s.id, s.sale_code, s.subtotal, s.total, s.status, s.payment_method, s.created_at,
             c.name AS customer_name, u.name AS seller_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
    `;
    const result = await this.pool.query(sql);
    return result.rows;
  }

  async findOne(id: number) {
    const saleRes = await this.pool.query(
      `SELECT s.id, s.sale_code, s.subtotal, s.total, s.status, s.payment_method, s.created_at,
              c.name AS customer_name, u.name AS seller_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [id],
    );
    if (saleRes.rows.length === 0) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }

    const itemsRes = await this.pool.query(
      `SELECT si.id, si.product_id, p.code AS product_code, p.name AS product_name,
              si.quantity, si.unit_price, si.line_total
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1
       ORDER BY si.id ASC`,
      [id],
    );

    return {
      ...saleRes.rows[0],
      items: itemsRes.rows,
    };
  }

  async create(
    saleCode: string,
    items: CreateSaleItemInput[],
    meta?: { customer_id?: number; user_id?: number; payment_method?: PaymentMethodType },
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const resolvedItems: Array<{
        product_id: number;
        quantity: number;
        unit_price: number;
        line_total: number;
      }> = [];

      let subtotal = 0;

      for (const item of items) {
        const prodRes = await client.query(
          'SELECT id, name, sale_price, stock, is_active FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id],
        );

        if (prodRes.rows.length === 0) {
          throw new NotFoundException(`Producto con id ${item.product_id} no encontrado`);
        }

        const product = prodRes.rows[0];
        if (!product.is_active) {
          throw new BadRequestException(`El producto ${product.name} está inactivo`);
        }

        const currentStock = Number(product.stock);
        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}: disponible ${currentStock}, solicitado ${item.quantity}`,
          );
        }

        const unitPrice = Number(product.sale_price);
        const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
        subtotal = Number((subtotal + lineTotal).toFixed(2));

        resolvedItems.push({
          product_id: product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });
      }

      const paymentMethod: PaymentMethodType = meta?.payment_method === 'QR' ? 'QR' : 'EFECTIVO';

      const saleRes = await client.query(
        `INSERT INTO sales (sale_code, subtotal, total, status, payment_method, customer_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, sale_code, subtotal, total, status, payment_method, customer_id, user_id, created_at`,
        [saleCode, subtotal, subtotal, 'COMPLETED', paymentMethod, meta?.customer_id ?? null, meta?.user_id ?? null],
      );
      const sale = saleRes.rows[0];

      for (const line of resolvedItems) {
        await client.query(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)',
          [sale.id, line.product_id, line.quantity, line.unit_price, line.line_total],
        );

        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [line.quantity, line.product_id],
        );

        await client.query(
          'INSERT INTO inventory_movements (product_id, movement_type, quantity, reference, user_id) VALUES ($1, $2, $3, $4, $5)',
          [line.product_id, 'OUT', line.quantity, `Venta ${sale.sale_code} (${paymentMethod})`, meta?.user_id ?? null],
        );
      }

      await client.query('COMMIT');
      return { ...sale, items: resolvedItems };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err?.code === '23505') {
        throw new ConflictException('Ya existe una venta con ese código');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async cancel(id: number, userId?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const saleRes = await client.query(
        'SELECT id, sale_code, status FROM sales WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (saleRes.rows.length === 0) {
        throw new NotFoundException(`Venta con id ${id} no encontrada`);
      }
      const sale = saleRes.rows[0];
      if (sale.status === 'CANCELLED') {
        throw new BadRequestException(`La venta ${sale.sale_code} ya se encuentra anulada`);
      }

      const itemsRes = await client.query(
        'SELECT product_id, quantity FROM sale_items WHERE sale_id = $1',
        [id],
      );

      for (const item of itemsRes.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id],
        );

        await client.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference, user_id)
           VALUES ($1, 'IN', $2, $3, $4)`,
          [item.product_id, item.quantity, `Anulación venta ${sale.sale_code}`, userId ?? null],
        );
      }

      const updRes = await client.query(
        "UPDATE sales SET status = 'CANCELLED' WHERE id = $1 RETURNING id, sale_code, subtotal, total, status",
        [id],
      );

      await client.query('COMMIT');
      return updRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
