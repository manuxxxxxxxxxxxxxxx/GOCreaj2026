<?php
/**
 * Cliente SMTP mínimo (sin dependencias/Composer) para enviar correo real vía Gmail SMTP
 * con STARTTLS + AUTH LOGIN. Este backend no tiene Composer instalado, así que en vez de
 * vendorizar PHPMailer se implementa aquí el subconjunto del protocolo que necesitamos.
 *
 * Si SMTP_USER/SMTP_PASS (ver conexion.php) están vacíos, enviar_correo() devuelve false
 * sin intentar conectar -- el caller cae a modo simulado (código en la respuesta JSON).
 */

function smtp_leer_respuesta($conn): string {
    $data = '';
    while ($linea = fgets($conn, 515)) {
        $data .= $linea;
        // Una respuesta multilínea usa "250-" en las líneas intermedias y "250 " en la última.
        if (isset($linea[3]) && $linea[3] === ' ') break;
    }
    return $data;
}

function smtp_comando($conn, string $cmd, string $esperado = '250'): array {
    fwrite($conn, $cmd . "\r\n");
    $resp = smtp_leer_respuesta($conn);
    $code = substr($resp, 0, 3);
    return [str_starts_with($code, $esperado), $resp];
}

/**
 * Envía un correo HTML (con fallback de texto plano) por SMTP con STARTTLS + AUTH LOGIN.
 * Devuelve true si el servidor SMTP aceptó el mensaje, false si algo falló (credenciales
 * vacías, conexión rechazada, login inválido, etc.) -- nunca lanza excepción, el caller
 * decide el fallback.
 */
function enviar_correo(string $paraEmail, string $paraNombre, string $asunto, string $html, string $texto): bool {
    if (!SMTP_USER || !SMTP_PASS) return false;

    $conn = @stream_socket_client(
        'tcp://' . SMTP_HOST . ':' . SMTP_PORT,
        $errno, $errstr, 10
    );
    if (!$conn) return false;

    try {
        smtp_leer_respuesta($conn); // 220 greeting

        [$ok] = smtp_comando($conn, 'EHLO svgo.local');
        if (!$ok) return false;

        [$ok] = smtp_comando($conn, 'STARTTLS', '220');
        if (!$ok) return false;

        // El método genérico STREAM_CRYPTO_METHOD_TLS_CLIENT falla intermitentemente contra
        // Gmail en este entorno ("SSL routines::wrong version number") -- forzar TLSv1.2
        // explícito es estable.
        if (!@stream_socket_enable_crypto($conn, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) return false;

        [$ok] = smtp_comando($conn, 'EHLO svgo.local');
        if (!$ok) return false;

        [$ok] = smtp_comando($conn, 'AUTH LOGIN', '334');
        if (!$ok) return false;
        [$ok] = smtp_comando($conn, base64_encode(SMTP_USER), '334');
        if (!$ok) return false;
        [$ok] = smtp_comando($conn, base64_encode(SMTP_PASS), '235');
        if (!$ok) return false;

        [$ok] = smtp_comando($conn, 'MAIL FROM:<' . SMTP_USER . '>');
        if (!$ok) return false;
        [$ok] = smtp_comando($conn, 'RCPT TO:<' . $paraEmail . '>', '25');
        if (!$ok) return false;

        [$ok] = smtp_comando($conn, 'DATA', '354');
        if (!$ok) return false;

        $boundary = 'svgo_' . bin2hex(random_bytes(12));
        $fromHeader = '=?UTF-8?B?' . base64_encode(SMTP_FROM_NAME) . '?= <' . SMTP_USER . '>';
        $toHeader = '=?UTF-8?B?' . base64_encode($paraNombre) . '?= <' . $paraEmail . '>';
        $subjectHeader = '=?UTF-8?B?' . base64_encode($asunto) . '?=';

        $msg = "From: {$fromHeader}\r\n";
        $msg .= "To: {$toHeader}\r\n";
        $msg .= "Subject: {$subjectHeader}\r\n";
        $msg .= "MIME-Version: 1.0\r\n";
        $msg .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
        $msg .= "\r\n";
        $msg .= "--{$boundary}\r\n";
        $msg .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $msg .= chunk_split(base64_encode($texto));
        $msg .= "--{$boundary}\r\n";
        $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $msg .= chunk_split(base64_encode($html));
        $msg .= "--{$boundary}--\r\n";

        // Line starting with a lone "." must be escaped ("." -> "..") per RFC 5321.
        $msg = preg_replace('/^\./m', '..', $msg);

        fwrite($conn, $msg . "\r\n.\r\n");
        $resp = smtp_leer_respuesta($conn);
        $ok = substr($resp, 0, 3) === '250';

        smtp_comando($conn, 'QUIT', '221');
        return $ok;
    } finally {
        fclose($conn);
    }
}

/** Logo de marca embebido como data URI -- funciona en el correo sin depender de que
 * el sitio esté públicamente accesible (imprescindible en desarrollo local con XAMPP). */
function logo_email_data_uri(): string {
    static $cache = null;
    if ($cache !== null) return $cache;
    $path = __DIR__ . '/assets/logo-email.png';
    if (!is_file($path)) return $cache = '';
    return $cache = 'data:image/png;base64,' . base64_encode(file_get_contents($path));
}

function plantilla_email_codigo(string $nombre, string $tituloIntro, string $mensajeIntro, string $codigo): string {
    $logo = logo_email_data_uri();
    $logoHtml = $logo ? "<img src=\"{$logo}\" alt=\"SV[Go]\" width=\"110\" style=\"display:block;height:auto;max-width:110px;\">" : "<span style=\"font:700 22px sans-serif;color:#38d6ff;\">SV[Go]</span>";
    $nombreSeguro = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
    $codigoEspaciado = implode(' ', str_split($codigo));

    return <<<HTML
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background-color:#e9ecf3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e9ecf3;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 48px rgba(11,18,32,0.12);">
          <tr>
            <td align="center" style="background-color:#0a0e19;padding:32px 24px;">
              {$logoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 8px;">
              <h1 style="margin:0 0 12px;font-size:21px;color:#10162a;">{$tituloIntro}</h1>
              <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#4b5670;">¡Hola, {$nombreSeguro}!</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5670;">{$mensajeIntro}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 36px;">
              <div style="background-color:#dff3f8;border-radius:14px;padding:20px 28px;display:inline-block;">
                <span style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:6px;color:#0891b2;">{$codigoEspaciado}</span>
              </div>
              <p style="margin:16px 0 0;font-size:12.5px;color:#828ba1;">Este código vence en 30 minutos.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#828ba1;">Si tú no solicitaste esto, puedes ignorar este correo con confianza -- nadie más podrá acceder a tu cuenta sin este código.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 24px;background-color:#f3f4f9;border-top:1px solid #e3e7ef;">
              <p style="margin:0;font-size:11.5px;color:#828ba1;">© 2026 SV[Go] · Comida, mercado, farmacia, moda y envíos en un solo lugar.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/** Envía el correo de bienvenida + verificación al registrarse por formulario.
 * Devuelve true si se envió de verdad; false si no hay credenciales SMTP o falló el envío
 * (el caller cae a modo simulado y devuelve el código en la respuesta para poder probar igual). */
function enviar_email_verificacion_registro(string $email, string $nombre, string $codigo): bool {
    $html = plantilla_email_codigo(
        $nombre,
        '¡Bienvenido a SV[Go]!',
        'Ya casi está lista tu cuenta. Ingresa este código para confirmar tu correo y empezar a pedir, vender o repartir.',
        $codigo
    );
    $texto = "¡Hola, {$nombre}!\n\nBienvenido a SV[Go]. Tu código de verificación es: {$codigo}\n\nVence en 30 minutos. Si tú no solicitaste esto, ignora este correo.";
    return enviar_correo($email, $nombre, 'Bienvenido a SV[Go] -- confirma tu correo', $html, $texto);
}
