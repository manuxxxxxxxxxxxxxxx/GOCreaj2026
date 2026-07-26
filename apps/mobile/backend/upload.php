<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autorizado'], 401);

$type = $_GET['type'] ?? 'imagen'; // 'imagen' | 'video'

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jout(['ok' => false, 'error' => 'Método no permitido'], 405);

if ($type === 'video') {
    $file = $_FILES['video'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        jout(['ok' => false, 'error' => 'Archivo no recibido o error: ' . ($file['error'] ?? 'none')], 400);
    }
    $allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp'];
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed)) {
        jout(['ok' => false, 'error' => 'Formato de video no permitido. Use MP4, MOV, AVI o WebM.'], 400);
    }
    $maxSize = 100 * 1024 * 1024; // 100 MB
    if ($file['size'] > $maxSize) {
        jout(['ok' => false, 'error' => 'El video excede el tamaño máximo (100 MB).'], 400);
    }
    $ext  = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'mp4';
    $name = 'reel_' . $user['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
    $dir  = UPLOAD_BASE . 'videos/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    if (!move_uploaded_file($file['tmp_name'], $dir . $name)) {
        jout(['ok' => false, 'error' => 'No se pudo guardar el video.'], 500);
    }
    $url = upload_url() . 'videos/' . $name;
    jout(['ok' => true, 'url' => $url, 'nombre' => $name]);

} else {
    $file = $_FILES['imagen'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        jout(['ok' => false, 'error' => 'Imagen no recibida'], 400);
    }
    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed)) {
        jout(['ok' => false, 'error' => 'Formato de imagen no permitido.'], 400);
    }
    $maxSize = 10 * 1024 * 1024; // 10 MB
    if ($file['size'] > $maxSize) {
        jout(['ok' => false, 'error' => 'La imagen excede 10 MB.'], 400);
    }
    $ext  = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $name = 'img_' . $user['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
    $dir  = UPLOAD_BASE . 'imagenes/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    if (!move_uploaded_file($file['tmp_name'], $dir . $name)) {
        jout(['ok' => false, 'error' => 'No se pudo guardar la imagen.'], 500);
    }
    $url = upload_url() . 'imagenes/' . $name;
    jout(['ok' => true, 'url' => $url, 'nombre' => $name]);
}
