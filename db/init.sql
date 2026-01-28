-- 
-- Portfolio Database Schema - MySQL 8.0
-- Minimal init - TypeORM handles table creation with synchronize: true
-- 

-- Usamos UTF8MB4 para emojis y caracteres especiales
ALTER DATABASE portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 
-- Las tablas se crean automáticamente por TypeORM con synchronize: true
-- Los datos iniciales se insertan vía seeders que respetan multi-tenancy
--
-- Para migrar bases de datos existentes a multi-tenant,
-- ejecutar: db/migrations/001_add_user_id_columns.sql
-- 
