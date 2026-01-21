-- ═══════════════════════════════════════════════════════════════════════════
-- Portfolio Database Schema - MySQL 8.0
-- ═══════════════════════════════════════════════════════════════════════════

-- Usamos UTF8MB4 para emojis y caracteres especiales
ALTER DATABASE portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────────────
-- USERS (Autenticación JWT)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- bcrypt hash
    role ENUM('admin', 'viewer') DEFAULT 'viewer',
    refresh_token VARCHAR(500) NULL,  -- Hash del refresh token actual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_username (username)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- FOLDERS (Sistema de archivos virtual - estructura recursiva)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT NULL,
    `order` INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    INDEX idx_folders_parent (parent_id),
    INDEX idx_folders_order (`order`)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- FILES (Archivos del sistema virtual)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('markdown', 'component') DEFAULT 'markdown',
    content LONGTEXT NULL,
    folder_id INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    INDEX idx_files_folder (folder_id),
    INDEX idx_files_type (type)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- MEMORIES (Base de conocimiento para la IA)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('project', 'meta', 'index', 'docs', 'custom') NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    summary TEXT NULL,  -- Resumen pre-generado por IA
    priority INT DEFAULT 0,  -- Para ordenar en listas
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_memories_type (type),
    INDEX idx_memories_slug (slug),
    INDEX idx_memories_active (active)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- MEMORY_KEYWORDS (Tags para RAG / búsqueda de contexto)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    memory_id INT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    INDEX idx_keywords_keyword (keyword),
    INDEX idx_keywords_memory (memory_id),
    UNIQUE KEY unique_memory_keyword (memory_id, keyword)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- CHAT_HISTORY (Opcional: historial de conversaciones)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,  -- ID de sesión del visitante
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_chat_session (session_id),
    INDEX idx_chat_created (created_at)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- VIEWS: Utilidades
-- ───────────────────────────────────────────────────────────────────────────

-- Vista para obtener el path completo de una carpeta
CREATE OR REPLACE VIEW v_folder_paths AS
WITH RECURSIVE folder_path AS (
    -- Caso base: carpetas raíz
    SELECT 
        id,
        name,
        parent_id,
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
        CAST(CONCAT(fp.full_path, '/', f.name) AS CHAR(1000)),
        fp.depth + 1
    FROM folders f
    INNER JOIN folder_path fp ON f.parent_id = fp.id
)
SELECT * FROM folder_path;

-- ═══════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES
-- ═══════════════════════════════════════════════════════════════════════════

-- Carpeta raíz del sistema de archivos
INSERT INTO folders (id, name, parent_id, `order`) VALUES 
(1, 'C:', NULL, 0);

-- Carpetas principales
INSERT INTO folders (name, parent_id, `order`) VALUES 
('proyectos', 1, 1),
('apps', 1, 2);
