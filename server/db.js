import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

function createSslConfig() {
  if (process.env.PGSSLMODE !== 'require') {
    return false;
  }

  return {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: createSslConfig(),
});

let tenantCache = null;

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function getTenant() {
  if (tenantCache) {
    return tenantCache;
  }

  if (process.env.PG_TENANT_ID) {
    const tenantResult = await query(
      `
        select id, slug, nombre
        from tenants
        where id = $1
        limit 1
      `,
      [process.env.PG_TENANT_ID],
    );

    if (tenantResult.rows[0]) {
      tenantCache = tenantResult.rows[0];
      return tenantCache;
    }
  }

  if (process.env.PG_TENANT_SLUG) {
    const tenantResult = await query(
      `
        select id, slug, nombre
        from tenants
        where slug = $1
        limit 1
      `,
      [process.env.PG_TENANT_SLUG],
    );

    if (tenantResult.rows[0]) {
      tenantCache = tenantResult.rows[0];
      return tenantCache;
    }
  }

  const tenantResult = await query(
    `
      select id, slug, nombre
      from tenants
      where estado = 'activo'
      order by created_at asc
      limit 1
    `,
  );

  if (!tenantResult.rows[0]) {
    throw new Error('No se encontro un tenant activo en la base de datos');
  }

  tenantCache = tenantResult.rows[0];
  return tenantCache;
}

export async function closePool() {
  await pool.end();
}
