import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class OperationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async registerEntry(input: {
    product_id: number;
    quantity: number;
    reference: string;
    user_id?: number;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const prodRes = await client.query(
        'SELECT id, code, name, stock, is_active FROM products WHERE id = $1 FOR UPDATE',
        [input.product_id],
      );
      if (prodRes.rows.length === 0) {
        throw new NotFoundException(`Producto con id ${input.product_id} no encontrado`);
      }
      const product = prodRes.rows[0];
      if (!product.is_active) {
        throw new BadRequestException(`El producto ${product.name} está inactivo`);
      }

      const updRes = await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING id, code, name, stock, min_stock',
        [input.quantity, input.product_id],
      );

      const movRes = await client.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference, user_id)
         VALUES ($1, 'IN', $2, $3, $4)
         RETURNING id, product_id, movement_type, quantity, reference, user_id, created_at`,
        [input.product_id, input.quantity, input.reference, input.user_id ?? null],
      );

      await client.query('COMMIT');
      return {
        product: updRes.rows[0],
        movement: movRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMovements(filters: { type?: string; product_id?: number }) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.type && (filters.type === 'IN' || filters.type === 'OUT')) {
      params.push(filters.type);
      conditions.push(`m.movement_type = $${params.length}`);
    }
    if (filters.product_id && Number.isInteger(filters.product_id) && filters.product_id > 0) {
      params.push(filters.product_id);
      conditions.push(`m.product_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT m.id, m.product_id, p.code AS product_code, p.name AS product_name,
             m.movement_type, m.quantity, m.reference, m.user_id, m.created_at
      FROM inventory_movements m
      JOIN products p ON p.id = m.product_id
      ${whereClause}
      ORDER BY m.id DESC
      LIMIT 100
    `;
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  async getLowStock() {
    const sql = `
      SELECT p.id, p.code, p.name, c.name AS category_name, p.stock, p.min_stock, p.sale_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE AND p.stock <= p.min_stock
      ORDER BY p.stock ASC, p.id ASC
    `;
    const res = await this.pool.query(sql);
    return res.rows;
  }

  async getCustomers(search?: string) {
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const res = await this.pool.query(
        'SELECT id, name, phone, email, is_active, created_at FROM customers WHERE is_active = TRUE AND (name ILIKE $1 OR COALESCE(phone, \'\') ILIKE $1) ORDER BY id ASC',
        [q],
      );
      return res.rows;
    }
    const res = await this.pool.query(
      'SELECT id, name, phone, email, is_active, created_at FROM customers WHERE is_active = TRUE ORDER BY id ASC',
    );
    return res.rows;
  }

  async createCustomer(input: { name: string; phone?: string; email?: string }) {
    const res = await this.pool.query(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id, name, phone, email, is_active, created_at',
      [input.name, input.phone ?? null, input.email ?? null],
    );
    return res.rows[0];
  }

  async getSuppliers(search?: string) {
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const res = await this.pool.query(
        'SELECT id, name, contact_name, phone, email, address, is_active, created_at FROM suppliers WHERE is_active = TRUE AND (name ILIKE $1 OR COALESCE(contact_name, \'\') ILIKE $1) ORDER BY id ASC',
        [q],
      );
      return res.rows;
    }
    const res = await this.pool.query(
      'SELECT id, name, contact_name, phone, email, address, is_active, created_at FROM suppliers WHERE is_active = TRUE ORDER BY id ASC',
    );
    return res.rows;
  }

  async createSupplier(input: {
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) {
    const res = await this.pool.query(
      `INSERT INTO suppliers (name, contact_name, phone, email, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, contact_name, phone, email, address, is_active, created_at`,
      [input.name, input.contact_name ?? null, input.phone ?? null, input.email ?? null, input.address ?? null],
    );
    return res.rows[0];
  }

  async getSummary() {
    const [salesStats, prodStats, lowStockStats] = await Promise.all([
      this.pool.query(
        "SELECT COUNT(*)::int AS total_sales_count, COALESCE(SUM(total), 0)::numeric(12,2) AS total_sales_amount FROM sales WHERE status = 'COMPLETED'",
      ),
      this.pool.query(
        'SELECT COUNT(*)::int AS active_products_count FROM products WHERE is_active = TRUE',
      ),
      this.pool.query(
        'SELECT COUNT(*)::int AS low_stock_count FROM products WHERE is_active = TRUE AND stock <= min_stock',
      ),
    ]);

    return {
      total_sales_count: salesStats.rows[0].total_sales_count,
      total_sales_amount: salesStats.rows[0].total_sales_amount,
      active_products_count: prodStats.rows[0].active_products_count,
      low_stock_count: lowStockStats.rows[0].low_stock_count,
    };
  }

  async getDetailedReport() {
    const [salesByStatus, movByType, catalogDetail] = await Promise.all([
      this.pool.query(
        `SELECT status,
                COUNT(*)::int AS count,
                COALESCE(SUM(total), 0)::numeric(12,2) AS amount
         FROM sales
         GROUP BY status`,
      ),
      this.pool.query(
        `SELECT movement_type,
                COUNT(*)::int AS movements_count,
                COALESCE(SUM(quantity), 0)::int AS total_units
         FROM inventory_movements
         GROUP BY movement_type`,
      ),
      this.pool.query(
        `SELECT p.id, p.code, p.name, c.name AS category_name,
                p.purchase_price, p.sale_price, p.stock, p.min_stock, p.is_active,
                (p.stock * p.purchase_price)::numeric(12,2) AS inventory_cost_value
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         ORDER BY p.id ASC`,
      ),
    ]);

    const completed = salesByStatus.rows.find((r) => r.status === 'COMPLETED') || { count: 0, amount: '0.00' };
    const cancelled = salesByStatus.rows.find((r) => r.status === 'CANCELLED') || { count: 0, amount: '0.00' };
    const entries = movByType.rows.find((r) => r.movement_type === 'IN') || { movements_count: 0, total_units: 0 };
    const exits = movByType.rows.find((r) => r.movement_type === 'OUT') || { movements_count: 0, total_units: 0 };

    return {
      sales: {
        completed_count: completed.count,
        completed_amount: completed.amount,
        cancelled_count: cancelled.count,
        cancelled_amount: cancelled.amount,
      },
      movements: {
        in_count: entries.movements_count,
        in_units: entries.total_units,
        out_count: exits.movements_count,
        out_units: exits.total_units,
      },
      products: catalogDetail.rows,
    };
  }
}
