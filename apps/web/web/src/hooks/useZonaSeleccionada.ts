import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getZonaGuardada, setZonaGuardada } from "../lib/zona";

/**
 * Municipio efectivo para las secciones "de tu zona" del Home. Si hay sesión,
 * usa el municipio de la cuenta; si no, cae al que el invitado haya elegido a
 * mano (persistido en localStorage) para que no haga falta registrarse solo
 * para ver negocios cercanos.
 */
export function useZonaSeleccionada() {
  const { usuario } = useAuth();
  const [zonaInvitado, setZonaInvitado] = useState<string | null>(() => getZonaGuardada());

  const municipio = usuario?.municipio ?? zonaInvitado ?? undefined;
  const esInvitadoSinZona = !usuario?.municipio && !zonaInvitado;

  const elegirZona = (nombreMunicipio: string) => {
    setZonaInvitado(nombreMunicipio);
    setZonaGuardada(nombreMunicipio);
  };

  return { municipio, esInvitadoSinZona, elegirZona };
}
