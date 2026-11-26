import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: async () => {
        const connectionString = process.env.DATABASE_URL;
        const pool = new Pool({ connectionString });
        const client = await pool.connect();
        client.release();
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
