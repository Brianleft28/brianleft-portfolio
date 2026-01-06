# Diseño de la Base de Datos: Estructura de Árbol

Para representar la estructura jerárquica del sistema de archivos (carpetas dentro de carpetas) en una base de datos relacional como MySQL, se utilizará el patrón de diseño **"Lista de Adyacencia" (Adjacency List)**.

## 1. Concepto

La idea es "aplanar" el árbol en una única tabla donde cada fila es un "nodo" (un archivo o una carpeta). La relación jerárquica se establece mediante una columna `parentId` que apunta al `id` del nodo padre.

- Un nodo con `parentId = NULL` es un elemento raíz.
- Un nodo con un `parentId` apunta a la carpeta que lo contiene.

## 2. Esquema SQL

Se creará una única tabla `nodes` para almacenar toda la estructura.

```sql
CREATE TABLE nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('folder', 'markdown', 'component') NOT NULL,
    path VARCHAR(255) NULL,  -- Ruta al archivo .md si es de tipo 'markdown'
    parentId INT NULL,       -- Referencia al nodo padre (self-referencing)
    FOREIGN KEY (parentId) REFERENCES nodes(id) ON DELETE CASCADE
);
```

## 3. Entidad TypeORM

TypeORM tiene soporte nativo para este patrón a través de los decoradores `@Tree`. La entidad en NestJS se definirá de la siguiente manera:

```typescript
// src/node/node.entity.ts (en el proyecto NestJS)

import { Entity, PrimaryGeneratedColumn, Column, Tree, TreeChildren, TreeParent } from 'typeorm';

@Entity({ name: 'nodes' })
@Tree('adjacency-list')
export class Node {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column({ type: 'enum', enum: ['folder', 'markdown', 'component'] })
	type: string;

	@Column({ nullable: true })
	path: string;

	@TreeChildren()
	children: Node[];

	@TreeParent()
	parent: Node;
}
```

## 4. Razón de la Arquitectura de la Entidad `Node`

La entidad `Node` está diseñada para que TypeORM pueda abstraer la complejidad de manejar la estructura de árbol.

- **`@Tree("adjacency-list")`**: Este es el decorador principal. Le indica a TypeORM que esta entidad no es una tabla plana, sino que representa un árbol y debe ser gestionada usando el patrón de "Lista de Adyacencia". Esto significa que TypeORM buscará y gestionará automáticamente la columna `parentId`.

- **`@TreeChildren()`**: Este decorador le dice a TypeORM: "Cuando yo pida un nodo, busca en la tabla todos los otros nodos cuyo `parentId` sea mi `id`, y cárgalos en esta propiedad `children`". Esto permite reconstruir el árbol hacia abajo.

- **`@TreeParent()`**: Este decorador hace lo contrario. Le dice a TypeORM: "Busca en la tabla el nodo cuyo `id` coincida con mi `parentId` y cárgalo en esta propiedad `parent`". Esto permite navegar el árbol hacia arriba.

**En resumen:** Gracias a estos decoradores, no necesitamos escribir consultas SQL complejas con `JOIN`s recursivos. Simplemente usamos los métodos del repositorio de TypeORM (como `findTrees()`) y él se encarga de consultar la tabla `nodes` y reconstruir la estructura de objetos anidados que la API necesita para enviar al frontend.
