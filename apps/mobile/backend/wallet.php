<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'saldo';
$data = jread();

// Retiro mínimo — evita solicitudes de centavos que no cubren costos de transferencia
const RETIRO_MINIMO = 5.00;

switch ($action) {

    case 'saldo':
        $st = db()->prepare("SELECT saldo FROM wallets WHERE usuario_id = ?");
        $st->execute([$user['id']]);
        $row = $st->fetch();
        $saldo = $row ? (float)$row['saldo'] : 0.0;

        $mov = db()->prepare("SELECT * FROM wallet_movimientos WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 20");
        $mov->execute([$user['id']]);

        $pend = db()->prepare("SELECT COALESCE(SUM(monto),0) FROM retiros WHERE usuario_id = ? AND estado = 'pendiente'");
        $pend->execute([$user['id']]);

        jout([
            'ok' => true,
            'saldo' => $saldo,
            'retiros_pendientes' => (float)$pend->fetchColumn(),
            'movimientos' => $mov->fetchAll(),
        ]);
        break;

    case 'movimientos':
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 30)));
        $offset = ($page - 1) * $limit;
        $st = db()->prepare("SELECT * FROM wallet_movimientos WHERE usuario_id = ? ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'movimientos' => $st->fetchAll(), 'page' => $page]);
        break;

    case 'solicitar_retiro':
        require_fields($data, ['monto', 'metodo', 'datos_cuenta']);
        $monto = (float)$data['monto'];
        if ($monto < RETIRO_MINIMO) {
            jout(['ok' => false, 'error' => "El retiro mínimo es \$" . number_format(RETIRO_MINIMO, 2)], 400);
        }
        try {
            db()->beginTransaction();
            $st = db()->prepare("SELECT saldo FROM wallets WHERE usuario_id = ? FOR UPDATE");
            $st->execute([$user['id']]);
            $row = $st->fetch();
            $saldo = $row ? (float)$row['saldo'] : 0.0;
            if ($saldo < $monto) {
                throw new RuntimeException('Saldo insuficiente para este retiro.');
            }
            db()->prepare("UPDATE wallets SET saldo = saldo - ? WHERE usuario_id = ?")->execute([$monto, $user['id']]);
            db()->prepare(
                "INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia) VALUES (?, 'retiro_solicitado', ?, 'Solicitud de retiro')"
            )->execute([$user['id'], -$monto]);
            db()->prepare(
                "INSERT INTO retiros (usuario_id, monto, metodo, datos_cuenta, estado) VALUES (?, ?, ?, ?, 'pendiente')"
            )->execute([$user['id'], $monto, $data['metodo'], $data['datos_cuenta']]);
            db()->commit();
            jout(['ok' => true, 'mensaje' => 'Solicitud de retiro enviada. Será procesada por el equipo administrativo.']);
        } catch (RuntimeException $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 409);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => 'No se pudo procesar el retiro'], 500);
        }
        break;

    case 'mis_retiros':
        $st = db()->prepare("SELECT * FROM retiros WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 50");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'retiros' => $st->fetchAll()]);
        break;

    // ─── Tarjeta NFC vinculada a la cuenta -- una tarjeta física (chip NTAG213/215) que,
    // al acercarla al teléfono, permite retirar sin llenar el formulario manual ───
    case 'mis_tarjetas':
        $st = db()->prepare("SELECT id, alias, created_at FROM wallet_tarjetas_nfc WHERE usuario_id = ? ORDER BY created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'tarjetas' => $st->fetchAll()]);
        break;

    case 'vincular_tarjeta':
        require_fields($data, ['token']);
        $token = trim($data['token']);
        if ($token === '') jout(['ok' => false, 'error' => 'Token de tarjeta vacío'], 400);
        $existe = db()->prepare("SELECT usuario_id FROM wallet_tarjetas_nfc WHERE token = ?");
        $existe->execute([$token]);
        $duena = $existe->fetch();
        if ($duena) {
            jout(['ok' => false, 'error' => (int)$duena['usuario_id'] === (int)$user['id'] ? 'Esta tarjeta ya está vinculada a tu cuenta.' : 'Esta tarjeta ya está vinculada a otra cuenta.'], 409);
        }
        $alias = trim($data['alias'] ?? '') ?: null;
        db()->prepare("INSERT INTO wallet_tarjetas_nfc (usuario_id, token, alias) VALUES (?, ?, ?)")->execute([$user['id'], $token, $alias]);
        jout(['ok' => true, 'mensaje' => 'Tarjeta vinculada correctamente.']);
        break;

    case 'desvincular_tarjeta':
        require_fields($data, ['id']);
        db()->prepare("DELETE FROM wallet_tarjetas_nfc WHERE id = ? AND usuario_id = ?")->execute([(int)$data['id'], $user['id']]);
        jout(['ok' => true]);
        break;

    // ─── Retiro instantáneo al acercar la tarjeta NFC -- el tap es la prueba del retiro,
    // así que no pasa por la cola de aprobación admin como sí lo hace 'solicitar_retiro' ───
    case 'retiro_nfc':
        require_fields($data, ['token', 'monto']);
        $token = trim($data['token']);
        $monto = (float)$data['monto'];
        if ($monto < RETIRO_MINIMO) {
            jout(['ok' => false, 'error' => "El retiro mínimo es \$" . number_format(RETIRO_MINIMO, 2)], 400);
        }
        $tarjeta = db()->prepare("SELECT usuario_id FROM wallet_tarjetas_nfc WHERE token = ?");
        $tarjeta->execute([$token]);
        $duenaTarjeta = $tarjeta->fetch();
        if (!$duenaTarjeta) {
            jout(['ok' => false, 'error' => 'Tarjeta no reconocida. Vincúlala primero desde tu billetera.'], 404);
        }
        if ((int)$duenaTarjeta['usuario_id'] !== (int)$user['id']) {
            jout(['ok' => false, 'error' => 'Esta tarjeta no pertenece a tu cuenta.'], 403);
        }
        try {
            db()->beginTransaction();
            $st = db()->prepare("SELECT saldo FROM wallets WHERE usuario_id = ? FOR UPDATE");
            $st->execute([$user['id']]);
            $row = $st->fetch();
            $saldo = $row ? (float)$row['saldo'] : 0.0;
            if ($saldo < $monto) {
                throw new RuntimeException('Saldo insuficiente para este retiro.');
            }
            db()->prepare("UPDATE wallets SET saldo = saldo - ? WHERE usuario_id = ?")->execute([$monto, $user['id']]);
            db()->prepare(
                "INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia) VALUES (?, 'retiro_nfc', ?, 'Retiro con tarjeta NFC')"
            )->execute([$user['id'], -$monto]);
            db()->prepare(
                "INSERT INTO retiros (usuario_id, monto, metodo, datos_cuenta, estado, resuelto_at) VALUES (?, ?, 'nfc', 'Tarjeta NFC', 'completado', NOW())"
            )->execute([$user['id'], $monto]);
            db()->commit();
            $nuevo = db()->prepare("SELECT saldo FROM wallets WHERE usuario_id = ?");
            $nuevo->execute([$user['id']]);
            jout(['ok' => true, 'mensaje' => 'Retiro procesado correctamente vía NFC.', 'nuevo_saldo' => (float)$nuevo->fetchColumn()]);
        } catch (RuntimeException $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 409);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => 'No se pudo procesar el retiro'], 500);
        }
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
