# Use the official Nginx image as the base image
FROM nginx:alpine

# Install bash for debugging (optional)
RUN apk add --no-cache bash

# Set the working directory to nginx's default web root
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy the local directory contents into the container at /usr/share/nginx/html
COPY . .

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
