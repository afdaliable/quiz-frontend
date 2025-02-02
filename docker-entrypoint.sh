#!/bin/sh

# Replace environment variables in the env.js file
envsubst < /usr/share/nginx/html/env.js > /usr/share/nginx/html/env.js.tmp
mv /usr/share/nginx/html/env.js.tmp /usr/share/nginx/html/env.js

# Start Nginx
exec "$@"