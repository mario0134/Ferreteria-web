import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class ProductsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const sql = `
      SELECT p.id, p.code, p.name, p.description, p.category_id, c.name AS category_name,
             p.purchase_price, p.sale_price, p.stock, p.min_stock, p.is_active, p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id ASC
    `;
    const res = await this.pool.query(sql);
    return res.rows;
  }

  async create(input: {
    code: string;
    name: string;
    description?: string;
    category_id: number;
    purchase_price: number;
    sale_price: number;
    stock: number;
    min_stock: number;
  }) {
    if (input.purchase_price < 0 || input.sale_price < 0 || input.stock < 0 || input.min_stock < 0) {
      throw new BadRequestException('Precios y cantidades no pueden ser negativos');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const catRes = await client.query('SELECT id FROM categories WHERE id = $1', [input.category_id]);
      if (catRes.rows.length === 0) {
        throw new BadRequestException('La categoría seleccionada no existe');
      }

      const prodRes = await client.query(
        `INSERT INTO products (code, name, description, category_id, purchase_price, sale_price, stock, min_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, code, name, description, category_id, purchase_price, sale_price, stock, min_stock, is_active, created_at`,
        [
          input.code,
          input.name,
          input.description ?? null,
          input.category_id,
          input.purchase_price,
          input.sale_price,
          input.stock,
          input.min_stock,
        ],
      );
      const product = prodRes.rows[0];

      if (input.stock > 0) {
        await client.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference)
           VALUES ($1, 'IN', $2, $3)`,
          [product.id, input.stock, `Stock inicial (${product.code})`],
        );
      }

      await client.query('COMMIT');
      return product;
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err?.code === '23505') {
        throw new ConflictException('Ya existe un producto con ese código');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async update(
    id: number,
    input: {
      name?: string;
      description?: string;
      category_id?: number;
      purchase_price?: number;
      sale_price?: number;
      min_stock?: number;
    },
  ) {
    const currentRes = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    const curr = currentRes.rows[0];

    const name = input.name !== undefined ? input.name.trim() : curr.name;
    const description = input.description !== undefined ? input.description.trim() : curr.description;
    const categoryId = input.category_id !== undefined ? Number(input.category_id) : curr.category_id;
    const purchasePrice =
      input.purchase_price !== undefined ? Number(input.purchase_price) : Number(curr.purchase_price);
    const salePrice =
      input.sale_price !== undefined ? Number(input.sale_price) : Number(curr.sale_price);
    const minStock = input.min_stock !== undefined ? Number(input.min_stock) : Number(curr.min_stock);

    if (!name) {
      throw new BadRequestException('El nombre del producto no puede quedar vacío');
    }
    if (purchasePrice < 0 || salePrice < 0 || minStock < 0 || !Number.isInteger(minStock)) {
      throw new BadRequestException('Precios y stock mínimo deben ser válidos y no negativos');
    }

    const catRes = await this.pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (catRes.rows.length === 0) {
      throw new BadRequestException('La categoría seleccionada no existe');
    }

    const updRes = await this.pool.query(
      `UPDATE products
       SET name = $1, description = $2, category_id = $3, purchase_price = $4, sale_price = $5, min_stock = $6
       WHERE id = $7
       RETURNING id, code, name, description, category_id, purchase_price, sale_price, stock, min_stock, is_active, created_at`,
      [name, description, categoryId, purchasePrice, salePrice, minStock, id],
    );
    return updRes.rows[0];
  }

  async setStatus(id: number, isActive: boolean) {
    const res = await this.pool.query(
      `UPDATE products SET is_active = $1 WHERE id = $2
       RETURNING id, code, name, is_active, stock, min_stock`,
      [isActive, id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return res.rows[0];
  }
}
