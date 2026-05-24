[SV]Go

INSTALACION:

1. Copia esta carpeta completa a: c:/xampp/htdocs/svgo/
   Estructura final: c:/xampp/htdocs/svgo/backend/ y c:/xampp/htdocs/svgo/frontend/

2. Inicia Apache y MySQL en XAMPP.

3. Importa svgo_db.sql en phpMyAdmin (crea la base svgo_db).

4. Verifica conexion editando: c:/xampp/htdocs/svgo/backend/conexion.php
   (usuario 'root', sin password por defecto en XAMPP)

5. Probar backend en navegador:
   http://localhost/svgo/backend/

6. Frontend Expo:
   cd c:/xampp/htdocs/svgo/frontend
   npm install
   npx expo start

7. Emulador Android usa http://10.0.2.2/svgo/backend
   Dispositivo fisico: edita app.json -> extra.apiUrl con tu IP local
   ej. http://192.168.1.100/svgo/backend

8. Reemplaza la API key de Google Maps en app.json (config.googleMaps.apiKey)

9. Credenciales admin por defecto: usuario admin / pass admin123

10. Usuarios demo:
    - vendedor1 / demo123
    - compradora1 / demo123
    - repartidor1 / demo123
