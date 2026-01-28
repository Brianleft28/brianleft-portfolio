-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 001: Multi-user support (White-label architecture)
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta migración agrega soporte multi-usuario a todas las tablas principales
-- Cada usuario tendrá sus propios folders, files, memories, settings y AI personalities

-- ───────────────────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR USERS: agregar campos para white-label
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE users 
    ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER username,
    ADD COLUMN display_name VARCHAR(100) NULL AFTER role,
    ADD COLUMN subdomain VARCHAR(50) NULL UNIQUE AFTER display_name;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subdomain ON users(subdomain);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. FOLDERS: agregar user_id
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE folders 
    ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER `order`;

ALTER TABLE folders 
    ADD CONSTRAINT fk_folders_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_folders_user ON folders(user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. FILES: agregar user_id
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE files 
    ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER folder_id;

ALTER TABLE files 
    ADD CONSTRAINT fk_files_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_files_user ON files(user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. MEMORIES: agregar user_id
-- ───────────────────────────────────────────────────────────────────────────
-- Primero eliminar el índice único existente en slug
ALTER TABLE memories DROP INDEX slug;

ALTER TABLE memories 
    ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER active;

ALTER TABLE memories 
    ADD CONSTRAINT fk_memories_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Crear índice único compuesto (slug + user_id)
CREATE UNIQUE INDEX idx_memories_slug_user ON memories(slug, user_id);
CREATE INDEX idx_memories_user ON memories(user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. SETTINGS: agregar user_id
-- ───────────────────────────────────────────────────────────────────────────
-- Primero eliminar el índice único existente en key
ALTER TABLE settings DROP INDEX `key`;

ALTER TABLE settings 
    ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER description;

ALTER TABLE settings 
    ADD CONSTRAINT fk_settings_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Crear índice único compuesto (key + user_id)
CREATE UNIQUE INDEX idx_settings_key_user ON settings(`key`, user_id);
CREATE INDEX idx_settings_user ON settings(user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. AI_PERSONALITIES: agregar user_id (nullable para personalidades globales)
-- ───────────────────────────────────────────────────────────────────────────
-- Primero eliminar el índice único existente en slug
ALTER TABLE ai_personalities DROP INDEX slug;

ALTER TABLE ai_personalities 
    ADD COLUMN user_id INT NULL AFTER isDefault;

ALTER TABLE ai_personalities 
    ADD CONSTRAINT fk_ai_personalities_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Crear índice único compuesto (slug + user_id) - permite NULL
CREATE UNIQUE INDEX idx_ai_personalities_slug_user ON ai_personalities(slug, user_id);
CREATE INDEX idx_ai_personalities_user ON ai_personalities(user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. CHAT_HISTORY: agregar user_id para asociar chats con usuarios
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE chat_history 
    ADD COLUMN user_id INT NULL AFTER session_id;

ALTER TABLE chat_history 
    ADD CONSTRAINT fk_chat_history_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_chat_user ON chat_history(user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. ACTUALIZAR VISTA v_folder_paths para incluir user_id
-- ───────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_folder_paths;

CREATE OR REPLACE VIEW v_folder_paths AS
WITH RECURSIVE folder_path AS (
    -- Caso base: carpetas raíz
    SELECT 
        id,
        name,
        parent_id,
        user_id,
        CAST(name AS CHAR(1000)) as full_path,
        0 as depth
    FROM folders
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Caso recursivo
    SELECT 
        f.id,
        f.name,
        f.parent_id,
        f.user_id,
        CAST(CONCAT(fp.full_path, '/', f.name) AS CHAR(1000)),
        fp.depth + 1
    FROM folders f
    INNER JOIN folder_path fp ON f.parent_id = fp.id
)
SELECT * FROM folder_path;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN: Mostrar estado de las tablas
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'Migration 001 completed successfully!' as status;
SELECT 'Users table updated with email, display_name, subdomain' as change_1;
SELECT 'All content tables now have user_id column' as change_2;
SELECT 'Unique constraints updated to be per-user' as change_3;
