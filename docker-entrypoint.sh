#!/bin/sh

# Replace environment variables in the env.js file
envsubst < /usr/share/nginx/html/assets/env.js > /usr/share/nginx/html/assets/env.js.tmp
mv /usr/share/nginx/html/assets/env.js.tmp /usr/share/nginx/html/assets/env.js

# Start Nginx
exec "$@"