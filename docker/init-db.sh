#!/bin/bash
# PostgreSQL initialization script
# Runs automatically on first container start

set -e

echo "Initializing EPN database..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Grant all privileges
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
    
    RAISE NOTICE 'EPN database initialized successfully';
EOSQL

echo "Database initialization complete."
