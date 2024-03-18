#!/bin/bash
#
# In case you want to run the web project without docker-compose

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set environment variables from .env
source "$SCRIPT_DIR/../../.env"

# Export all variables
for var in $(grep -v '^#' "$SCRIPT_DIR/../../.env" | sed -E 's/(.*)=.*/\1/') ; do
    export "$var"
done

# Build & run
npm run build:start