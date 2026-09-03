FROM php:8.2-apache

# mysqli/pdo_mysql: el backend habla con MySQL por PDO (ver conexion.php).
RUN docker-php-ext-install mysqli pdo_mysql

# mod_rewrite: requerido por .htaccess (reenvía el header Authorization, que Apache
# a veces no pasa a PHP por defecto). AllowOverride All para que ese .htaccess aplique.
# mpm_prefork (único MPM compatible con mod_php): la imagen base a veces queda con
# mpm_event también habilitado, lo que hace que Apache no arranque ("More than one
# MPM loaded") -- se fuerza explícitamente a prefork.
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf \
           /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf \
    && a2enmod mpm_prefork rewrite \
    && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && apache2ctl configtest

# Límites por defecto de la imagen (2M/8M) son insuficientes: la app sube fotos/videos
# como base64 (+33% de overhead) desde vendedor_dashboard.php/productos.php.
RUN { \
        echo 'upload_max_filesize = 50M'; \
        echo 'post_max_size = 55M'; \
        echo 'memory_limit = 256M'; \
        echo 'max_execution_time = 120'; \
    } > /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html
COPY . .

# uploads/ debe ser escribible por Apache (www-data) -- guarda fotos/videos subidos.
RUN chown -R www-data:www-data /var/www/html/uploads

# Railway asigna el puerto por la env var PORT; Apache escucha en 80 por defecto,
# así que lo hacemos escuchar en $PORT al arrancar el contenedor.
ENV PORT=80
EXPOSE 80
CMD sh -c "sed -ri \"s/Listen 80/Listen \$PORT/\" /etc/apache2/ports.conf && \
    sed -ri \"s/:80>/:\$PORT>/\" /etc/apache2/sites-enabled/000-default.conf && \
    rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf \
          /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf && \
    apache2-foreground"
