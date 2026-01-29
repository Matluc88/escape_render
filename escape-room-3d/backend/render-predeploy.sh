#!/bin/bash
set -e

echo "🔄 Running Alembic migrations..."
alembic upgrade head

echo "👤 Creating default admin user..."
python create_first_admin_render.py

echo "✅ Pre-deploy completed successfully!"