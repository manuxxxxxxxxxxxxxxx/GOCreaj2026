import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Comprime la imagen a WebP en cliente antes de enviarla al backend.
 * Devuelve una cadena base64 lista para POST.
 */
export async function comprimirImagenWebP(
  uri: string,
  opts: { maxWidth?: number; calidad?: number } = {}
): Promise<string> {
  const { maxWidth = 1280, calidad = 0.75 } = opts;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      compress: calidad,
      format: ImageManipulator.SaveFormat.WEBP,
      base64: true,
    },
  );

  if (result.base64) return `data:image/webp;base64,${result.base64}`;

  // Fallback: leer del filesystem si no vino base64
  const b64 = await FileSystem.readAsStringAsync(result.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/webp;base64,${b64}`;
}

/** Variante: comprimir a JPEG cuando el servidor lo prefiera */
export async function comprimirImagenJPG(
  uri: string,
  opts: { maxWidth?: number; calidad?: number } = {}
): Promise<string> {
  const { maxWidth = 1280, calidad = 0.7 } = opts;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: calidad, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return `data:image/jpeg;base64,${result.base64 ?? ''}`;
}
