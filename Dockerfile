FROM nginx:alpine

# Copy app files
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY data/ /usr/share/nginx/html/data/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run uses PORT env variable (default 8080)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
