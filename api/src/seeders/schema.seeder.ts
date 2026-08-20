import { DataSource } from 'typeorm';

/**
 * Columnas que TypeORM no puede crear solo.
 *
 * `synchronize` está apagado en producción (`app.module.ts`) y el proyecto no
 * usa migraciones: sin este paso, agregar una columna a una entidad compila
 * pero explota en runtime con "Unknown column". Es idempotente —consulta
 * `information_schema` antes de tocar nada— y corre al principio del seeder,
 * que es lo que ya se ejecuta en cada deploy.
 */
const REQUIRED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: 'files', column: 'content_en', definition: 'LONGTEXT NULL' },
  { table: 'memories', column: 'title_en', definition: 'VARCHAR(255) NULL' },
  { table: 'memories', column: 'content_en', definition: 'LONGTEXT NULL' },
  { table: 'memories', column: 'summary_en', definition: 'TEXT NULL' },
  { table: 'settings', column: 'value_en', definition: 'TEXT NULL' },
];

export async function ensureSchema(dataSource: DataSource): Promise<void> {
  const database = dataSource.options.database as string;

  for (const { table, column, definition } of REQUIRED_COLUMNS) {
    const [existing] = await dataSource.query(
      `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [database, table, column],
    );

    if (Number(existing.total) > 0) continue;

    await dataSource.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`🔧 Columna "${table}.${column}" agregada.`);
  }
}
