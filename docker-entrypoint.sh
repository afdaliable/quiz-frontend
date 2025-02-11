#!/bin/sh

# Replace API_URL in env.js if provided
if [ ! -z "$API_URL" ]; then
    echo "window.env = { API_URL: '$API_URL' };" > /usr/share/nginx/html/assets/env.js
fi

# Execute the main command
exec "$@"