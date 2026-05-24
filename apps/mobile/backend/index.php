<?php
header("Content-Type: application/json");
echo json_encode([
    'app' => '[SV]Go API',
    'version' => '1.0.0',
    'endpoints' => [
        'auth.php', 'perfil_solicitudes.php', 'admin_dashboard.php',
        'vendedor_dashboard.php', 'repartidor_dashboard.php',
        'productos.php', 'interacciones.php', 'carrito_pagos.php',
        'pedidos_tracking.php', 'chat_multi.php', 'soporte.php'
    ]
]);
