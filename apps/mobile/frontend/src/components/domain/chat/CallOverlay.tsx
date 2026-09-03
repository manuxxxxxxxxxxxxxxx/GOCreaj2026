import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MicrophoneIcon, MicrophoneSlashIcon, PhoneDisconnectIcon, PhoneIcon } from "phosphor-react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { useCall } from "../../../context/CallContext";
import { Avatar } from "../../ui/Avatar";

function formatoDuracion(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Se monta una sola vez en la raíz de la app (ver App.tsx): aparece sobre cualquier
 * pantalla en cuanto hay una llamada, entrante o en curso -- mismo criterio que
 * apps/web/web/src/components/domain/chat/CallOverlay.tsx, del que se portó este archivo
 * (acá solo voz, sin video: ver CallContext.tsx). */
export function CallOverlay() {
  const { tokens } = useTheme();
  const { estado, otro, muted, duracion, aceptar, rechazar, colgar, toggleMute } = useCall();

  if (estado === "idle") return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.wrap, { backgroundColor: tokens.bg }]}>
        <View style={{ alignItems: "center", gap: 14 }}>
          <View>
            {estado === "entrante" && <View style={[styles.pulseRing, { borderColor: tokens.cyan }]} />}
            <Avatar nombre={otro?.nombre ?? "?"} foto={otro?.foto_perfil ?? null} size={104} />
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 21, color: tokens.textPrimary }}>{otro?.nombre}</Text>
            <Text style={{ fontSize: 13, color: tokens.textMuted, marginTop: 4 }}>
              {estado === "entrante" && "Llamada de voz entrante…"}
              {estado === "saliente" && "Llamando…"}
              {estado === "activa" && formatoDuracion(duracion)}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          {estado === "entrante" ? (
            <>
              <RedondoBtn tono="danger" onPress={rechazar} label="Rechazar">
                <PhoneDisconnectIcon size={24} weight="fill" color="#fff" />
              </RedondoBtn>
              <RedondoBtn tono="ok" onPress={aceptar} label="Aceptar">
                <PhoneIcon size={24} weight="fill" color="#fff" />
              </RedondoBtn>
            </>
          ) : (
            <>
              {estado === "activa" && (
                <RedondoBtn tono={muted ? "activo" : "neutro"} onPress={toggleMute} label={muted ? "Activar micrófono" : "Silenciar"} tokens={tokens}>
                  {muted ? <MicrophoneSlashIcon size={20} color={tokens.cyanInk} /> : <MicrophoneIcon size={20} color={tokens.textPrimary} />}
                </RedondoBtn>
              )}
              <RedondoBtn tono="danger" onPress={colgar} label="Colgar" grande>
                <PhoneDisconnectIcon size={24} weight="fill" color="#fff" />
              </RedondoBtn>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function RedondoBtn({
  children,
  onPress,
  label,
  tono = "neutro",
  grande,
  tokens,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  tono?: "neutro" | "danger" | "ok" | "activo";
  grande?: boolean;
  tokens?: ReturnType<typeof useTheme>["tokens"];
}) {
  const size = grande ? 62 : 52;
  const bg = tono === "danger" ? "#E5484D" : tono === "ok" ? "#30A46C" : tono === "activo" ? tokens?.cyan : tokens?.surface2;
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[styles.btn, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", top: -14, left: -14, right: -14, bottom: -14, borderRadius: 66, borderWidth: 2 },
  controls: { position: "absolute", bottom: 60, flexDirection: "row", alignItems: "center", gap: 20 },
  btn: { alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
});
