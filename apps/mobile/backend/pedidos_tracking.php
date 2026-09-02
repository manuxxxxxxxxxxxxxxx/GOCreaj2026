<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'estado';
$data = jread();

function calcular_trafico(float $km): array {
    $hora = (int)date('H');
    $factor = 1.0;
    $estado = 'fluido';
    if (($hora >= 7 && $hora <= 9) || ($hora >= 17 && $hora <= 19)) {
        $factor = 1.8;
        $estado = 'pesado';
    } else if (($hora >= 12 && $hora <= 14)) {
        $factor = 1.4;
        $estado = 'moderado';
    }
    $minutos = (int)ceil(($km / 30) * 60 * $factor);
    return ['tiempo_estimado' => $minutos, 'trafico' => $estado];
}

switch ($action) {

    case 'actualizar_ubicacion':
        if ($user['rol'] !== 'repartidor') jout(['ok' => false, 'error' => 'Solo repartidor'], 403);
        require_fields($data, ['pedido_id','lat','lng']);

        $st = db()->prepare("SELECT lat_entrega, lng_entrega FROM pedidos WHERE id = ? AND repartidor_id = ?");
        $st->execute([$data['pedido_id'], $user['id']]);
        $p = $st->fetch();
        if (!$p) jout(['ok' => false, 'error' => 'No autorizado'], 403);

        $info = ['tiempo_estimado' => null, 'trafico' => null];
        if ($p['lat_entrega'] && $p['lng_entrega']) {
            $km = distancia_km((float)$data['lat'], (float)$data['lng'], (float)$p['lat_entrega'], (float)$p['lng_entrega']);
            $info = calcular_trafico($km);
        }

        // Compatibilidad: si existen columnas legacy las usa; siempre escribe repartidor_lat/lng nuevas
        $up = db()->prepare("UPDATE pedidos SET repartidor_lat = ?, repartidor_lng = ?, tiempo_estimado = ?, trafico = ? WHERE id = ?");
        try { $up->execute([$data['lat'], $data['lng'], $info['tiempo_estimado'], $info['trafico'], $data['pedido_id']]); }
        catch (PDOException $e) {
            // Fallback en esquemas viejos
            db()->prepare("UPDATE pedidos SET repartidor_lat = ?, repartidor_lng = ? WHERE id = ?")
                ->execute([$data['lat'], $data['lng'], $data['pedido_id']]);
        }
        jout(['ok' => true, 'tracking' => $info]);
        break;

    case 'estado':
        $pid = (int)($_GET['pedido_id'] ?? 0);
        $st = db()->prepare(
            "SELECT p.*,
                    v.nombre as vendedor_nombre,
                    r.nombre as repartidor_nombre, r.foto_perfil as repartidor_foto, r.telefono as repartidor_telefono,
                    r.repartidor_calificacion_promedio, r.repartidor_total_resenas,
                    rs.tipo_vehiculo as repartidor_vehiculo,
                    (SELECT COUNT(*) FROM pedidos WHERE repartidor_id = r.id AND estado = 'entregado') AS repartidor_entregas_completadas,
                    c.nombre as comprador_nombre, c.telefono as comprador_telefono,
                    t.nombre as tienda_nombre, t.lat as tienda_lat, t.lng as tienda_lng, t.direccion as tienda_direccion
             FROM pedidos p
             JOIN usuarios v ON v.id = p.vendedor_id
             LEFT JOIN usuarios r ON r.id = p.repartidor_id
             LEFT JOIN solicitudes_rol rs ON rs.usuario_id = r.id AND rs.estado = 'aprobado' AND rs.rol_solicitado = 'repartidor'
             JOIN usuarios c ON c.id = p.comprador_id
             LEFT JOIN tiendas t ON t.vendedor_id = v.id
             WHERE p.id = ?"
        );
        $st->execute([$pid]);
        $pedido = $st->fetch();
        if (!$pedido) jout(['ok' => false, 'error' => 'No existe'], 404);
        if (!in_array($user['id'], [$pedido['comprador_id'], $pedido['vendedor_id'], $pedido['repartidor_id']]) && $user['rol'] !== 'admin') {
            jout(['ok' => false, 'error' => 'No autorizado'], 403);
        }
        $items = db()->prepare("SELECT i.*, p.nombre, p.imagen FROM pedido_items i JOIN productos p ON p.id = i.producto_id WHERE i.pedido_id = ?");
        $items->execute([$pid]);
        $pedido['items'] = $items->fetchAll();
        jout(['ok' => true, 'pedido' => $pedido]);
        break;

    // ─── Confirmación (lado comprador) de entrega, vía QR o PIN del repartidor ───
    // Cierra el pedido y dispara la liquidación — ver DESIGN.md "Flujo
    // logístico" y finalizar_entrega_pedido() en conexion.php. El PIN es el
    // respaldo de 6 dígitos: 3 intentos fallidos lo bloquean 15 min y alertan a
    // soporte, pero el QR (no adivinable) sigue disponible como salida.
    case 'confirmar_entrega':
        if ($user['rol'] !== 'comprador') jout(['ok' => false, 'error' => 'Solo el comprador puede confirmar la entrega'], 403);
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];

        // Bloqueo calculado en SQL (ver el mismo comentario en repartidor_dashboard.php
        // action=confirmar_recogida) -- evita comparar fechas entre el reloj de PHP y el de
        // MySQL, que en este servidor están en zonas horarias distintas.
        $sel = db()->prepare(
            "SELECT *, (pin_entrega_bloqueado_hasta > NOW()) AS pin_entrega_bloqueado,
                    (pin_recogida_bloqueado_hasta > NOW()) AS pin_recogida_bloqueado
             FROM pedidos WHERE id = ? AND comprador_id = ?"
        );
        $sel->execute([$pid, $user['id']]);
        $ped = $sel->fetch();
        if (!$ped) jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404);

        // "Recoger en tienda": el comprador confirma con el código que generó el vendedor
        // (qr_recogida_token/pin_recogida) directamente sobre el pedido en 'preparacion' --
        // no hay tramo de reparto que esperar. Ver confirmar_recogida en vendedor_dashboard.php.
        if ($ped['tipo_entrega'] === 'recogida') {
            if ($ped['estado'] !== 'preparacion') jout(['ok' => false, 'error' => 'Este pedido todavía no está listo para recoger'], 400);
            if (!$ped['qr_recogida_token']) jout(['ok' => false, 'error' => 'La tienda todavía no marcó el pedido como listo'], 400);

            $usaPin = empty($data['qr_token']) && !empty($data['pin']);
            if (!$usaPin) {
                if (empty($data['qr_token'])) jout(['ok' => false, 'error' => 'Falta el código QR o el PIN'], 400);
                if (!hash_equals($ped['qr_recogida_token'], (string)$data['qr_token'])) {
                    jout(['ok' => false, 'error' => 'Código QR inválido'], 400);
                }
            } else {
                if ((int)$ped['pin_recogida_bloqueado'] === 1) {
                    jout(['ok' => false, 'error' => 'Demasiados intentos fallidos. Este PIN quedó bloqueado temporalmente -- usa el QR o contacta soporte.'], 423);
                }
                if (!$ped['pin_recogida'] || !hash_equals($ped['pin_recogida'], (string)$data['pin'])) {
                    $r = registrar_intento_pin_fallido($pid, 'recogida', $user['id'], 'recogida');
                    if ($r['bloqueado']) jout(['ok' => false, 'error' => 'PIN incorrecto 3 veces: se bloqueó 15 minutos y soporte fue notificado. Usa el QR mientras tanto.'], 423);
                    jout(['ok' => false, 'error' => "PIN incorrecto ({$r['intentos']}/3 intentos)."], 400);
                }
            }

            try {
                $resultado = finalizar_recogida_pedido($pid);
            } catch (Throwable $e) {
                jout(['ok' => false, 'error' => $e->getMessage()], 500);
            }
            jout(['ok' => true] + $resultado);
        }

        if ($ped['estado'] !== 'en_camino') jout(['ok' => false, 'error' => 'Este pedido no está en camino'], 400);
        if (!$ped['repartidor_id']) jout(['ok' => false, 'error' => 'Este pedido no tiene repartidor asignado'], 400);

        $usaPin = empty($data['qr_token']) && !empty($data['pin']);
        if (!$usaPin) {
            if (empty($data['qr_token'])) jout(['ok' => false, 'error' => 'Falta el código QR o el PIN'], 400);
            if (!$ped['qr_entrega_token'] || !hash_equals($ped['qr_entrega_token'], (string)$data['qr_token'])) {
                jout(['ok' => false, 'error' => 'Código QR inválido, o el repartidor todavía no generó el código de entrega'], 400);
            }
        } else {
            if ((int)$ped['pin_entrega_bloqueado'] === 1) {
                jout(['ok' => false, 'error' => 'Demasiados intentos fallidos. Este PIN quedó bloqueado temporalmente -- usa el QR o contacta soporte.'], 423);
            }
            if (!$ped['pin_entrega'] || !hash_equals($ped['pin_entrega'], (string)$data['pin'])) {
                $r = registrar_intento_pin_fallido($pid, 'entrega', $user['id'], 'entrega');
                if ($r['bloqueado']) jout(['ok' => false, 'error' => 'PIN incorrecto 3 veces: se bloqueó 15 minutos y soporte fue notificado. Usa el QR mientras tanto.'], 423);
                jout(['ok' => false, 'error' => "PIN incorrecto ({$r['intentos']}/3 intentos)."], 400);
            }
        }

        try {
            $resultado = finalizar_entrega_pedido($pid, (int)$ped['repartidor_id']);
        } catch (Throwable $e) {
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        jout(['ok' => true] + $resultado);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
