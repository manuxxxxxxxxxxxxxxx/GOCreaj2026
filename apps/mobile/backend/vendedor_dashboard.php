<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'vendedor') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

// Autosana el despacho automático en cada request -- ver ofrecer_siguiente_repartidor()
// en conexion.php. El vendedor consulta 'mis_pedidos' seguido mientras espera repartidor,
// así que esto alcanza para que la oferta avance aunque el repartidor ofrecido nunca conteste.
avanzar_despacho_global();

$action = $_GET['action'] ?? 'mis_tiendas';
$data = jread();

switch ($action) {

    case 'mis_tiendas':
        $st = db()->prepare("SELECT * FROM tiendas WHERE vendedor_id = ?");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    // Wizard completo de creación de tienda en un solo call
    case 'crear_tienda':
        require_fields($data, ['nombre','municipio','lat','lng']);
        if (mb_strlen(trim($data['nombre'])) > MAX_NOMBRE_TIENDA) {
            jout(['ok' => false, 'error' => 'El nombre de la tienda no puede pasar de ' . MAX_NOMBRE_TIENDA . ' caracteres'], 400);
        }
        if (!empty($data['descripcion']) && mb_strlen($data['descripcion']) > MAX_DESCRIPCION_TIENDA) {
            jout(['ok' => false, 'error' => 'La descripción no puede pasar de ' . MAX_DESCRIPCION_TIENDA . ' caracteres'], 400);
        }
        $logo = !empty($data['logo']) && str_starts_with($data['logo'], 'data:image')
            ? save_base64_image($data['logo'], 'tiendas', 'logo_' . $user['id']) : null;
        $portada = !empty($data['portada']) && str_starts_with($data['portada'], 'data:image')
            ? save_base64_image($data['portada'], 'tiendas', 'portada_' . $user['id']) : null;
        $metodos = isset($data['metodos_pago']) ? (is_array($data['metodos_pago']) ? implode(',', $data['metodos_pago']) : $data['metodos_pago']) : null;

        $st = db()->prepare(
            "INSERT INTO tiendas (vendedor_id, nombre, descripcion, categoria, telefono, municipio, direccion, lat, lng, hora_apertura, hora_cierre, logo, portada, metodos_pago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $st->execute([
            $user['id'],
            $data['nombre'],
            $data['descripcion'] ?? '',
            $data['categoria'] ?? null,
            $data['telefono'] ?? null,
            $data['municipio'],
            $data['direccion'] ?? '',
            $data['lat'],
            $data['lng'],
            $data['hora_apertura'] ?? null,
            $data['hora_cierre'] ?? null,
            $logo,
            $portada,
            $metodos,
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'actualizar_tienda':
        require_fields($data, ['tienda_id']);
        if (isset($data['nombre']) && mb_strlen(trim($data['nombre'])) > MAX_NOMBRE_TIENDA) {
            jout(['ok' => false, 'error' => 'El nombre de la tienda no puede pasar de ' . MAX_NOMBRE_TIENDA . ' caracteres'], 400);
        }
        if (isset($data['descripcion']) && mb_strlen($data['descripcion']) > MAX_DESCRIPCION_TIENDA) {
            jout(['ok' => false, 'error' => 'La descripción no puede pasar de ' . MAX_DESCRIPCION_TIENDA . ' caracteres'], 400);
        }
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
            'telefono'     => $data['telefono']       ?? null,
        ];
        foreach ($map as $col => $val) {
            if ($val !== null) { $sets[] = "$col = ?"; $params[] = $val; }
        }
        if (isset($data['metodos_pago'])) {
            $sets[] = "metodos_pago = ?";
            $params[] = is_array($data['metodos_pago']) ? implode(',', $data['metodos_pago']) : $data['metodos_pago'];
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
        $cat = $data['categoria'] ?? 'general';
        if (!in_array($cat, CATEGORIAS_VALIDAS, true)) jout(['ok' => false, 'error' => 'Categoría inválida'], 400);
        if ((float)$data['precio'] <= 0 || (float)$data['precio'] > MAX_PRECIO_PRODUCTO) {
            jout(['ok' => false, 'error' => 'El precio debe ser mayor a $0 y no más de $' . number_format(MAX_PRECIO_PRODUCTO, 2)], 400);
        }

        // Galería: hasta MAX_IMAGENES_PRODUCTO fotos en `imagenes` (array base64) -- `imagen`
        // (single, legacy) se mantiene como respaldo/compatibilidad si llega solo.
        $imagenesArr = [];
        if (!empty($data['imagenes']) && is_array($data['imagenes'])) {
            foreach (array_slice($data['imagenes'], 0, MAX_IMAGENES_PRODUCTO) as $img) {
                $url = save_base64_image($img, 'productos', 'p_' . $user['id']);
                if ($url) $imagenesArr[] = $url;
            }
        }
        $imagen = $imagenesArr[0] ?? (!empty($data['imagen']) ? save_base64_image($data['imagen'], 'productos', 'p_' . $user['id']) : null);
        if ($imagen && !$imagenesArr) $imagenesArr[] = $imagen;
        $imagenesJson = $imagenesArr ? json_encode($imagenesArr) : null;
        $video = null;
        if (!empty($_FILES['video'])) {
            // Reel subido como multipart/form-data (ver apps/mobile/frontend/src/lib/api/client.ts,
            // apiUpload) -- evita el overhead de base64 y permite progreso real de subida.
            $video = save_uploaded_video($_FILES['video'], 'reels', 'r_' . $user['id']);
            if ($video === null) {
                // No crear el producto sin video en silencio -- el vendedor pensaría que se publicó bien.
                jout(['ok' => false, 'error' => 'No se pudo subir el video. Prueba con uno más liviano o revisa tu conexión.'], 400);
            }
        } elseif (!empty($data['video'])) {
            $video = str_starts_with($data['video'], 'data:video')
                ? save_base64_video($data['video'], 'reels', 'r_' . $user['id'])
                : $data['video'];
        }
        $stockIlimitado = !empty($data['stock_ilimitado']) ? 1 : 0;
        $stock = $stockIlimitado ? 0 : (int)($data['stock'] ?? 0);
        $estado_stock = ($stockIlimitado || $stock > 0) ? 'disponible' : 'agotado';
        $precioOferta = (isset($data['precio_oferta']) && $data['precio_oferta'] !== '') ? (float)$data['precio_oferta'] : null;
        if ($precioOferta !== null && $precioOferta >= (float)$data['precio']) {
            jout(['ok' => false, 'error' => 'El precio de oferta debe ser menor al precio normal'], 400);
        }
        // Oferta por porcentaje: el front ya manda precio_oferta calculado (monto final),
        // esto solo guarda con qué tipo/valor se armó para poder re-mostrarlo al editar.
        $ofertaTipo = null; $ofertaValor = null;
        if ($precioOferta !== null && !empty($data['oferta_tipo']) && in_array($data['oferta_tipo'], ['monto','porcentaje'], true)) {
            $ofertaTipo = $data['oferta_tipo'];
            $ofertaValor = isset($data['oferta_valor']) ? (float)$data['oferta_valor'] : null;
        }

        // Hashtags: se guardan sin "#" y separados por un solo espacio; el "#" se agrega
        // solo al mostrarlos, así el mismo valor sirve para buscar/comparar sin símbolos.
        $hashtags = null;
        if (!empty($data['hashtags'])) {
            $tags = preg_split('/[\s,#]+/', trim($data['hashtags']), -1, PREG_SPLIT_NO_EMPTY);
            $tags = array_values(array_unique(array_map('mb_strtolower', $tags)));
            if ($tags) $hashtags = implode(' ', $tags);
        }

        $st = db()->prepare(
            "INSERT INTO productos (tienda_id, nombre, descripcion, precio, precio_oferta, oferta_tipo, oferta_valor, stock, stock_ilimitado, imagen, imagenes, video_url, categoria, es_reel, estado_stock, tiempo_preparacion, hashtags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $st->execute([
            $data['tienda_id'],
            $data['nombre'],
            $data['descripcion'] ?? '',
            $data['precio'],
            $precioOferta,
            $ofertaTipo,
            $ofertaValor,
            $stock,
            $stockIlimitado,
            $imagen,
            $imagenesJson,
            $video,
            $cat,
            !empty($data['es_reel']) ? 1 : 0,
            $estado_stock,
            $data['tiempo_preparacion'] ?? null,
            $hashtags,
        ]);
        $productoId = (int)db()->lastInsertId();

        // Avisa a los seguidores de la tienda -- una sola notificación por publicación,
        // priorizando reel > oferta > producto nuevo para no mandar dos avisos del mismo evento.
        $tiendaSt = db()->prepare("SELECT nombre FROM tiendas WHERE id = ?");
        $tiendaSt->execute([$data['tienda_id']]);
        $tiendaNombre = $tiendaSt->fetchColumn() ?: 'Una tienda que sigues';
        if (!empty($data['es_reel'])) {
            notificar_seguidores_tienda((int)$data['tienda_id'], "$tiendaNombre subió un reel nuevo", $data['nombre'], $productoId);
        } elseif ($precioOferta !== null) {
            notificar_seguidores_tienda((int)$data['tienda_id'], "$tiendaNombre puso una oferta", "{$data['nombre']} ahora a \$" . number_format($precioOferta, 2), $productoId);
        } else {
            notificar_seguidores_tienda((int)$data['tienda_id'], "$tiendaNombre publicó un producto nuevo", $data['nombre'], $productoId);
        }

        jout(['ok' => true, 'id' => $productoId]);
        break;

    case 'actualizar_producto':
        require_fields($data, ['producto_id']);
        // Antes esta acción no verificaba dueño -- cualquier vendedor autenticado podía
        // editar el producto de OTRA tienda con solo mandar su id (IDOR).
        $own = db()->prepare("SELECT p.id, p.tienda_id, p.nombre, p.precio_oferta, t.nombre AS tienda_nombre FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.id = ? AND t.vendedor_id = ?");
        $own->execute([(int)$data['producto_id'], $user['id']]);
        $prodRow = $own->fetch();
        if (!$prodRow) jout(['ok' => false, 'error' => 'Producto no encontrado'], 404);

        if (isset($data['categoria']) && !in_array($data['categoria'], CATEGORIAS_VALIDAS, true)) {
            jout(['ok' => false, 'error' => 'Categoría inválida'], 400);
        }
        if (isset($data['precio']) && ((float)$data['precio'] <= 0 || (float)$data['precio'] > MAX_PRECIO_PRODUCTO)) {
            jout(['ok' => false, 'error' => 'El precio debe ser mayor a $0 y no más de $' . number_format(MAX_PRECIO_PRODUCTO, 2)], 400);
        }

        $stockIlimitado = isset($data['stock_ilimitado']) ? (!empty($data['stock_ilimitado']) ? 1 : 0) : null;
        $estado_stock = null;
        if ($stockIlimitado === 1) {
            $estado_stock = 'disponible';
        } elseif (isset($data['stock'])) {
            $estado_stock = ((int)$data['stock']) > 0 ? 'disponible' : 'agotado';
        }

        // Promoción: fijar/actualizar/quitar (quitar_oferta=true limpia ambos campos)
        $precioOferta = null;
        $ofertaTipo = null; $ofertaValor = null;
        if (!empty($data['quitar_oferta'])) {
            $precioOferta = null;
        } elseif (isset($data['precio_oferta']) && $data['precio_oferta'] !== '') {
            $precioActual = isset($data['precio']) ? (float)$data['precio'] : (float)(db()->query("SELECT precio FROM productos WHERE id = " . (int)$data['producto_id'])->fetchColumn());
            $precioOferta = (float)$data['precio_oferta'];
            if ($precioOferta <= 0 || $precioOferta >= $precioActual) {
                jout(['ok' => false, 'error' => 'El precio de oferta debe ser menor al precio normal'], 400);
            }
            if (!empty($data['oferta_tipo']) && in_array($data['oferta_tipo'], ['monto','porcentaje'], true)) {
                $ofertaTipo = $data['oferta_tipo'];
                $ofertaValor = isset($data['oferta_valor']) ? (float)$data['oferta_valor'] : null;
            }
        }
        $tieneOferta = !empty($data['quitar_oferta']) || isset($data['precio_oferta']);

        // Galería nueva (base64) — si mandan `imagenes`, reemplaza TODA la galería anterior.
        $nuevaImagen = null;
        $nuevasImagenesJson = null;
        if (!empty($data['imagenes']) && is_array($data['imagenes'])) {
            $subidas = [];
            foreach (array_slice($data['imagenes'], 0, MAX_IMAGENES_PRODUCTO) as $img) {
                // Cada entrada puede ser una nueva foto en base64, o una URL ya subida
                // (una foto existente que el vendedor dejó igual al reordenar/editar la galería).
                if (is_string($img) && str_starts_with($img, 'data:image')) {
                    $url = save_base64_image($img, 'productos', 'p_' . $user['id']);
                    if ($url) $subidas[] = $url;
                } elseif (is_string($img) && $img !== '') {
                    $subidas[] = $img;
                }
            }
            if ($subidas) {
                $nuevasImagenesJson = json_encode($subidas);
                $nuevaImagen = $subidas[0];
            }
        } elseif (!empty($data['imagen']) && str_starts_with($data['imagen'], 'data:image')) {
            $nuevaImagen = save_base64_image($data['imagen'], 'productos', 'p_' . $user['id']);
            if ($nuevaImagen) $nuevasImagenesJson = json_encode([$nuevaImagen]);
        }
        $nuevoVideo = null;
        if (!empty($data['video']) && str_starts_with($data['video'], 'data:video')) {
            $nuevoVideo = save_base64_video($data['video'], 'productos', 'v_' . $user['id']);
        }

        $st = db()->prepare(
            "UPDATE productos SET
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                precio = COALESCE(?, precio),
                precio_oferta = CASE WHEN ? THEN ? ELSE precio_oferta END,
                oferta_tipo = CASE WHEN ? THEN ? ELSE oferta_tipo END,
                oferta_valor = CASE WHEN ? THEN ? ELSE oferta_valor END,
                oferta_hasta = CASE WHEN ? THEN ? ELSE oferta_hasta END,
                stock = COALESCE(?, stock),
                stock_ilimitado = COALESCE(?, stock_ilimitado),
                categoria = COALESCE(?, categoria),
                activo = COALESCE(?, activo),
                estado_stock = COALESCE(?, estado_stock),
                imagen = COALESCE(?, imagen),
                imagenes = COALESCE(?, imagenes),
                video_url = COALESCE(?, video_url),
                tiempo_preparacion = COALESCE(?, tiempo_preparacion)
             WHERE id = ?"
        );
        $st->execute([
            $data['nombre'] ?? null,
            $data['descripcion'] ?? null,
            $data['precio'] ?? null,
            $tieneOferta ? 1 : 0, $precioOferta,
            $tieneOferta ? 1 : 0, $ofertaTipo,
            $tieneOferta ? 1 : 0, $ofertaValor,
            $tieneOferta ? 1 : 0, (!empty($data['quitar_oferta']) ? null : ($data['oferta_hasta'] ?? null)),
            $stockIlimitado === 1 ? 0 : ($data['stock'] ?? null),
            $stockIlimitado,
            $data['categoria'] ?? null,
            $data['activo'] ?? null,
            $estado_stock,
            $nuevaImagen,
            $nuevasImagenesJson,
            $nuevoVideo,
            $data['tiempo_preparacion'] ?? null,
            $data['producto_id'],
        ]);

        // Solo avisa a los seguidores cuando de verdad se ACABA de poner una oferta nueva --
        // no en cada guardado (evita reavisar si el vendedor re-guarda el mismo precio) ni
        // cuando se está quitando la oferta.
        $ofertaAnterior = $prodRow['precio_oferta'] !== null ? (float)$prodRow['precio_oferta'] : null;
        if ($tieneOferta && $precioOferta !== null && $precioOferta !== $ofertaAnterior) {
            notificar_seguidores_tienda(
                (int)$prodRow['tienda_id'],
                "{$prodRow['tienda_nombre']} puso una oferta",
                "{$prodRow['nombre']} ahora a \$" . number_format($precioOferta, 2),
                (int)$data['producto_id']
            );
        }

        jout(['ok' => true, 'estado_stock' => $estado_stock, 'imagen' => $nuevaImagen, 'video_url' => $nuevoVideo]);
        break;

    // ─── Eliminar (borrado suave) un producto o reel propio -- antes solo el admin podía. ───
    case 'eliminar_producto':
        require_fields($data, ['producto_id']);
        $own = db()->prepare("SELECT p.id FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.id = ? AND t.vendedor_id = ?");
        $own->execute([(int)$data['producto_id'], $user['id']]);
        if (!$own->fetch()) jout(['ok' => false, 'error' => 'Producto no encontrado'], 404);
        db()->prepare("UPDATE productos SET activo = 0 WHERE id = ?")->execute([(int)$data['producto_id']]);
        jout(['ok' => true]);
        break;

    case 'mis_ventas':
        $st = db()->prepare(
            "SELECT p.*, u.nombre as comprador_nombre, u.telefono as comprador_telefono,
                    r.nombre as repartidor_nombre, r.en_linea as repartidor_en_linea
             FROM pedidos p
             JOIN usuarios u ON u.id = p.comprador_id
             LEFT JOIN usuarios r ON r.id = p.repartidor_id
             WHERE p.vendedor_id = ? ORDER BY p.created_at DESC"
        );
        $st->execute([$user['id']]);
        $pedidos = $st->fetchAll();
        if ($pedidos) {
            $itemsSt = db()->prepare(
                "SELECT i.*, pr.nombre, pr.imagen FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id WHERE i.pedido_id = ?"
            );
            foreach ($pedidos as &$p) {
                $itemsSt->execute([$p['id']]);
                $p['items'] = $itemsSt->fetchAll();
            }
        }
        jout(['ok' => true, 'pedidos' => $pedidos]);
        break;

    case 'preparar_pedido':
        require_fields($data, ['pedido_id','estado']);
        if (!in_array($data['estado'], ['preparacion','en_camino'], true)) {
            jout(['ok' => false, 'error' => 'Estado invalido'], 400);
        }
        $pid = (int)$data['pedido_id'];
        $sel = db()->prepare("SELECT comprador_id, numero_pedido, tipo_entrega FROM pedidos WHERE id = ? AND vendedor_id = ?");
        $sel->execute([$pid, $user['id']]);
        $ped = $sel->fetch();
        if (!$ped) jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404);

        $st = db()->prepare("UPDATE pedidos SET estado = ? WHERE id = ? AND vendedor_id = ?");
        $st->execute([$data['estado'], $pid, $user['id']]);

        // El vendedor confirma el pedido: se notifica al comprador (sistema → comprador).
        crear_notificacion((int)$ped['comprador_id'], 'pedido', 'Pedido confirmado', "El vendedor confirmó tu pedido #{$ped['numero_pedido']} y lo está preparando.", $pid);

        // El vendedor ya NO elige repartidor -- en cuanto el pedido queda en 'preparacion'
        // dispara el despacho automático (ver ofrecer_siguiente_repartidor() en conexion.php).
        // Un pedido "recoger en tienda" no lleva repartidor -- el comprador lo retira en
        // persona (ver confirmar_recogida más abajo y pedidos_tracking.php confirmar_entrega).
        if ($data['estado'] === 'preparacion' && $ped['tipo_entrega'] !== 'recogida') ofrecer_siguiente_repartidor($pid);

        jout(['ok' => true]);
        break;

    // ─── Rechazar pedido: cambia estado y dispara reversión del pago ───
    case 'rechazar_pedido':
        require_fields($data, ['pedido_id', 'razon']);
        $pid = (int)$data['pedido_id'];
        $razon = trim((string)$data['razon']);
        if ($razon === '') jout(['ok' => false, 'error' => 'Selecciona o escribe una razón de rechazo'], 400);
        try {
            db()->beginTransaction();
            $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND vendedor_id = ?");
            $sel->execute([$pid, $user['id']]);
            $ped = $sel->fetch();
            if (!$ped) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404); }
            if (in_array($ped['estado'], ['entregado','cancelado'], true)) {
                db()->rollBack();
                jout(['ok' => false, 'error' => 'No se puede rechazar este pedido'], 400);
            }

            db()->prepare("UPDATE pedidos SET estado = 'cancelado', pago_estado = 'reembolsado' WHERE id = ?")->execute([$pid]);

            $monto = (float)$ped['total'];
            db()->prepare("INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)")
                ->execute([(int)$ped['comprador_id'], $monto]);
            db()->prepare("INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id) VALUES (?, 'reembolso', ?, 'Pedido cancelado por vendedor', ?)")
                ->execute([(int)$ped['comprador_id'], $monto, $pid]);

            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$ped['comprador_id'], "❌ El vendedor rechazó tu pedido. Motivo: {$razon}. Se reembolsó el total a tu billetera."]);
            crear_notificacion((int)$ped['comprador_id'], 'pedido', 'Pedido rechazado', "Motivo: {$razon}. Se reembolsó el total a tu billetera.", $pid);

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
                    u.repartidor_calificacion_promedio, u.repartidor_total_resenas,
                    p.estado AS pedido_estado, p.progreso_repartidor,
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

    // ─── Repartidores cercanos y en línea, para asignar manualmente un pedido ───
    case 'repartidores_cercanos':
        $pid = (int)($_GET['pedido_id'] ?? 0);
        $chk = db()->prepare("SELECT id FROM pedidos WHERE id = ? AND vendedor_id = ?");
        $chk->execute([$pid, $user['id']]);
        if (!$chk->fetch()) jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404);

        // Ubicación de referencia: la tienda de origen de los productos de este pedido.
        $tSt = db()->prepare(
            "SELECT t.lat, t.lng FROM pedido_items i
             JOIN productos p ON p.id = i.producto_id
             JOIN tiendas t ON t.id = p.tienda_id
             WHERE i.pedido_id = ? LIMIT 1"
        );
        $tSt->execute([$pid]);
        $tienda = $tSt->fetch();

        $st = db()->prepare(
            "SELECT u.id, u.nombre, u.foto_perfil, u.telefono,
                    u.repartidor_calificacion_promedio, u.repartidor_total_resenas, u.lat, u.lng,
                    s.tipo_vehiculo
             FROM usuarios u
             LEFT JOIN solicitudes_rol s ON s.usuario_id = u.id AND s.estado = 'aprobado' AND s.rol_solicitado = 'repartidor'
             WHERE u.rol = 'repartidor' AND u.en_linea = 1 AND u.activo = 1
               AND u.lat IS NOT NULL AND u.lng IS NOT NULL"
        );
        $st->execute();
        $repartidores = $st->fetchAll();
        if ($tienda && $tienda['lat'] !== null) {
            foreach ($repartidores as &$r) {
                $r['distancia_km'] = round(distancia_km((float)$tienda['lat'], (float)$tienda['lng'], (float)$r['lat'], (float)$r['lng']), 2);
            }
            usort($repartidores, fn($a, $b) => $a['distancia_km'] <=> $b['distancia_km']);
        }
        jout(['ok' => true, 'repartidores' => array_slice($repartidores, 0, 20)]);
        break;

    // ─── Asignar directamente un repartidor específico a un pedido (modelo "push") ───
    case 'asignar_repartidor':
        require_fields($data, ['pedido_id', 'repartidor_id']);
        $pid = (int)$data['pedido_id'];
        $rid = (int)$data['repartidor_id'];

        $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND vendedor_id = ?");
        $sel->execute([$pid, $user['id']]);
        $ped = $sel->fetch();
        if (!$ped) jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404);
        if ($ped['tipo_entrega'] === 'recogida') jout(['ok' => false, 'error' => 'Este pedido es de recogida en tienda -- no lleva repartidor'], 400);
        if ($ped['estado'] !== 'preparacion') jout(['ok' => false, 'error' => 'El pedido debe estar aprobado antes de asignar repartidor'], 400);
        if ($ped['repartidor_id'] !== null) jout(['ok' => false, 'error' => 'Este pedido ya tiene repartidor asignado'], 400);

        $rSt = db()->prepare("SELECT id FROM usuarios WHERE id = ? AND rol = 'repartidor' AND en_linea = 1 AND activo = 1");
        $rSt->execute([$rid]);
        if (!$rSt->fetch()) jout(['ok' => false, 'error' => 'El repartidor ya no está disponible'], 400);

        // Limpia cualquier oferta del despacho automático que siguiera pendiente para este
        // pedido (ver ofrecer_siguiente_repartidor() en conexion.php) -- esto es una
        // asignación manual explícita que la debe pisar, no competir con ella.
        db()->prepare("UPDATE pedidos SET repartidor_id = ?, repartidor_asignado_at = NOW(), oferta_repartidor_id = NULL, oferta_expira_at = NULL WHERE id = ?")->execute([$rid, $pid]);
        crear_notificacion($rid, 'pedido', 'Nueva entrega asignada', "Una tienda te asignó el pedido #{$ped['numero_pedido']} directamente.", $pid);
        jout(['ok' => true]);
        break;

    // ─── Confirmación (lado vendedor) de que el pedido está listo para retirar.
    // Genera el código QR de recogida — el repartidor debe escanearlo para
    // poder confirmar del otro lado (ver DESIGN.md "Flujo logístico" y
    // repartidor_dashboard.php action=confirmar_recogida). ───
    case 'confirmar_recogida':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];
        $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND vendedor_id = ?");
        $sel->execute([$pid, $user['id']]);
        $ped = $sel->fetch();
        if (!$ped) jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404);
        // En "recoger en tienda" no hay repartidor -- el código que se genera abajo lo usa
        // directamente el comprador (ver pedidos_tracking.php action=confirmar_entrega).
        if ($ped['tipo_entrega'] !== 'recogida' && !$ped['repartidor_id']) {
            jout(['ok' => false, 'error' => 'Este pedido aún no tiene repartidor asignado'], 400);
        }

        $token = $ped['qr_recogida_token'] ?: bin2hex(random_bytes(16));
        $pin = $ped['pin_recogida'] ?: generar_pin();
        db()->prepare("UPDATE pedidos SET confirmado_vendedor_recogida = 1, qr_recogida_token = ?, pin_recogida = ? WHERE id = ?")
            ->execute([$token, $pin, $pid]);

        $yaConfirmadoRepartidor = (int)$ped['confirmado_repartidor_recogida'] === 1;
        if ($yaConfirmadoRepartidor) {
            db()->prepare("UPDATE pedidos SET estado = 'en_camino' WHERE id = ?")->execute([$pid]);
            crear_notificacion((int)$ped['comprador_id'], 'pedido', '¡Tu pedido va en camino!', "El repartidor recogió tu pedido #{$ped['numero_pedido']} y va hacia ti.", $pid);
        }
        jout(['ok' => true, 'en_camino' => $yaConfirmadoRepartidor, 'qr_token' => $token, 'pin' => $pin]);
        break;

    // ─── Reseñas recibidas por el vendedor + respuesta pública ───
    case 'mis_resenas':
        $st = db()->prepare(
            "SELECT c.id, c.estrellas, c.comentario, c.respuesta_vendedor, c.respuesta_at, c.created_at,
                    u.nombre AS comprador_nombre
             FROM calificaciones c
             JOIN usuarios u ON u.id = c.comprador_id
             JOIN tiendas t ON t.id = c.tienda_id
             WHERE t.vendedor_id = ?
             ORDER BY c.created_at DESC"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'resenas' => $st->fetchAll()]);
        break;

    case 'responder_resena':
        require_fields($data, ['calificacion_id', 'respuesta']);
        $st = db()->prepare(
            "UPDATE calificaciones c
             JOIN tiendas t ON t.id = c.tienda_id
             SET c.respuesta_vendedor = ?, c.respuesta_at = NOW()
             WHERE c.id = ? AND t.vendedor_id = ?"
        );
        $st->execute([$data['respuesta'], (int)$data['calificacion_id'], $user['id']]);
        jout(['ok' => true]);
        break;

    // ─── Notificaciones del vendedor, separadas por tipo ───
    case 'notificaciones':
        $stP = db()->prepare(
            "SELECT id, titulo, cuerpo, leida, referencia_id, created_at
             FROM notificaciones WHERE usuario_id = ? AND tipo = 'pedido'
             ORDER BY created_at DESC LIMIT 30"
        );
        $stP->execute([$user['id']]);

        $stL = db()->prepare(
            "SELECT vl.id, vl.created_at, vl.producto_id, p.nombre AS producto_nombre,
                    u.id AS usuario_id, u.nombre AS usuario_nombre, u.foto_perfil
             FROM video_likes vl
             JOIN productos p ON p.id = vl.producto_id
             JOIN tiendas t ON t.id = p.tienda_id
             JOIN usuarios u ON u.id = vl.usuario_id
             WHERE t.vendedor_id = ?
             ORDER BY vl.created_at DESC LIMIT 30"
        );
        $stL->execute([$user['id']]);

        $stC = db()->prepare(
            "SELECT vc.id, vc.created_at, vc.producto_id, vc.comentario, p.nombre AS producto_nombre,
                    u.id AS usuario_id, u.nombre AS usuario_nombre, u.foto_perfil
             FROM video_comentarios vc
             JOIN productos p ON p.id = vc.producto_id
             JOIN tiendas t ON t.id = p.tienda_id
             JOIN usuarios u ON u.id = vc.usuario_id
             WHERE t.vendedor_id = ?
             ORDER BY vc.created_at DESC LIMIT 30"
        );
        $stC->execute([$user['id']]);

        jout([
            'ok' => true,
            'pedidos' => $stP->fetchAll(),
            'likes' => $stL->fetchAll(),
            'comentarios' => $stC->fetchAll(),
        ]);
        break;

    // ─── Ganancias por día + producto más vendido (para la gráfica de "Mi cuenta") ───
    case 'ganancias':
        // DESC + LIMIT trae los 30 días MÁS RECIENTES con ventas; se revierte después
        // para devolverlos en orden cronológico ascendente (lo que espera el frontend
        // para el gráfico). Un ASC + LIMIT aquí traería los 30 primeros días desde que
        // la tienda abrió -- los más viejos, nunca los recientes, una vez que la tienda
        // lleva más de 30 días con ventas.
        $stG = db()->prepare(
            "SELECT DATE(p.created_at) AS fecha, SUM(p.total_vendedor) AS monto
             FROM pedidos p WHERE p.vendedor_id = ? AND p.estado = 'entregado'
             GROUP BY DATE(p.created_at) ORDER BY fecha DESC LIMIT 30"
        );
        $stG->execute([$user['id']]);
        $gananciasPorDia = array_reverse($stG->fetchAll());

        $stP = db()->prepare(
            "SELECT pr.id, pr.nombre, SUM(pi.cantidad) AS total_vendido
             FROM pedido_items pi
             JOIN pedidos p ON p.id = pi.pedido_id
             JOIN productos pr ON pr.id = pi.producto_id
             WHERE p.vendedor_id = ? AND p.estado = 'entregado'
             GROUP BY pr.id ORDER BY total_vendido DESC LIMIT 1"
        );
        $stP->execute([$user['id']]);

        jout(['ok' => true, 'ganancias_por_dia' => $gananciasPorDia, 'producto_top' => $stP->fetch() ?: null]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
