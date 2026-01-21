FROM mysql:8.0

# Configuración para mejor compatibilidad con TypeORM
ENV MYSQL_ROOT_PASSWORD=root

# Copiar scripts de inicialización (se ejecutan al crear el volumen)
COPY init.sql /docker-entrypoint-initdb.d/

# Healthcheck nativo
HEALTHCHECK --interval=10s --timeout=5s --retries=10 \
    CMD mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} || exit 1

EXPOSE 3306
