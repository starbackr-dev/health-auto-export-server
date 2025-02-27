#!/bin/bash


# Default values
USERNAME="admin"
PASSWORD="mypassword"
DATABASE="health-auto-export"
ENVIRONMENT="production"
PORT="27017"

echo "Creating .env file..."
cat > .env << EOF
NODE_ENV=${ENVIRONMENT}
MONGO_HOST=hae-mongo
MONGO_USERNAME=${USERNAME}
MONGO_PASSWORD=${PASSWORD}
MONGO_DB=${DATABASE}
MONGO_PORT=${PORT}
EOF

echo "Environment configuration saved to .env file ✅"