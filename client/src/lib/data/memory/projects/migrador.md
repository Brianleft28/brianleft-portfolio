# Migrador de Beneficiarios

## Problema
La carga manual de padrones de beneficiarios es ineficiente y propensa a errores. Este script automatiza la lectura de Excels con formatos inconsistentes (múltiples hojas vs tabla única) para actualizar fechas de entrega y zonas en MySQL.

## Stack
Node.js, MySQL2 (Promise wrapper), ExcelJS, Inquirer.

## Arquitectura

```
[index.js] --> Inquirer (menú interactivo)
     |
     v
[DataMigrator.js] --> ETL: Extract, Transform, Load
     |
     v
[DataBase.js] --> Singleton (no revienta el pool)
     |
     v
[Entities/] --> Queries SQL encapsuladas
```

### Componentes:

1. **Entry Point (`index.js`):** Flujo de usuario con Inquirer
2. **Database (`DataBase.js`):** Singleton para reutilizar conexión
3. **DataMigrator:** Orquesta el ETL completo
4. **Entidades:** Clases anémicas con queries (`insertBatch`, `updateFromMigracionesFechas`)

## Código Destacado

El **Batch Insert** es clave. En lugar de un INSERT por fila (lento), agrupa de a 1000:

```javascript
async migrateData(formattedData) {
  const batchSize = 1000;
  for (let i = 0; i < formattedData.length; i += batchSize) {
    const batch = formattedData
      .slice(i, i + batchSize)
      .map((row) => [
        row.documento,
        row.fentrega,
        // ... resto de campos
      ]);
    await this.migracionesFechas.insertBatch(batch);
  }
}
```

## Decisiones de Diseño

- **Singleton DB:** Evita abrir múltiples conexiones en operaciones largas
- **Staging Table:** Usa `migraciones_fechas` como tabla intermedia, la limpia antes de insertar
- **Mapeo de Zonas:** Los nombres de hojas del Excel se mapean a IDs de zona en la DB

## Métricas
- Procesa ~50,000 registros en <30 segundos
- Reduce tiempo de carga manual de 4 horas a 2 minutos