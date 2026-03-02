#!/bin/sh
set -e

# Run Prisma migrations using the copied prisma CLI
echo "Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

# Execute the main command
exec "$@"
