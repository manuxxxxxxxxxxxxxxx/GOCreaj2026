<?php
/**
 * Envío de WhatsApp real vía la API oficial de Meta (WhatsApp Cloud API), sin SDK -- una
 * sola llamada cURL con Bearer token, igual de simple que las demás integraciones de este
 * backend, ver verificar_google_id_token() en conexion.php para el mismo patrón.
 *
 * Requiere una plantilla de categoría "Authentication" ya aprobada en WhatsApp Manager,
 * con un solo parámetro de cuerpo (el código). Ver conexion.php para cómo configurarla.
 *
 * Si WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN están vacíos, devuelve false sin
 * intentar la llamada -- el caller cae a modo simulado (código en la respuesta JSON).
 */

/** $telefonoLocal son los 8 dígitos salvadoreños sin +503 (ver PhoneInput.tsx en el frontend). */
function enviar_whatsapp_codigo(string $telefonoLocal, string $codigo): bool {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) return false;

    $digits = preg_replace('/\D/', '', $telefonoLocal);
    if (strlen($digits) > 8) $digits = substr($digits, -8);
    if (strlen($digits) !== 8) return false;
    $to = '503' . $digits;

    $payload = [
        'messaging_product' => 'whatsapp',
        'to' => $to,
        'type' => 'template',
        'template' => [
            'name' => WHATSAPP_TEMPLATE_NAME,
            'language' => ['code' => 'es'],
            'components' => [[
                'type' => 'body',
                'parameters' => [['type' => 'text', 'text' => $codigo]],
            ]],
        ],
    ];

    $ch = curl_init("https://graph.facebook.com/v20.0/" . WHATSAPP_PHONE_NUMBER_ID . "/messages");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . WHATSAPP_ACCESS_TOKEN,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $res !== false && $code >= 200 && $code < 300;
}
