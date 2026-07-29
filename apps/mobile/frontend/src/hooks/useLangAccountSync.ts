import { useEffect, useRef } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints } from '@/services/api';

/**
 * Mantiene el idioma sincronizado con la cuenta del usuario, para que la preferencia
 * elegida en la web también aplique en la app (y viceversa) la próxima vez que inicie sesión.
 */
export function useLangAccountSync(): void {
  const { lang, setLang } = useLang();
  const { usuario } = useAuth();
  const adoptedForUser = useRef<number | null>(null);

  // Al iniciar sesión, adopta el idioma guardado en la cuenta si es distinto al local.
  useEffect(() => {
    if (!usuario) { adoptedForUser.current = null; return; }
    if (adoptedForUser.current === usuario.id) return;
    adoptedForUser.current = usuario.id;
    if (usuario.idioma && usuario.idioma !== lang) setLang(usuario.idioma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  // Cada cambio de idioma (manual o adoptado) se guarda en la cuenta para la próxima sesión/dispositivo.
  useEffect(() => {
    if (!usuario) return;
    api(Endpoints.authActualizarIdioma, { body: { idioma: lang } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, usuario?.id]);
}
