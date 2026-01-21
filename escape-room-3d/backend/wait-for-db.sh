#!/bin/sh
# wait-for-db.sh - Aspetta che il database sia pronto usando Python

set -e

host="$1"
shift
cmd="$@"

echo "⏳ Aspettando che il database sia pronto su $host..."

until python3 -c "import psycopg2; psycopg2.connect(host='$host', user='$POSTGRES_USER', password='$POSTGRES_PASSWORD', dbname='$POSTGRES_DB')" 2>/dev/null; do
  echo "⏳ Database non ancora pronto - riprovo tra 2 secondi..."
  sleep 2
done

echo "✅ Database pronto!"
exec $cmd
