import { Injectable, Inject, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { PG_POOL } from '../database/database.module';

export interface AuthUserPayload {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'VENDEDOR';
}

@Injectable()
export class AuthService {
  private readonly secret = process.env.JWT_SECRET || 'ferreteria_dev_secret_2026';

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  hashPassword(plain: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  verifyPassword(plain: string, stored: string): { valid: boolean; needsRehash: boolean } {
    if (!stored.includes(':')) {
      return { valid: plain === stored, needsRehash: plain === stored };
    }
    const [salt, key] = stored.split(':');
    const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
    return { valid, needsRehash: false };
  }

  signToken(payload: AuthUserPayload): string {
    const data = Buffer.from(
      JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 }),
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret).update(data).digest('base64url');
    return `${data}.${sig}`;
  }

  verifyToken(token: string): AuthUserPayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Token inválido');
    }
    const [data, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', this.secret).update(data).digest('base64url');
    if (sig !== expectedSig) {
      throw new UnauthorizedException('Firma de token inválida');
    }
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed.exp || Date.now() > parsed.exp) {
      throw new UnauthorizedException('Sesión expirada');
    }
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
    };
  }

  async login(email: string, password: string) {
    const res = await this.pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()],
    );
    if (res.rows.length === 0) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const user = res.rows[0];
    if (!user.is_active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const check = this.verifyPassword(password, user.password_hash);
    if (!check.valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (check.needsRehash) {
      const hashed = this.hashPassword(password);
      await this.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, user.id]);
    }

    const payload: AuthUserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.signToken(payload),
      user: payload,
    };
  }

  async listUsers() {
    const res = await this.pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id ASC',
    );
    return res.rows;
  }

  async createUser(input: { name: string; email: string; password: string; role: 'ADMIN' | 'VENDEDOR' }) {
    if (!input.name?.trim() || !input.email?.trim() || !input.password || input.password.length < 6) {
      throw new BadRequestException('Nombre, correo y contraseña (mínimo 6 caracteres) son obligatorios');
    }
    if (input.role !== 'ADMIN' && input.role !== 'VENDEDOR') {
      throw new BadRequestException('Rol inválido (use ADMIN o VENDEDOR)');
    }
    try {
      const hashed = this.hashPassword(input.password);
      const res = await this.pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active, created_at',
        [input.name.trim(), input.email.trim().toLowerCase(), hashed, input.role],
      );
      return res.rows[0];
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw err;
    }
  }
}
