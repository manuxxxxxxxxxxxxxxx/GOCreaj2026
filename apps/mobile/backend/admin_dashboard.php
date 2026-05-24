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
            'solicitudes_pendientes' => (int)db()->query("SELECT COUNT(*) FROM solicitudes_rol WHERE estado='pendiente'")->fetchColumn(),
            'soporte_abiertos' => (int)db()->query("SELECT COUNT(*) FROM reportes_soporte WHERE estado='abierto'")->fetchColumn(),
        ];
        jout(['ok' => true, 'stats' => $stats]);
        break;

    case 'soporte':
        $st = db()->query("SELECT r.*, u.nombre as usuario_nombre FROM reportes_soporte r JOIN usuarios u ON u.id = r.usuario_id ORDER BY r.created_at DESC");
        jout(['ok' => true, 'reportes' => $st->fetchAll()]);
        break;

    case 'responder_soporte':
        require_fields($data, ['reporte_id','respuesta','estado']);
        $st = db()->prepare("UPDATE reportes_soporte SET respuesta_admin = ?, estado = ? WHERE id = ?");
        $st->execute([$data['respuesta'], $data['estado'], $data['reporte_id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
