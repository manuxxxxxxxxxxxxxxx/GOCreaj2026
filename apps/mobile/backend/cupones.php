<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'validar';
$data = jread();

function requiere_admin(array $user): void {
    if ($user['rol'] !== 'admin') jout(['ok' => false, 'error' => 'No autorizado'], 403);
}

switch ($action) {

    // Previsualización del descuento antes de pagar. El checkout real (carrito_pagos.php)
    // vuelve a validar y recalcular todo del lado servidor — esto es solo para la UI del carrito.
    case 'validar':
        require_fields($data, ['codigo']);
        $monto = (float)($data['monto'] ?? 0);
        $st = db()->prepare("SELECT * FROM cupones WHERE codigo = ? AND activo = 1");
        $st->execute([strtoupper(trim($data['codigo']))]);
        $c = $st->fetch();
        if (!$c) jout(['ok' => false, 'error' => 'Cupón no válido'], 404);
        if ($c['expira_at'] && strtotime($c['expira_at']) < time()) {
            jout(['ok' => false, 'error' => 'Este cupón ha expirado'], 400);
        }
        if ($c['usos_max'] !== null && (int)$c['usos_actuales'] >= (int)$c['usos_max']) {
            jout(['ok' => false, 'error' => 'Este cupón ya alcanzó su límite de usos'], 400);
        }
        if ($monto < (float)$c['min_compra']) {
            jout(['ok' => false, 'error' => 'La compra mínima para este cupón es $' . number_format((float)$c['min_compra'], 2)], 400);
        }
        $usado = db()->prepare("SELECT id FROM cupones_usos WHERE cupon_id = ? AND usuario_id = ?");
        $usado->execute([$c['id'], $user['id']]);
        if ($usado->fetch()) {
            jout(['ok' => false, 'error' => 'Ya usaste este cupón anteriormente'], 400);
        }
        $descuento = $c['tipo'] === 'porcentaje' ? round($monto * ((float)$c['valor'] / 100), 2) : (float)$c['valor'];
        $descuento = min($descuento, $monto);
        jout(['ok' => true, 'cupon' => $c, 'descuento' => $descuento]);
        break;

    case 'listar':
        requiere_admin($user);
        $st = db()->query("SELECT * FROM cupones ORDER BY created_at DESC");
        jout(['ok' => true, 'cupones' => $st->fetchAll()]);
        break;

    case 'crear':
        requiere_admin($user);
        require_fields($data, ['codigo', 'tipo', 'valor']);
        try {
            $st = db()->prepare(
                "INSERT INTO cupones (codigo, tipo, valor, min_compra, usos_max, expira_at, activo)
                 VALUES (?, ?, ?, ?, ?, ?, 1)"
            );
            $st->execute([
                strtoupper(trim($data['codigo'])),
                $data['tipo'],
                (float)$data['valor'],
                (float)($data['min_compra'] ?? 0),
                isset($data['usos_max']) && $data['usos_max'] !== '' ? (int)$data['usos_max'] : null,
                $data['expira_at'] ?? null,
            ]);
            jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        } catch (PDOException $e) {
            jout(['ok' => false, 'error' => 'Ese código de cupón ya existe'], 409);
        }
        break;

    case 'actualizar':
        requiere_admin($user);
        require_fields($data, ['id']);
        $st = db()->prepare(
            "UPDATE cupones SET
                tipo = COALESCE(?, tipo),
                valor = COALESCE(?, valor),
                min_compra = COALESCE(?, min_compra),
                usos_max = ?,
                expira_at = ?,
                activo = COALESCE(?, activo)
             WHERE id = ?"
        );
        $st->execute([
            $data['tipo'] ?? null,
            isset($data['valor']) ? (float)$data['valor'] : null,
            isset($data['min_compra']) ? (float)$data['min_compra'] : null,
            array_key_exists('usos_max', $data) ? ($data['usos_max'] !== '' && $data['usos_max'] !== null ? (int)$data['usos_max'] : null) : null,
            array_key_exists('expira_at', $data) ? $data['expira_at'] : null,
            isset($data['activo']) ? (int)!!$data['activo'] : null,
            (int)$data['id'],
        ]);
        jout(['ok' => true]);
        break;

    case 'eliminar':
        requiere_admin($user);
        require_fields($data, ['id']);
        db()->prepare("DELETE FROM cupones WHERE id = ?")->execute([(int)$data['id']]);
        jout(['ok' => true]);
        break;

    case 'toggle_activo':
        requiere_admin($user);
        require_fields($data, ['id']);
        db()->prepare("UPDATE cupones SET activo = 1 - activo WHERE id = ?")->execute([(int)$data['id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
