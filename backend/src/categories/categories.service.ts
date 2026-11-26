import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class CategoriesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const sql = 'SELECT id, name, description, is_active, created_at FROM categories ORDER BY id ASC';
    const result = await this.pool.query(sql);
    return result.rows;
  }

  async create(name: string, description?: string) {
    try {
      const sql = 'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description, is_active, created_at';
      const result = await this.pool.query(sql, [name, description ?? null]);
      return result.rows[0];
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
      throw err;
    }
  }
}
