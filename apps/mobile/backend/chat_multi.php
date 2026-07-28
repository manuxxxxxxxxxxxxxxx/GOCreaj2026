<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'conversaciones';
$data   = jread();
$uid    = (int)$user['id'];

function chat_meta_get(int $uid, int $otro): array {
    $st = db()->prepare("SELECT archivado, favorito FROM chat_meta WHERE usuario_id = ? AND otro_id = ?");
    $st->execute([$uid, $otro]);
    return $st->fetch() ?: ['archivado' => 0, 'favorito' => 0];
}

function chat_meta_upsert(int $uid, int $otro, string $field, int $val): void {
    db()->prepare(
        "INSERT INTO chat_meta (usuario_id, otro_id, $field) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE $field = ?"
    )->execute([$uid, $otro, $val, $val]);
}

switch ($action) {

    case 'conversaciones': {
        $tab = $_GET['tab'] ?? 'todos';
        $q   = trim($_GET['q'] ?? '');

        $st = db()->prepare("
            SELECT CASE WHEN emisor_id = :uid THEN receptor_id ELSE emisor_id END AS otro_id,
                   MAX(created_at) AS ultimo
            FROM chats
            WHERE emisor_id = :uid2 OR receptor_id = :uid3
            GROUP BY otro_id
            ORDER BY ultimo DESC
        ");
        $st->execute(['uid' => $uid, 'uid2' => $uid, 'uid3' => $uid]);
        $rows = $st->fetchAll();

        $conversaciones = [];
        foreach ($rows as $r) {
            $otro = (int)$r['otro_id'];

            $us = db()->prepare("SELECT id, nombre, username, foto_perfil, rol, en_linea FROM usuarios WHERE id = ?");
            $us->execute([$otro]);
            $usr = $us->fetch();
            if (!$usr) continue;

            if ($q && stripos($usr['nombre'], $q) === false && stripos($usr['username'] ?? '', $q) === false) continue;

            $lm = db()->prepare("
                SELECT id, mensaje, tipo, emisor_id, leido, adjunto, lat, lng, created_at FROM chats
                WHERE (emisor_id = :a AND receptor_id = :b) OR (emisor_id = :b2 AND receptor_id = :a2)
                ORDER BY created_at DESC LIMIT 1
            ");
            $lm->execute(['a' => $uid, 'b' => $otro, 'b2' => $otro, 'a2' => $uid]);
            $usr['ultimo_mensaje'] = $lm->fetch() ?: null;

            $un = db()->prepare("SELECT COUNT(*) as cnt FROM chats WHERE emisor_id = ? AND receptor_id = ? AND leido = 0");
            $un->execute([$otro, $uid]);
            $usr['no_leidos'] = (int)($un->fetch()['cnt'] ?? 0);

            $meta = chat_meta_get($uid, $otro);
            $usr['archivado'] = (int)$meta['archivado'];
            $usr['favorito']  = (int)$meta['favorito'];

            $conversaciones[] = $usr;
        }

        if ($tab === 'noLeidos') {
            $conversaciones = array_values(array_filter($conversaciones, fn($c) => $c['no_leidos'] > 0 && !$c['archivado']));
        } elseif ($tab === 'favoritos') {
            $conversaciones = array_values(array_filter($conversaciones, fn($c) => $c['favorito'] == 1));
        } elseif ($tab === 'archivados') {
            $conversaciones = array_values(array_filter($conversaciones, fn($c) => $c['archivado'] == 1));
        } else {
            $conversaciones = array_values(array_filter($conversaciones, fn($c) => !$c['archivado']));
        }

        $ts = db()->prepare("SELECT COUNT(*) as cnt FROM chats WHERE receptor_id = ? AND leido = 0");
        $ts->execute([$uid]);
        $totalUnread = (int)($ts->fetch()['cnt'] ?? 0);

        jout(['ok' => true, 'conversaciones' => $conversaciones, 'total_no_leidos' => $totalUnread]);
        break;
    }

    case 'mensajes': {
        $otro = (int)($_GET['otro_id'] ?? 0);
        if (!$otro) jout(['ok' => false, 'error' => 'otro_id requerido'], 400);

        $st = db()->prepare("
            SELECT * FROM chats
            WHERE (emisor_id = :a AND receptor_id = :b) OR (emisor_id = :b2 AND receptor_id = :a2)
            ORDER BY created_at ASC LIMIT 200
        ");
        $st->execute(['a' => $uid, 'b' => $otro, 'b2' => $otro, 'a2' => $uid]);
        $mensajes = $st->fetchAll();

        foreach ($mensajes as &$m) {
            if (!empty($m['reply_snapshot'])) {
                $decoded = json_decode($m['reply_snapshot'], true);
                $m['reply_snapshot'] = is_array($decoded) ? $decoded : null;
            }
        }
        unset($m);

        if ($mensajes) {
            $ids = array_column($mensajes, 'id');
            $in  = implode(',', array_fill(0, count($ids), '?'));
            $rq  = db()->prepare("SELECT chat_id, emoji, usuario_id FROM chat_reacciones WHERE chat_id IN ($in)");
            $rq->execute($ids);
            $byChat = [];
            foreach ($rq->fetchAll() as $r) {
                $byChat[(int)$r['chat_id']][] = $r;
            }
            foreach ($mensajes as &$m) {
                $grupo = [];
                foreach ($byChat[(int)$m['id']] ?? [] as $r) {
                    $e = $r['emoji'];
                    if (!isset($grupo[$e])) $grupo[$e] = ['emoji' => $e, 'count' => 0, 'mio' => false];
                    $grupo[$e]['count']++;
                    if ((int)$r['usuario_id'] === $uid) $grupo[$e]['mio'] = true;
                }
                $m['reacciones'] = array_values($grupo);
            }
            unset($m);
        }

        db()->prepare("UPDATE chats SET leido = 1 WHERE receptor_id = ? AND emisor_id = ? AND leido = 0")
             ->execute([$uid, $otro]);

        $ou = db()->prepare("SELECT id, nombre, username, foto_perfil, rol, en_linea, ultimo_visto FROM usuarios WHERE id = ?");
        $ou->execute([$otro]);
        $otroInfo = $ou->fetch() ?: null;

        jout(['ok' => true, 'mensajes' => $mensajes, 'otro' => $otroInfo]);
        break;
    }

    case 'enviar': {
        $receptor = (int)($data['receptor_id'] ?? 0);
        if (!$receptor) jout(['ok' => false, 'error' => 'receptor_id requerido'], 400);

        $tipo = in_array($data['tipo'] ?? 'texto', ['texto','imagen','ubicacion','pdf','audio'])
            ? ($data['tipo'] ?? 'texto') : 'texto';
        $mensaje  = trim($data['mensaje'] ?? '');
        $adjunto  = null;
        $adjNombre = null;
        $adjTamano = null;
        $adjDuracion = null;
        $lat = isset($data['lat']) ? (float)$data['lat'] : null;
        $lng = isset($data['lng']) ? (float)$data['lng'] : null;

        // Si adjunto no viene como data URI, es una URL ya existente (reenvío de otro mensaje)
        $esDataUri = !empty($data['adjunto']) && strpos($data['adjunto'], 'data:') === 0;

        if ($tipo === 'imagen') {
            if (empty($data['adjunto'])) jout(['ok' => false, 'error' => 'adjunto requerido'], 400);
            $adjunto = $esDataUri ? save_base64_image($data['adjunto'], 'chat', 'msg_' . $uid) : $data['adjunto'];
            if (!$adjunto) jout(['ok' => false, 'error' => 'Error al guardar imagen'], 500);
            if (!$mensaje) $mensaje = '📷 Imagen';
        } elseif ($tipo === 'ubicacion') {
            if (!$lat || !$lng) jout(['ok' => false, 'error' => 'lat/lng requeridos'], 400);
            if (!$mensaje) $mensaje = '📍 Ubicación compartida';
        } elseif ($tipo === 'pdf') {
            if (empty($data['adjunto'])) jout(['ok' => false, 'error' => 'adjunto requerido'], 400);
            $adjunto = $esDataUri ? save_base64_pdf($data['adjunto'], 'chat', 'doc_' . $uid) : $data['adjunto'];
            if (!$adjunto) jout(['ok' => false, 'error' => 'Error al guardar el PDF'], 500);
            $adjNombre = $data['nombre'] ?? 'Documento.pdf';
            $adjTamano = isset($data['tamano']) ? (int)$data['tamano'] : null;
            if (!$mensaje) $mensaje = '📄 Documento';
        } elseif ($tipo === 'audio') {
            if (empty($data['adjunto'])) jout(['ok' => false, 'error' => 'adjunto requerido'], 400);
            $adjunto = $esDataUri ? save_base64_audio($data['adjunto'], 'chat', 'audio_' . $uid) : $data['adjunto'];
            if (!$adjunto) jout(['ok' => false, 'error' => 'Error al guardar el audio'], 500);
            $adjDuracion = isset($data['duracion']) ? (int)$data['duracion'] : 0;
            if (!$mensaje) $mensaje = '🎤 Nota de voz';
        } else {
            if (!$mensaje) jout(['ok' => false, 'error' => 'Mensaje vacío'], 400);
        }

        $reply_to_id  = isset($data['reply_to_id']) ? (int)$data['reply_to_id'] : null;
        $reply_snap   = null;
        if ($reply_to_id && !empty($data['reply_snapshot'])) {
            $reply_snap = json_encode($data['reply_snapshot'], JSON_UNESCAPED_UNICODE);
        }

        $st = db()->prepare("
            INSERT INTO chats (pedido_id, emisor_id, receptor_id, mensaje, tipo, adjunto, adjunto_nombre, adjunto_tamano, adjunto_duracion, lat, lng, reply_to_id, reply_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $st->execute([
            $data['pedido_id'] ?? null, $uid, $receptor, $mensaje, $tipo,
            $adjunto, $adjNombre, $adjTamano, $adjDuracion,
            $lat, $lng, $reply_to_id, $reply_snap,
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;
    }

    case 'toggle_archivado': {
        $otro = (int)($data['otro_id'] ?? 0);
        if (!$otro) jout(['ok' => false, 'error' => 'otro_id requerido'], 400);
        $meta  = chat_meta_get($uid, $otro);
        $nuevo = $meta['archivado'] ? 0 : 1;
        chat_meta_upsert($uid, $otro, 'archivado', $nuevo);
        jout(['ok' => true, 'archivado' => $nuevo]);
        break;
    }

    case 'toggle_favorito': {
        $otro = (int)($data['otro_id'] ?? 0);
        if (!$otro) jout(['ok' => false, 'error' => 'otro_id requerido'], 400);
        $meta  = chat_meta_get($uid, $otro);
        $nuevo = $meta['favorito'] ? 0 : 1;
        chat_meta_upsert($uid, $otro, 'favorito', $nuevo);
        jout(['ok' => true, 'favorito' => $nuevo]);
        break;
    }

    case 'unread_total': {
        $st = db()->prepare("SELECT COUNT(*) as cnt FROM chats WHERE receptor_id = ? AND leido = 0");
        $st->execute([$uid]);
        jout(['ok' => true, 'total' => (int)($st->fetch()['cnt'] ?? 0)]);
        break;
    }

    case 'reaccionar': {
        $chatId = (int)($data['chat_id'] ?? 0);
        $emoji  = trim($data['emoji'] ?? '');
        if (!$chatId || !$emoji) jout(['ok' => false, 'error' => 'chat_id y emoji requeridos'], 400);

        $st = db()->prepare("SELECT emoji FROM chat_reacciones WHERE chat_id = ? AND usuario_id = ?");
        $st->execute([$chatId, $uid]);
        $existing = $st->fetch();

        if ($existing && $existing['emoji'] === $emoji) {
            db()->prepare("DELETE FROM chat_reacciones WHERE chat_id = ? AND usuario_id = ?")
                 ->execute([$chatId, $uid]);
            jout(['ok' => true, 'reaccion' => null]);
        } else {
            db()->prepare("
                INSERT INTO chat_reacciones (chat_id, usuario_id, emoji) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)
            ")->execute([$chatId, $uid, $emoji]);
            jout(['ok' => true, 'reaccion' => $emoji]);
        }
        break;
    }

    case 'eliminar_mensaje': {
        $chatId = (int)($data['chat_id'] ?? 0);
        if (!$chatId) jout(['ok' => false, 'error' => 'chat_id requerido'], 400);
        db()->prepare("DELETE FROM chats WHERE id = ? AND emisor_id = ?")->execute([$chatId, $uid]);
        jout(['ok' => true]);
        break;
    }

    case 'iniciar_llamada': {
        $receptor = (int)($data['receptor_id'] ?? 0);
        if (!$receptor) jout(['ok' => false, 'error' => 'receptor_id requerido'], 400);
        $tipo = in_array($data['tipo'] ?? 'voz', ['voz','video']) ? ($data['tipo'] ?? 'voz') : 'voz';
        $room = 'svgo_' . $uid . '_' . $receptor . '_' . time();

        db()->prepare("INSERT INTO llamadas (emisor_id, receptor_id, tipo, estado, webrtc_room) VALUES (?, ?, ?, 'iniciando', ?)")
             ->execute([$uid, $receptor, $tipo, $room]);
        jout(['ok' => true, 'llamada_id' => (int)db()->lastInsertId(), 'room' => $room]);
        break;
    }

    case 'responder_llamada': {
        $llamadaId = (int)($data['llamada_id'] ?? 0);
        $aceptar   = !empty($data['aceptar']);
        if (!$llamadaId) jout(['ok' => false, 'error' => 'llamada_id requerido'], 400);
        $estado = $aceptar ? 'activa' : 'rechazada';
        db()->prepare("UPDATE llamadas SET estado = ? WHERE id = ? AND receptor_id = ?")
             ->execute([$estado, $llamadaId, $uid]);
        jout(['ok' => true, 'estado' => $estado]);
        break;
    }

    case 'finalizar_llamada': {
        $llamadaId = (int)($data['llamada_id'] ?? 0);
        $duracion  = (int)($data['duracion'] ?? 0);
        if (!$llamadaId) jout(['ok' => false, 'error' => 'llamada_id requerido'], 400);
        db()->prepare("UPDATE llamadas SET estado = 'finalizada', duracion = ? WHERE id = ? AND (emisor_id = ? OR receptor_id = ?)")
             ->execute([$duracion, $llamadaId, $uid, $uid]);
        jout(['ok' => true]);
        break;
    }

    case 'llamadas_entrantes': {
        $st = db()->prepare("
            SELECT ll.id, ll.tipo, ll.webrtc_room, u.nombre, u.foto_perfil, u.id AS emisor_id
            FROM llamadas ll
            JOIN usuarios u ON u.id = ll.emisor_id
            WHERE ll.receptor_id = ? AND ll.estado = 'iniciando'
              AND ll.created_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)
            ORDER BY ll.created_at DESC LIMIT 1
        ");
        $st->execute([$uid]);
        jout(['ok' => true, 'llamada' => $st->fetch() ?: null]);
        break;
    }

    // ─── Contactos permitidos para iniciar un chat nuevo ───
    // Comprador: vendedores/repartidores de sus pedidos. Vendedor: sus compradores/repartidores.
    // Repartidor: compradores/vendedores de sus entregas. Admin: cualquiera (soporte/moderación).
    case 'contactos': {
        $rol = $user['rol'];

        if ($rol === 'admin') {
            $st = db()->prepare("
                SELECT id, nombre, username, foto_perfil, rol, en_linea
                FROM usuarios WHERE activo = 1 AND id <> ?
                ORDER BY en_linea DESC, nombre ASC
            ");
            $st->execute([$uid]);
            jout(['ok' => true, 'contactos' => $st->fetchAll()]);
            break;
        }

        if ($rol === 'comprador') {
            $sql = "SELECT vendedor_id AS otro_id FROM pedidos WHERE comprador_id = ?
                    UNION
                    SELECT repartidor_id AS otro_id FROM pedidos WHERE comprador_id = ? AND repartidor_id IS NOT NULL";
            $params = [$uid, $uid];
        } elseif ($rol === 'vendedor') {
            $sql = "SELECT comprador_id AS otro_id FROM pedidos WHERE vendedor_id = ?
                    UNION
                    SELECT repartidor_id AS otro_id FROM pedidos WHERE vendedor_id = ? AND repartidor_id IS NOT NULL";
            $params = [$uid, $uid];
        } else { // repartidor
            $sql = "SELECT comprador_id AS otro_id FROM pedidos WHERE repartidor_id = ?
                    UNION
                    SELECT vendedor_id AS otro_id FROM pedidos WHERE repartidor_id = ?";
            $params = [$uid, $uid];
        }

        $ids = db()->prepare($sql);
        $ids->execute($params);
        $otroIds = array_map('intval', array_column($ids->fetchAll(), 'otro_id'));

        if (!$otroIds) { jout(['ok' => true, 'contactos' => []]); break; }

        $in = implode(',', array_fill(0, count($otroIds), '?'));
        $st = db()->prepare("
            SELECT id, nombre, username, foto_perfil, rol, en_linea
            FROM usuarios WHERE activo = 1 AND id IN ($in)
            ORDER BY en_linea DESC, nombre ASC
        ");
        $st->execute($otroIds);
        jout(['ok' => true, 'contactos' => $st->fetchAll()]);
        break;
    }

    // ─── Abrir chat desde un producto (Reels) con mensaje automatizado ───
    case 'desde_producto': {
        require_fields($data, ['producto_id']);
        $pid = (int)$data['producto_id'];

        $st = db()->prepare(
            "SELECT p.id, p.nombre, p.imagen, p.precio, t.vendedor_id, t.nombre AS tienda_nombre, u.nombre AS vendedor_nombre
             FROM productos p
             JOIN tiendas t ON t.id = p.tienda_id
             JOIN usuarios u ON u.id = t.vendedor_id
             WHERE p.id = ? LIMIT 1"
        );
        $st->execute([$pid]);
        $p = $st->fetch();
        if (!$p) jout(['ok' => false, 'error' => 'Producto no encontrado'], 404);

        $vendedor_id = (int)$p['vendedor_id'];
        $template = $data['mensaje'] ?? "Hola, vi tu producto *{$p['nombre']}* en Reels y me interesa.";
        $snapshot = json_encode([
            'producto_id' => (int)$p['id'],
            'nombre'      => $p['nombre'],
            'imagen'      => $p['imagen'],
            'precio'      => (float)$p['precio'],
            'tienda'      => $p['tienda_nombre'],
        ], JSON_UNESCAPED_UNICODE);

        try {
            db()->prepare(
                "INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo, reply_snapshot)
                 VALUES (?, ?, ?, 'producto', ?)"
            )->execute([$uid, $vendedor_id, $template, $snapshot]);
        } catch (PDOException $e) {
            // Fallback en esquemas que aún no tienen reply_snapshot
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$uid, $vendedor_id, $template]);
        }

        jout([
            'ok' => true,
            'otro_id' => $vendedor_id,
            'otro_nombre' => $p['vendedor_nombre'],
            'producto' => $p,
        ]);
        break;
    }

    // ─── Buscar usuarios para iniciar nuevo chat ───
    case 'buscar_usuarios': {
        $q = trim($_GET['q'] ?? '');
        $rol = $_GET['rol'] ?? '';
        $sql = "SELECT id, nombre, username, foto_perfil, rol, en_linea
                FROM usuarios
                WHERE activo = 1 AND id <> ?";
        $params = [$uid];
        if ($q !== '') {
            $sql .= " AND (nombre LIKE ? OR username LIKE ? OR email LIKE ?)";
            $like = "%{$q}%";
            $params[] = $like; $params[] = $like; $params[] = $like;
        }
        if ($rol && in_array($rol, ['comprador','vendedor','repartidor','admin'])) {
            $sql .= " AND rol = ?";
            $params[] = $rol;
        }
        $sql .= " ORDER BY en_linea DESC, nombre ASC LIMIT 30";
        $st = db()->prepare($sql);
        $st->execute($params);
        jout(['ok' => true, 'usuarios' => $st->fetchAll()]);
        break;
    }

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
