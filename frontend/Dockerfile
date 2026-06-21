FROM nginx:1.27-alpine

COPY public /usr/share/nginx/html
COPY images /usr/share/nginx/html/images
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
