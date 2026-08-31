import { useCallback, useEffect } from "react";
import { Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export interface GoogleUserInfo {
  id: string;
  email?: string;
  name?: string;
  /** JWT firmado por Google — el backend lo re-verifica antes de confiar en id/email/name. */
  idToken: string;
}

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Hook de inicio de sesión con Google vía Authorization Code + PKCE (expo-auth-session).
 *
 * Requiere la variable de entorno EXPO_PUBLIC_GOOGLE_CLIENT_ID (ver GOOGLE_AUTH_SETUP.md).
 * Si no está configurada, `promptAsync` muestra una alerta explicativa en vez de fallar
 * en silencio o usar un client id inventado.
 */
export function useGoogleAuth(onSuccess: (info: GoogleUserInfo) => void | Promise<void>) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "gocreaj" });

  const [request, response, promptAsyncRaw] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID ?? "missing-client-id",
      scopes: ["openid", "profile", "email"],
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    GOOGLE_DISCOVERY,
  );

  useEffect(() => {
    if (!CLIENT_ID || !request || response?.type !== "success") return;
    const { code } = response.params;
    (async () => {
      try {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code,
            redirectUri,
            extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
          },
          GOOGLE_DISCOVERY,
        );

        if (!tokenResult.idToken) throw new Error("Google no devolvió idToken");

        const userInfoRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
          headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
        });
        const userInfo = await userInfoRes.json();
        await onSuccess({ id: userInfo.id, email: userInfo.email, name: userInfo.name, idToken: tokenResult.idToken });
      } catch {
        Alert.alert("No se pudo iniciar sesión con Google", "Ocurrió un problema al completar la autenticación. Intenta de nuevo.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const promptAsync = useCallback(async () => {
    if (!CLIENT_ID) {
      Alert.alert(
        "Google aún no está configurado",
        "Falta agregar EXPO_PUBLIC_GOOGLE_CLIENT_ID en el archivo .env del proyecto con un Client ID real de Google Cloud Console. Revisa GOOGLE_AUTH_SETUP.md para los pasos.",
      );
      return;
    }
    await promptAsyncRaw();
  }, [promptAsyncRaw]);

  return { promptAsync, ready: !!request };
}
