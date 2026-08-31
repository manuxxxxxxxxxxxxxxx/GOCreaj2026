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

            db()->commit();
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }

        try {
            $notaMsg = trim($data['notas'] ?? '');
            $chatMsg = $data['decision'] === 'aprobado'
                ? "✅ Tu solicitud de rol *{$s['rol_solicitado']}* ha sido aprobada. ¡Bienvenido a bordo! 🎉"
                : "❌ Tu solicitud de rol *{$s['rol_solicitado']}* fue rechazada." . ($notaMsg ? "\n📝 Motivo: {$notaMsg}" : ' Sin motivo adicional.');
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
               ->execute([$user['id'], $s['usuario_id'], $chatMsg]);
            crear_notificacion(
                (int)$s['usuario_id'],
                'sistema',
                $data['decision'] === 'aprobado' ? '¡Solicitud aprobada!' : 'Solicitud rechazada',
                $chatMsg
            );
        } catch (Throwable $chatErr) { /* no crítico */ }

        jout(['ok' => true]);
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
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 15)));
        $offset = ($page - 1) * $limit;

        $where = " WHERE 1=1";
        $params = [];
        if (!empty($_GET['q'])) {
            $where .= " AND (nombre LIKE ? OR email LIKE ? OR username LIKE ?)";
            $s = '%' . $_GET['q'] . '%';
            $params = [$s, $s, $s];
        }
        if (!empty($_GET['rol'])) {
            $where .= " AND rol = ?";
            $params[] = $_GET['rol'];
        }

        $st = db()->prepare(
            "SELECT id, nombre, username, email, telefono, rol, foto_perfil, municipio, activo, en_linea, created_at
             FROM usuarios{$where} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}"
        );
        $st->execute($params);
        $rows = $st->fetchAll();

        $stc = db()->prepare("SELECT COUNT(*) FROM usuarios{$where}");
        $stc->execute($params);
        $total = (int)$stc->fetchColumn();

        jout(['ok' => true, 'usuarios' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit]);
        break;

    case 'actualizar_usuario':
        require_fields($data, ['usuario_id']);
        $sets = [];
        $params = [];
        if (isset($data['rol']) && in_array($data['rol'], ['comprador','vendedor','repartidor','admin'])) {
            if ((int)$data['usuario_id'] === (int)$user['id']) {
                jout(['ok' => false, 'error' => 'No puedes cambiar tu propio rol. Otro administrador debe hacerlo.'], 403);
            }
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
        $pedidos = db()->query("SELECT id, numero_pedido, total, estado, created_at FROM pedidos ORDER BY created_at DESC LIMIT 10")->fetchAll();
        foreach ($pedidos as $p) {
            $actividad[] = ['tipo' => 'pedido', 'descripcion' => "Pedido #{$p['numero_pedido']} por \${$p['total']} — {$p['estado']}", 'fecha' => $p['created_at']];
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

            $tiendas = db()->query(
                "SELECT t.id, t.nombre, t.municipio, t.logo, t.activo, t.calificacion_promedio,
                        t.vendedor_id, u.nombre AS vendedor_nombre
                 FROM tiendas t
                 JOIN usuarios u ON u.id = t.vendedor_id
                 ORDER BY t.activo DESC, t.nombre ASC LIMIT 300"
            )->fetchAll();

            $reels = db()->query(
                "SELECT p.id, p.nombre, p.imagen, p.video_url, p.activo, p.es_reel,
                        t.nombre AS tienda_nombre, u.nombre AS vendedor_nombre,
                        (SELECT COUNT(*) FROM productos_reportes WHERE producto_id = p.id AND estado = 'pendiente') AS reportes
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
                    'tiendas'      => $tiendas,
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
        if ($uid === (int)$user['id']) jout(['ok' => false, 'error' => 'No puedes suspenderte a ti mismo'], 400);
        try {
            db()->beginTransaction();
            $st = db()->prepare("SELECT activo, nombre FROM usuarios WHERE id = ?");
            $st->execute([$uid]);
            $row = $st->fetch();
            if (!$row) { db()->rollBack(); jout(['ok' => false, 'error' => 'Usuario no existe'], 404); }
            $nuevo = $row['activo'] ? 0 : 1;
            $razon = trim($data['razon'] ?? '');
            $up = db()->prepare("UPDATE usuarios SET activo = ? WHERE id = ?");
            $up->execute([$nuevo, $uid]);
            db()->commit();
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }

        try {
            if ($nuevo === 0) {
                $msg = '⛔ Tu cuenta ha sido suspendida por el administrador.' . ($razon ? "\n📝 Motivo: {$razon}" : '');
            } else {
                $msg = '✅ Tu cuenta ha sido reactivada por el administrador. Ya puedes acceder con normalidad.';
            }
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], $uid, $msg]);
            crear_notificacion($uid, 'sistema', $nuevo === 0 ? 'Cuenta suspendida' : 'Cuenta reactivada', $msg);
        } catch (Throwable $chatErr) { /* no crítico */ }

        jout(['ok' => true, 'activo' => $nuevo]);
        break;

    // Suspende/reactiva una tienda puntual sin banear la cuenta completa del vendedor
    case 'toggle_tienda_activa':
        require_fields($data, ['tienda_id']);
        $tid = (int)$data['tienda_id'];
        $st = db()->prepare("SELECT activo, vendedor_id, nombre FROM tiendas WHERE id = ?");
        $st->execute([$tid]);
        $row = $st->fetch();
        if (!$row) jout(['ok' => false, 'error' => 'Tienda no encontrada'], 404);
        $nuevo = $row['activo'] ? 0 : 1;
        db()->prepare("UPDATE tiendas SET activo = ? WHERE id = ?")->execute([$nuevo, $tid]);
        $msg = $nuevo
            ? "✅ Tu tienda \"{$row['nombre']}\" fue reactivada por el administrador."
            : "⛔ Tu tienda \"{$row['nombre']}\" fue suspendida por el administrador. Tus productos ya no son visibles hasta que se reactive.";
        crear_notificacion((int)$row['vendedor_id'], 'sistema', $nuevo ? 'Tienda reactivada' : 'Tienda suspendida', $msg);
        jout(['ok' => true, 'activo' => $nuevo]);
        break;

    // ─────────── DASHBOARD FINANCIERO GLOBAL ───────────
    case 'metricas_financieras':
        $ventasTotales = (float)db()->query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado = 'entregado'")->fetchColumn();
        $comisionTotal = (float)db()->query("SELECT COALESCE(SUM(comision_plataforma),0) FROM pedidos WHERE estado = 'entregado'")->fetchColumn();
        $pagadoVendedores = (float)db()->query("SELECT COALESCE(SUM(total_vendedor),0) FROM pedidos WHERE estado = 'entregado'")->fetchColumn();
        $pagadoRepartidores = (float)db()->query("SELECT COALESCE(SUM(total_repartidor),0) FROM pedidos WHERE estado = 'entregado'")->fetchColumn();
        $porEstado = db()->query("SELECT estado, COUNT(*) AS total, COALESCE(SUM(total),0) AS monto FROM pedidos GROUP BY estado")->fetchAll();
        $retirosPendientes = (float)db()->query("SELECT COALESCE(SUM(monto),0) FROM retiros WHERE estado = 'pendiente'")->fetchColumn();
        $saldoEnWallets = (float)db()->query("SELECT COALESCE(SUM(saldo),0) FROM wallets")->fetchColumn();

        $ultimos30 = db()->query(
            "SELECT DATE(created_at) AS fecha, COUNT(*) AS pedidos, COALESCE(SUM(total),0) AS ventas
             FROM pedidos WHERE estado = 'entregado' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at) ORDER BY fecha ASC"
        )->fetchAll();

        $topTiendas = db()->query(
            "SELECT t.nombre, COUNT(p.id) AS pedidos, COALESCE(SUM(p.total),0) AS ventas
             FROM pedidos p JOIN tiendas t ON t.vendedor_id = p.vendedor_id
             WHERE p.estado = 'entregado' GROUP BY t.id ORDER BY ventas DESC LIMIT 10"
        )->fetchAll();

        jout([
            'ok' => true,
            'metricas' => [
                'ventas_totales' => $ventasTotales,
                'comision_plataforma' => $comisionTotal,
                'pagado_vendedores' => $pagadoVendedores,
                'pagado_repartidores' => $pagadoRepartidores,
                'retiros_pendientes' => $retirosPendientes,
                'saldo_en_wallets' => $saldoEnWallets,
                'por_estado' => $porEstado,
                'ultimos_30_dias' => $ultimos30,
                'top_tiendas' => $topTiendas,
            ],
        ]);
        break;

    // ─────────── ZONAS DE COBERTURA ───────────
    case 'municipios_cobertura':
        $st = db()->query("SELECT id, nombre, departamento, cobertura_activa FROM municipios_sv ORDER BY departamento, nombre");
        jout(['ok' => true, 'municipios' => $st->fetchAll()]);
        break;

    case 'toggle_cobertura':
        require_fields($data, ['municipio_id']);
        db()->prepare("UPDATE municipios_sv SET cobertura_activa = 1 - cobertura_activa WHERE id = ?")
            ->execute([(int)$data['municipio_id']]);
        $st = db()->prepare("SELECT cobertura_activa FROM municipios_sv WHERE id = ?");
        $st->execute([(int)$data['municipio_id']]);
        jout(['ok' => true, 'cobertura_activa' => (int)$st->fetchColumn()]);
        break;

    // ─────────── MONITOREO EN VIVO DE REPARTIDORES (mapa admin) ───────────
    case 'repartidores_activos':
        $repartidores = db()->query(
            "SELECT id, nombre, foto_perfil, telefono, lat, lng, en_linea,
                    repartidor_calificacion_promedio, repartidor_total_resenas
             FROM usuarios
             WHERE rol = 'repartidor' AND en_linea = 1 AND activo = 1"
        )->fetchAll();

        $pedidoSt = db()->prepare(
            "SELECT p.id, p.estado, p.progreso_repartidor, p.direccion_entrega,
                    p.lat_entrega, p.lng_entrega, p.repartidor_lat, p.repartidor_lng,
                    p.tiempo_estimado, p.trafico, p.total,
                    c.nombre AS comprador_nombre,
                    t.nombre AS tienda_nombre, t.lat AS tienda_lat, t.lng AS tienda_lng
             FROM pedidos p
             JOIN usuarios c ON c.id = p.comprador_id
             JOIN usuarios v ON v.id = p.vendedor_id
             LEFT JOIN tiendas t ON t.vendedor_id = v.id
             WHERE p.repartidor_id = ? AND p.estado = 'en_camino'
             ORDER BY p.created_at DESC LIMIT 1"
        );

        foreach ($repartidores as &$r) {
            $pedidoSt->execute([$r['id']]);
            $activo = $pedidoSt->fetch();
            $r['pedido_activo'] = $activo ?: null;
            if ($activo && $activo['repartidor_lat'] && $activo['repartidor_lng']) {
                $r['lat'] = $activo['repartidor_lat'];
                $r['lng'] = $activo['repartidor_lng'];
            }
        }
        jout(['ok' => true, 'repartidores' => $repartidores]);
        break;

    case 'repartidor_detalle':
        $rid = (int)($_GET['repartidor_id'] ?? 0);
        $st = db()->prepare(
            "SELECT id, nombre, foto_perfil, telefono, email, en_linea, lat, lng,
                    repartidor_calificacion_promedio, repartidor_total_resenas, created_at
             FROM usuarios WHERE id = ? AND rol = 'repartidor'"
        );
        $st->execute([$rid]);
        $rep = $st->fetch();
        if (!$rep) jout(['ok' => false, 'error' => 'Repartidor no encontrado'], 404);

        $coment = db()->prepare(
            "SELECT cr.estrellas, cr.comentario, cr.created_at, u.nombre AS comprador_nombre
             FROM calificaciones_repartidor cr
             JOIN usuarios u ON u.id = cr.comprador_id
             WHERE cr.repartidor_id = ?
             ORDER BY cr.created_at DESC LIMIT 20"
        );
        $coment->execute([$rid]);
        $rep['comentarios'] = $coment->fetchAll();

        $entregasHoy = db()->prepare(
            "SELECT COUNT(*) FROM pedidos WHERE repartidor_id = ? AND estado = 'entregado' AND DATE(created_at) = CURDATE()"
        );
        $entregasHoy->execute([$rid]);
        $rep['entregas_hoy'] = (int)$entregasHoy->fetchColumn();

        $pedidoSt = db()->prepare(
            "SELECT p.id, p.estado, p.progreso_repartidor, p.direccion_entrega,
                    p.lat_entrega, p.lng_entrega, p.repartidor_lat, p.repartidor_lng,
                    p.tiempo_estimado, p.trafico,
                    c.nombre AS comprador_nombre,
                    t.nombre AS tienda_nombre, t.lat AS tienda_lat, t.lng AS tienda_lng
             FROM pedidos p
             JOIN usuarios c ON c.id = p.comprador_id
             JOIN usuarios v ON v.id = p.vendedor_id
             LEFT JOIN tiendas t ON t.vendedor_id = v.id
             WHERE p.repartidor_id = ? AND p.estado = 'en_camino'
             ORDER BY p.created_at DESC LIMIT 1"
        );
        $pedidoSt->execute([$rid]);
        $rep['pedido_activo'] = $pedidoSt->fetch() ?: null;

        jout(['ok' => true, 'repartidor' => $rep]);
        break;

    // ─────────── RETIROS DE WALLET (vendedor/repartidor) ───────────
    case 'retiros':
        $estado = $_GET['estado'] ?? null;
        $q = "SELECT r.*, u.nombre AS usuario_nombre, u.rol AS usuario_rol, u.email
              FROM retiros r JOIN usuarios u ON u.id = r.usuario_id WHERE 1=1";
        $params = [];
        if ($estado && $estado !== 'todos') { $q .= " AND r.estado = ?"; $params[] = $estado; }
        $q .= " ORDER BY r.created_at ASC";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'retiros' => $st->fetchAll()]);
        break;

    case 'resolver_retiro':
        require_fields($data, ['retiro_id', 'decision']);
        if (!in_array($data['decision'], ['aprobado', 'rechazado', 'pagado'], true)) {
            jout(['ok' => false, 'error' => 'Decisión inválida'], 400);
        }
        try {
            db()->beginTransaction();
            $sel = db()->prepare("SELECT * FROM retiros WHERE id = ? FOR UPDATE");
            $sel->execute([(int)$data['retiro_id']]);
            $ret = $sel->fetch();
            if (!$ret) { db()->rollBack(); jout(['ok' => false, 'error' => 'Retiro no encontrado'], 404); }
            if (in_array($ret['estado'], ['rechazado', 'pagado'], true)) {
                db()->rollBack(); jout(['ok' => false, 'error' => 'Este retiro ya fue resuelto'], 400);
            }

            db()->prepare("UPDATE retiros SET estado = ?, notas_admin = ?, resuelto_at = NOW() WHERE id = ?")
                ->execute([$data['decision'], $data['notas'] ?? null, $ret['id']]);

            if ($data['decision'] === 'rechazado') {
                db()->prepare("UPDATE wallets SET saldo = saldo + ? WHERE usuario_id = ?")
                    ->execute([(float)$ret['monto'], (int)$ret['usuario_id']]);
                db()->prepare("INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia) VALUES (?, 'retiro_rechazado', ?, 'Retiro rechazado por el admin')")
                    ->execute([(int)$ret['usuario_id'], (float)$ret['monto']]);
            }

            $msg = $data['decision'] === 'aprobado'
                ? "✅ Tu retiro de \$" . number_format((float)$ret['monto'], 2) . " fue aprobado y está en proceso de pago."
                : ($data['decision'] === 'pagado'
                    ? "💸 Tu retiro de \$" . number_format((float)$ret['monto'], 2) . " fue pagado."
                    : "❌ Tu retiro de \$" . number_format((float)$ret['monto'], 2) . " fue rechazado y el saldo volvió a tu wallet.");
            crear_notificacion((int)$ret['usuario_id'], 'sistema', 'Retiro ' . $data['decision'], $msg);
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$ret['usuario_id'], $msg]);

            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // Eliminación física/lógica de reel — desmarca es_reel y desactiva si corresponde
    case 'eliminar_reel':
        require_fields($data, ['producto_id']);
        try {
            db()->beginTransaction();
            $st = db()->prepare("UPDATE productos SET es_reel = 0, video_url = NULL WHERE id = ?");
            $st->execute([(int)$data['producto_id']]);
            db()->prepare("UPDATE productos_reportes SET estado = 'resuelto', resuelto_por = ?, resuelto_at = NOW() WHERE producto_id = ? AND estado = 'pendiente'")
                ->execute([$user['id'], (int)$data['producto_id']]);
            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ─────────── MODERACIÓN DE REPORTES DE REELS ───────────
    case 'reportes_reel':
        $productoId = (int)($_GET['producto_id'] ?? 0);
        if (!$productoId) jout(['ok' => false, 'error' => 'producto_id requerido'], 400);
        $st = db()->prepare(
            "SELECT r.id, r.motivo, r.created_at, r.estado, u.nombre AS usuario_nombre
             FROM productos_reportes r JOIN usuarios u ON u.id = r.usuario_id
             WHERE r.producto_id = ? ORDER BY r.created_at DESC"
        );
        $st->execute([$productoId]);
        jout(['ok' => true, 'reportes' => $st->fetchAll()]);
        break;

    case 'descartar_reportes':
        require_fields($data, ['producto_id']);
        db()->prepare("UPDATE productos_reportes SET estado = 'descartado', resuelto_por = ?, resuelto_at = NOW() WHERE producto_id = ? AND estado = 'pendiente'")
            ->execute([$user['id'], (int)$data['producto_id']]);
        jout(['ok' => true]);
        break;

    case 'advertir_vendedor_reel':
        require_fields($data, ['producto_id']);
        $st = db()->prepare(
            "SELECT t.vendedor_id, p.nombre FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.id = ?"
        );
        $st->execute([(int)$data['producto_id']]);
        $row = $st->fetch();
        if (!$row) jout(['ok' => false, 'error' => 'Producto no encontrado'], 404);

        $motivo = trim($data['motivo'] ?? '');
        $msg = "⚠️ Tu publicación \"{$row['nombre']}\" fue reportada por la comunidad y revisada por el equipo de SVGO." . ($motivo ? "\n📝 {$motivo}" : '');
        crear_notificacion((int)$row['vendedor_id'], 'sistema', 'Advertencia sobre tu publicación', $msg);
        db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
            ->execute([$user['id'], (int)$row['vendedor_id'], $msg]);
        db()->prepare("UPDATE productos_reportes SET estado = 'resuelto', resuelto_por = ?, resuelto_at = NOW() WHERE producto_id = ? AND estado = 'pendiente'")
            ->execute([$user['id'], (int)$data['producto_id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
