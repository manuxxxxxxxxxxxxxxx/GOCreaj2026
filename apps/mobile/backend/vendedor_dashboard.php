<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'vendedor') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

$action = $_GET['action'] ?? 'mis_tiendas';
$data = jread();

switch ($action) {

    case 'mis_tiendas':
        $st = db()->prepare("SELECT * FROM tiendas WHERE vendedor_id = ?");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    case 'crear_tienda':
        require_fields($data, ['nombre','municipio','lat','lng']);
        $st = db()->prepare("INSERT INTO tiendas (vendedor_id, nombre, descripcion, municipio, direccion, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $st->execute([
            $user['id'],
            $data['nombre'],
            $data['descripcion'] ?? '',
            $data['municipio'],
            $data['direccion'] ?? '',
            $data['lat'],
            $data['lng']
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'actualizar_tienda':
        require_fields($data, ['tienda_id']);
        $portada = null;
        $logo    = null;
        if (!empty($data['portada']) && str_starts_with($data['portada'], 'data:image'))
            $portada = save_base64_image($data['portada'], 'tiendas', 'portada_' . $user['id']);
        if (!empty($data['logo']) && str_starts_with($data['logo'], 'data:image'))
            $logo = save_base64_image($data['logo'], 'tiendas', 'logo_' . $user['id']);

        $sets   = [];
        $params = [];
        $map = [
            'nombre'       => $data['nombre']        ?? null,
            'descripcion'  => $data['descripcion']   ?? null,
            'municipio'    => $data['municipio']      ?? null,
            'direccion'    => $data['direccion']      ?? null,
            'hora_apertura'=> $data['hora_apertura']  ?? null,
            'hora_cierre'  => $data['hora_cierre']    ?? null,
            'categoria'    => $data['categoria']      ?? null,
        ];
        foreach ($map as $col => $val) {
            if ($val !== null) { $sets[] = "$col = ?"; $params[] = $val; }
        }
        if (!empty($data['lat'])) { $sets[] = "lat = ?"; $params[] = $data['lat']; }
        if (!empty($data['lng'])) { $sets[] = "lng = ?"; $params[] = $data['lng']; }
        if ($portada)            { $sets[] = "portada = ?"; $params[] = $portada; }
        if ($logo)               { $sets[] = "logo = ?";    $params[] = $logo; }
        if (empty($sets)) jout(['ok' => false, 'error' => 'Nada que actualizar'], 400);
        $params[] = $data['tienda_id'];
        $params[] = $user['id'];
        $st = db()->prepare("UPDATE tiendas SET " . implode(', ', $sets) . " WHERE id = ? AND vendedor_id = ?");
        $st->execute($params);
        jout(['ok' => true]);
        break;

    case 'mis_productos':
        $st = db()->prepare("SELECT p.* FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE t.vendedor_id = ? ORDER BY p.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    case 'crear_producto':
        require_fields($data, ['tienda_id','nombre','precio']);
        // Categoría validada estrictamente: solo strings predeterminadas
        $CATS_VALIDAS = ['comida','bebidas','panaderia','general','postres','frutas','verduras'];
        $cat = $data['categoria'] ?? 'general';
        if (!in_array($cat, $CATS_VALIDAS, true)) jout(['ok' => false, 'error' => 'Categoría inválida'], 400);

        $imagen = !empty($data['imagen']) ? save_base64_image($data['imagen'], 'productos', 'p_' . $user['id']) : null;
        // Soporta video como base64 (data:video/...) o URL directa
        $videoRaw = $data['video'] ?? null;
        $video = null;
        if (!empty($videoRaw)) {
            if (str_starts_with($videoRaw, 'data:video')) {
                $video = save_base64_video($videoRaw, 'reels', 'r_' . $user['id']);
            } else {
                $video = $videoRaw;
            }
        }
        $stock = (int)($data['stock'] ?? 0);
        $estado_stock = $stock > 0 ? 'disponible' : 'agotado';

        $st = db()->prepare("INSERT INTO productos (tienda_id, nombre, descripcion, precio, stock, imagen, video, categoria, es_reel, estado_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $st->execute([
            $data['tienda_id'],
            $data['nombre'],
            $data['descripcion'] ?? '',
            $data['precio'],
            $stock,
            $imagen,
            $video,
            $cat,
            !empty($data['es_reel']) ? 1 : 0,
            $estado_stock,
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'actualizar_producto':
        require_fields($data, ['producto_id']);
        $CATS_VALIDAS = ['comida','bebidas','panaderia','general','postres','frutas','verduras'];
        if (isset($data['categoria']) && !in_array($data['categoria'], $CATS_VALIDAS, true)) {
            jout(['ok' => false, 'error' => 'Categoría inválida'], 400);
        }

        // Re-calcular estado_stock si llega un nuevo valor
        $estado_stock = null;
        if (isset($data['stock'])) {
            $estado_stock = ((int)$data['stock']) > 0 ? 'disponible' : 'agotado';
        }

        $st = db()->prepare(
            "UPDATE productos SET
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                precio = COALESCE(?, precio),
                stock = COALESCE(?, stock),
                categoria = COALESCE(?, categoria),
                activo = COALESCE(?, activo),
                estado_stock = COALESCE(?, estado_stock)
             WHERE id = ?"
        );
        $st->execute([
            $data['nombre'] ?? null,
            $data['descripcion'] ?? null,
            $data['precio'] ?? null,
            $data['stock'] ?? null,
            $data['categoria'] ?? null,
            $data['activo'] ?? null,
            $estado_stock,
            $data['producto_id'],
        ]);
        jout(['ok' => true, 'estado_stock' => $estado_stock]);
        break;

    case 'mis_ventas':
        $st = db()->prepare("SELECT p.*, u.nombre as comprador_nombre FROM pedidos p JOIN usuarios u ON u.id = p.comprador_id WHERE p.vendedor_id = ? ORDER BY p.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'pedidos' => $st->fetchAll()]);
        break;

    case 'preparar_pedido':
        require_fields($data, ['pedido_id','estado']);
        $st = db()->prepare("UPDATE pedidos SET estado = ? WHERE id = ? AND vendedor_id = ?");
        $st->execute([$data['estado'], $data['pedido_id'], $user['id']]);
        jout(['ok' => true]);
        break;

    // ─── Rechazar pedido: cambia estado y dispara reversión del pago ───
    case 'rechazar_pedido':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];
        try {
            db()->beginTransaction();
            // Verificar propiedad y estado
            $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND vendedor_id = ?");
            $sel->execute([$pid, $user['id']]);
            $ped = $sel->fetch();
            if (!$ped) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404); }
            if (in_array($ped['estado'], ['entregado','cancelado'], true)) {
                db()->rollBack();
                jout(['ok' => false, 'error' => 'No se puede rechazar este pedido'], 400);
            }

            // Cambiar a cancelado
            db()->prepare("UPDATE pedidos SET estado = 'cancelado', pago_estado = 'reembolsado' WHERE id = ?")->execute([$pid]);

            // Reversión 100% al comprador (wallet)
            $monto = (float)$ped['total'];
            db()->prepare("INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)")
                ->execute([(int)$ped['comprador_id'], $monto]);
            db()->prepare("INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id) VALUES (?, 'reembolso', ?, 'Pedido cancelado por vendedor', ?)")
                ->execute([(int)$ped['comprador_id'], $monto, $pid]);

            // Notificar al comprador
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$ped['comprador_id'], '❌ El vendedor rechazó tu pedido. Se reembolsó el total a tu billetera.']);

            db()->commit();
            jout(['ok' => true, 'reembolso' => $monto]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ─── Tarjeta del repartidor asignado al pedido ───
    case 'repartidor_pedido':
        $pid = (int)($_GET['pedido_id'] ?? 0);
        $st = db()->prepare(
            "SELECT u.id, u.nombre, u.foto_perfil, u.telefono, u.en_linea,
                    s.tipo_vehiculo, s.licencia_frente
             FROM pedidos p
             JOIN usuarios u ON u.id = p.repartidor_id
             LEFT JOIN solicitudes_rol s ON s.usuario_id = u.id AND s.estado = 'aprobado'
             WHERE p.id = ? AND p.vendedor_id = ? AND p.repartidor_id IS NOT NULL
             LIMIT 1"
        );
        $st->execute([$pid, $user['id']]);
        $r = $st->fetch();
        if (!$r) jout(['ok' => true, 'repartidor' => null]);
        jout(['ok' => true, 'repartidor' => $r]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
