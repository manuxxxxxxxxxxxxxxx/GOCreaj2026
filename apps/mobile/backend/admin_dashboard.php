<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'admin') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

$action = $_GET['action'] ?? 'solicitudes';
$data = jread();

switch ($action) {

    case 'solicitudes':
        $estado = $_GET['estado'] ?? 'pendiente';
        $st = db()->prepare("SELECT s.*, u.nombre as usuario_nombre, u.email, u.telefono FROM solicitudes_rol s JOIN usuarios u ON u.id = s.usuario_id WHERE s.estado = ? ORDER BY s.created_at DESC");
        $st->execute([$estado]);
        jout(['ok' => true, 'solicitudes' => $st->fetchAll()]);
        break;

    case 'resolver':
        require_fields($data, ['solicitud_id','decision']);
        if (!in_array($data['decision'], ['aprobado','rechazado'])) jout(['ok' => false, 'error' => 'Decision invalida'], 400);
        $st = db()->prepare("SELECT * FROM solicitudes_rol WHERE id = ?");
        $st->execute([$data['solicitud_id']]);
        $s = $st->fetch();
        if (!$s) jout(['ok' => false, 'error' => 'No existe'], 404);

        db()->beginTransaction();
        try {
            $up = db()->prepare("UPDATE solicitudes_rol SET estado = ?, notas_admin = ?, revisado_at = NOW() WHERE id = ?");
            $up->execute([$data['decision'], $data['notas'] ?? '', $s['id']]);

            if ($data['decision'] === 'aprobado') {
                $upu = db()->prepare("UPDATE usuarios SET rol = ? WHERE id = ?");
                $upu->execute([$s['rol_solicitado'], $s['usuario_id']]);
            }

            // Notify user via chat message
            $notaMsg = $data['notas'] ?? '';
            $chatMsg = $data['decision'] === 'aprobado'
                ? "✅ Tu solicitud de rol *{$s['rol_solicitado']}* ha sido aprobada. ¡Bienvenido! 🎉"
                : "❌ Tu solicitud de rol *{$s['rol_solicitado']}* fue rechazada." . ($notaMsg ? " Motivo: {$notaMsg}" : '');
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
               ->execute([$user['id'], $s['usuario_id'], $chatMsg]);

            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'stats':
        $stats = [
            'usuarios' => (int)db()->query("SELECT COUNT(*) FROM usuarios")->fetchColumn(),
            'compradores' => (int)db()->query("SELECT COUNT(*) FROM usuarios WHERE rol='comprador'")->fetchColumn(),
            'vendedores' => (int)db()->query("SELECT COUNT(*) FROM usuarios WHERE rol='vendedor'")->fetchColumn(),
            'repartidores' => (int)db()->query("SELECT COUNT(*) FROM usuarios WHERE rol='repartidor'")->fetchColumn(),
            'pedidos' => (int)db()->query("SELECT COUNT(*) FROM pedidos")->fetchColumn(),
            'pedidos_hoy' => (int)db()->query("SELECT COUNT(*) FROM pedidos WHERE DATE(created_at) = CURDATE()")->fetchColumn(),
            'ingresos_total' => (float)db()->query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado = 'entregado'")->fetchColumn(),
            'solicitudes_pendientes' => (int)db()->query("SELECT COUNT(*) FROM solicitudes_rol WHERE estado='pendiente'")->fetchColumn(),
            'soporte_abiertos' => (int)db()->query("SELECT COUNT(*) FROM soporte_reportes WHERE estado='abierto'")->fetchColumn(),
            'productos_activos' => (int)db()->query("SELECT COUNT(*) FROM productos WHERE activo=1")->fetchColumn(),
            'tiendas_activas' => (int)db()->query("SELECT COUNT(*) FROM tiendas WHERE activo=1")->fetchColumn(),
        ];
        jout(['ok' => true, 'stats' => $stats]);
        break;

    case 'usuarios':
        $q = "SELECT id, nombre, username, email, telefono, rol, foto_perfil, municipio, activo, en_linea, created_at FROM usuarios WHERE 1=1";
        $params = [];
        if (!empty($_GET['q'])) {
            $q .= " AND (nombre LIKE ? OR email LIKE ? OR username LIKE ?)";
            $s = '%' . $_GET['q'] . '%';
            $params = [$s, $s, $s];
        }
        if (!empty($_GET['rol'])) {
            $q .= " AND rol = ?";
            $params[] = $_GET['rol'];
        }
        $q .= " ORDER BY created_at DESC";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'usuarios' => $st->fetchAll()]);
        break;

    case 'actualizar_usuario':
        require_fields($data, ['usuario_id']);
        $sets = [];
        $params = [];
        if (isset($data['rol']) && in_array($data['rol'], ['comprador','vendedor','repartidor','admin'])) {
            $sets[] = "rol = ?"; $params[] = $data['rol'];
        }
        if (isset($data['activo'])) {
            $sets[] = "activo = ?"; $params[] = (int)$data['activo'];
        }
        if (!empty($data['nombre'])) {
            $sets[] = "nombre = ?"; $params[] = $data['nombre'];
        }
        if (!empty($data['email'])) {
            $sets[] = "email = ?"; $params[] = $data['email'];
        }
        if (empty($sets)) jout(['ok' => false, 'error' => 'Nada que actualizar'], 400);
        $params[] = $data['usuario_id'];
        $st = db()->prepare("UPDATE usuarios SET " . implode(', ', $sets) . " WHERE id = ?");
        $st->execute($params);
        jout(['ok' => true]);
        break;

    case 'pedidos':
        $q = "SELECT p.*, uc.nombre as comprador_nombre, uv.nombre as vendedor_nombre, ur.nombre as repartidor_nombre FROM pedidos p JOIN usuarios uc ON uc.id = p.comprador_id JOIN usuarios uv ON uv.id = p.vendedor_id LEFT JOIN usuarios ur ON ur.id = p.repartidor_id WHERE 1=1";
        $params = [];
        if (!empty($_GET['estado'])) {
            $q .= " AND p.estado = ?";
            $params[] = $_GET['estado'];
        }
        $q .= " ORDER BY p.created_at DESC";
        $st = db()->prepare($q);
        $st->execute($params);
        $pedidos = $st->fetchAll();
        foreach ($pedidos as &$ped) {
            $items = db()->prepare("SELECT i.*, pr.nombre, pr.imagen FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id WHERE i.pedido_id = ?");
            $items->execute([$ped['id']]);
            $ped['items'] = $items->fetchAll();
        }
        jout(['ok' => true, 'pedidos' => $pedidos]);
        break;

    case 'actualizar_pedido':
        require_fields($data, ['pedido_id', 'estado']);
        if (!in_array($data['estado'], ['preparacion','en_camino','entregado','rechazado_repartidor','cancelado'])) {
            jout(['ok' => false, 'error' => 'Estado invalido'], 400);
        }
        $st = db()->prepare("UPDATE pedidos SET estado = ? WHERE id = ?");
        $st->execute([$data['estado'], $data['pedido_id']]);
        jout(['ok' => true]);
        break;

    case 'productos':
        $q = "SELECT p.*, t.nombre as tienda_nombre, t.vendedor_id, u.nombre as vendedor_nombre FROM productos p JOIN tiendas t ON t.id = p.tienda_id JOIN usuarios u ON u.id = t.vendedor_id WHERE 1=1";
        $params = [];
        if (!empty($_GET['categoria'])) {
            $q .= " AND p.categoria = ?";
            $params[] = $_GET['categoria'];
        }
        $q .= " ORDER BY p.created_at DESC";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    case 'actualizar_producto':
        require_fields($data, ['producto_id']);
        $sets = [];
        $params = [];
        foreach (['nombre','precio','stock','categoria','activo','descripcion'] as $f) {
            if (isset($data[$f])) { $sets[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($sets)) jout(['ok' => false, 'error' => 'Nada que actualizar'], 400);
        $params[] = $data['producto_id'];
        $st = db()->prepare("UPDATE productos SET " . implode(', ', $sets) . " WHERE id = ?");
        $st->execute($params);
        jout(['ok' => true]);
        break;

    case 'eliminar_producto':
        require_fields($data, ['producto_id']);
        $st = db()->prepare("UPDATE productos SET activo = 0 WHERE id = ?");
        $st->execute([$data['producto_id']]);
        jout(['ok' => true]);
        break;

    case 'soporte':
        $st = db()->query("SELECT r.*, u.nombre as usuario_nombre, u.email as usuario_email FROM soporte_reportes r JOIN usuarios u ON u.id = r.usuario_id ORDER BY r.created_at DESC");
        jout(['ok' => true, 'reportes' => $st->fetchAll()]);
        break;

    case 'responder_soporte':
        require_fields($data, ['reporte_id','respuesta','estado']);
        $st = db()->prepare("UPDATE soporte_reportes SET respuesta_admin = ?, estado = ? WHERE id = ?");
        $st->execute([$data['respuesta'], $data['estado'], $data['reporte_id']]);
        jout(['ok' => true]);
        break;

    case 'actividad_reciente':
        $actividad = [];
        $pedidos = db()->query("SELECT id, total, estado, created_at FROM pedidos ORDER BY created_at DESC LIMIT 10")->fetchAll();
        foreach ($pedidos as $p) {
            $actividad[] = ['tipo' => 'pedido', 'descripcion' => "Pedido #SV-{$p['id']} por \${$p['total']} — {$p['estado']}", 'fecha' => $p['created_at']];
        }
        $usuarios = db()->query("SELECT id, nombre, rol, created_at FROM usuarios ORDER BY created_at DESC LIMIT 5")->fetchAll();
        foreach ($usuarios as $u) {
            $actividad[] = ['tipo' => 'usuario', 'descripcion' => "Nuevo usuario: {$u['nombre']} ({$u['rol']})", 'fecha' => $u['created_at']];
        }
        $tickets = db()->query("SELECT id, asunto, estado, created_at FROM soporte_reportes ORDER BY created_at DESC LIMIT 5")->fetchAll();
        foreach ($tickets as $t) {
            $actividad[] = ['tipo' => 'soporte', 'descripcion' => "Ticket #{$t['id']}: {$t['asunto']} — {$t['estado']}", 'fecha' => $t['created_at']];
        }
        usort($actividad, fn($a, $b) => strtotime($b['fecha']) - strtotime($a['fecha']));
        $actividad = array_slice($actividad, 0, 20);
        jout(['ok' => true, 'actividad' => $actividad]);
        break;

    // ─────────── ÁRBOL DE CONTROL INTEGRAL ───────────
    // Devuelve los conjuntos jerárquicos que renderiza el panel "Botón del Alma"
    case 'arbol_control':
        try {
            $vendedores = db()->query(
                "SELECT id, nombre, username, email, foto_perfil, activo, en_linea
                 FROM usuarios WHERE rol = 'vendedor' ORDER BY activo DESC, nombre ASC LIMIT 200"
            )->fetchAll();

            $repartidores = db()->query(
                "SELECT id, nombre, username, email, foto_perfil, activo, en_linea
                 FROM usuarios WHERE rol = 'repartidor' ORDER BY activo DESC, nombre ASC LIMIT 200"
            )->fetchAll();

            $compradores = db()->query(
                "SELECT id, nombre, username, email, foto_perfil, activo, en_linea
                 FROM usuarios WHERE rol = 'comprador' ORDER BY activo DESC, nombre ASC LIMIT 200"
            )->fetchAll();

            $productos = db()->query(
                "SELECT p.id, p.nombre, p.imagen, p.precio, p.stock, p.activo,
                        p.es_reel, t.nombre AS tienda_nombre, t.id AS tienda_id,
                        u.nombre AS vendedor_nombre
                 FROM productos p
                 JOIN tiendas t ON t.id = p.tienda_id
                 JOIN usuarios u ON u.id = t.vendedor_id
                 ORDER BY p.created_at DESC LIMIT 300"
            )->fetchAll();

            $reels = db()->query(
                "SELECT p.id, p.nombre, p.imagen, p.video_url, p.activo, p.es_reel,
                        t.nombre AS tienda_nombre, u.nombre AS vendedor_nombre,
                        (SELECT COUNT(*) FROM productos_reportes WHERE producto_id = p.id) AS reportes
                 FROM productos p
                 JOIN tiendas t ON t.id = p.tienda_id
                 JOIN usuarios u ON u.id = t.vendedor_id
                 WHERE p.es_reel = 1
                 ORDER BY reportes DESC, p.created_at DESC LIMIT 200"
            )->fetchAll();

            jout([
                'ok' => true,
                'arbol' => [
                    'vendedores'   => $vendedores,
                    'repartidores' => $repartidores,
                    'compradores'  => $compradores,
                    'productos'    => $productos,
                    'reels'        => $reels,
                ],
            ]);
        } catch (Throwable $e) {
            jout(['ok' => false, 'error' => 'Error árbol: ' . $e->getMessage()], 500);
        }
        break;

    // Mutación rápida: banear / activar cuentas (usuario/vendedor/repartidor)
    case 'banear_usuario':
        require_fields($data, ['usuario_id']);
        $uid = (int)$data['usuario_id'];
        if ($uid === (int)$user['id']) jout(['ok' => false, 'error' => 'No puedes banearte a ti mismo'], 400);
        try {
            db()->beginTransaction();
            $st = db()->prepare("SELECT activo FROM usuarios WHERE id = ?");
            $st->execute([$uid]);
            $cur = $st->fetchColumn();
            if ($cur === false) { db()->rollBack(); jout(['ok' => false, 'error' => 'Usuario no existe'], 404); }
            $nuevo = $cur ? 0 : 1;
            $up = db()->prepare("UPDATE usuarios SET activo = ? WHERE id = ?");
            $up->execute([$nuevo, $uid]);

            // Notificar al usuario en su buzón de chat
            $msg = $nuevo
                ? '✅ Tu cuenta ha sido reactivada por el administrador.'
                : '⛔ Tu cuenta fue suspendida por el administrador.';
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], $uid, $msg]);

            db()->commit();
            jout(['ok' => true, 'activo' => $nuevo]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // Eliminación física/lógica de reel — desmarca es_reel y desactiva si corresponde
    case 'eliminar_reel':
        require_fields($data, ['producto_id']);
        try {
            $st = db()->prepare("UPDATE productos SET es_reel = 0, video_url = NULL WHERE id = ?");
            $st->execute([(int)$data['producto_id']]);
            jout(['ok' => true]);
        } catch (Throwable $e) {
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
