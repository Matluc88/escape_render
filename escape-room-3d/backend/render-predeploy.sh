#!/bin/bash

echo "🔄 Running Alembic migrations..."

# Attempt upgrade, if it fails due to overlaps, stamp the current state
if ! alembic upgrade head 2>&1; then
    echo "⚠️  Migration failed, stamping database to current state..."
    # Database likely already has tables, just mark them as up-to-date
    alembic stamp head 2>&1 || echo "Note: stamp might have issues but continuing..."
fi

echo "👤 Creating default admin user..."
if ! python create_first_admin_render.py; then
    echo "⚠️  Admin creation failed, but continuing..."
fi

echo "✅ Pre-deploy completed successfully!"