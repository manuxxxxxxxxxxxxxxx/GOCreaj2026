import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHATS = [
  { id: 1, name: 'Tacos El Compa', avatar: 'https://images.unsplash.com/photo-1767327142296-c4999b0aadb9?auto=format&fit=crop&w=100&q=80', lastMsg: '¡Tu pedido está en camino! 🛵', time: '2 min', unread: 2, type: 'vendedor', online: true, status: 'En camino', statusColor: '#059669' },
  { id: 2, name: 'Artesanías Oaxaca', avatar: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=100&q=80', lastMsg: 'Hola, ¿tienes disponible la vasija XL?', time: '15 min', unread: 0, type: 'vendedor', online: true, status: 'En línea', statusColor: '#059669' },
  { id: 3, name: 'Repartidor Carlos', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', lastMsg: 'Llegando en 5 minutos 🛵', time: '5 min', unread: 1, type: 'repartidor', online: true, status: '📍 A 500m', statusColor: '#f97316' },
  { id: 4, name: 'Soporte [SV]Go', avatar: '', lastMsg: '¿En qué podemos ayudarte?', time: '1h', unread: 0, type: 'soporte', online: true, status: 'Soporte 24/7', statusColor: '#059669' },
  { id: 5, name: 'NaturalMix', avatar: 'https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?auto=format&fit=crop&w=100&q=80', lastMsg: 'Tu orden fue confirmada ✅', time: '3h', unread: 0, type: 'vendedor', online: false, status: 'Hace 2h', statusColor: '#9ca3af' },
];

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: '¡Tu pedido está listo! 🎉', from: 'them', time: '2:30 PM' },
    { id: 2, text: 'El repartidor ya salió con tu orden de Birria x3', from: 'them', time: '2:31 PM' },
    { id: 3, text: '¡Genial! ¿En cuánto llega?', from: 'me', time: '2:32 PM' },
    { id: 4, text: 'Aproximadamente 15 minutos según el GPS 📍', from: 'them', time: '2:32 PM' },
    { id: 5, text: 'Perfecto, muchas gracias! 🙏', from: 'me', time: '2:33 PM' },
  ]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages(p => [...p, { id: p.length + 1, text: msg, from: 'me', time: 'Ahora' }]);
    setMsg('');
  };

  const activeData = CHATS.find(c => c.id === activeChat);

  if (activeChat && activeData) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        {/* CHAT HEADER */}
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={() => setActiveChat(null)} style={s.backBtn}>
            <Text style={{ fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          <View style={s.chatHeaderAvatar}>
            {activeData.avatar ? <Image source={{ uri: activeData.avatar }} style={s.chatAvatar} /> : <View style={[s.chatAvatar, { backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#fff', fontWeight: '900' }}>SV</Text></View>}
            <View style={[s.onlineDot, { backgroundColor: activeData.online ? '#10b981' : '#9ca3af' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chatHeaderName}>{activeData.name}</Text>
            <Text style={[s.chatHeaderStatus, { color: activeData.statusColor }]}>{activeData.status}</Text>
          </View>
          <TouchableOpacity style={s.chatAction}><Text style={{ fontSize: 18 }}>📞</Text></TouchableOpacity>
          <TouchableOpacity style={s.chatAction}><Text style={{ fontSize: 18 }}>📍</Text></TouchableOpacity>
        </View>

        {/* ORDER STATUS */}
        {activeData.type === 'repartidor' && (
          <View style={s.trackingBanner}>
            <Text style={s.trackingTitle}>🛵 Pedido en camino</Text>
            <View style={s.trackingSteps}>
              {['Confirmado', 'Preparando', 'En camino', 'Entregado'].map((step, i) => (
                <View key={i} style={s.trackingStep}>
                  <View style={[s.trackingDot, i <= 2 && s.trackingDotActive]} />
                  <Text style={[s.trackingStepTxt, i <= 2 && s.trackingStepActive]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MESSAGES */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {messages.map(m => (
            <View key={m.id} style={[s.msgRow, m.from === 'me' && s.msgRowMe]}>
              <View style={[s.bubble, m.from === 'me' ? s.bubbleMe : s.bubbleThem]}>
                <Text style={[s.bubbleTxt, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
                <Text style={[s.bubbleTime, m.from === 'me' && { color: 'rgba(255,255,255,0.7)' }]}>{m.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* INPUT */}
        <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={s.attachBtn}><Text style={{ fontSize: 20 }}>📎</Text></TouchableOpacity>
          <TextInput style={s.msgInput} placeholder="Escribe un mensaje..." placeholderTextColor="#9ca3af" value={msg} onChangeText={setMsg} multiline />
          <TouchableOpacity style={s.sendBtn} onPress={sendMsg}>
            <Text style={{ fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>💬 Mensajes</Text>
        <TouchableOpacity style={s.newChatBtn}><Text style={{ fontSize: 18 }}>✏️</Text></TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Buscar conversaciones..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {CHATS.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <TouchableOpacity key={c.id} style={s.chatItem} onPress={() => setActiveChat(c.id)}>
            <View style={s.chatAvatarWrap}>
              {c.avatar ? <Image source={{ uri: c.avatar }} style={s.listAvatar} /> : <View style={[s.listAvatar, { backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>SV</Text></View>}
              {c.online && <View style={s.onlineDotList} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.chatItemHead}>
                <Text style={s.chatItemName}>{c.name}</Text>
                <Text style={s.chatItemTime}>{c.time}</Text>
              </View>
              <View style={s.chatItemBottom}>
                <Text style={s.chatItemMsg} numberOfLines={1}>{c.lastMsg}</Text>
                {c.unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadTxt}>{c.unread}</Text></View>}
              </View>
              <Text style={[s.chatItemStatus, { color: c.statusColor }]}>{c.type === 'vendedor' ? '🏪' : c.type === 'repartidor' ? '🛵' : '💙'} {c.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
  newChatBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', marginHorizontal: 16, marginBottom: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  chatAvatarWrap: { position: 'relative' },
  listAvatar: { width: 52, height: 52, borderRadius: 999 },
  onlineDotList: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 999, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
  chatItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatItemName: { fontSize: 15, fontWeight: '800', color: '#111' },
  chatItemTime: { fontSize: 11, color: '#9ca3af' },
  chatItemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  chatItemMsg: { fontSize: 13, color: '#6b7280', flex: 1 },
  unreadBadge: { backgroundColor: '#059669', borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  chatItemStatus: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  // Chat view
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  backBtn: { padding: 4 },
  chatHeaderAvatar: { position: 'relative' },
  chatAvatar: { width: 40, height: 40, borderRadius: 999 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 999, borderWidth: 2, borderColor: '#fff' },
  chatHeaderName: { fontSize: 15, fontWeight: '800', color: '#111' },
  chatHeaderStatus: { fontSize: 11, fontWeight: '600' },
  chatAction: { padding: 8 },
  trackingBanner: { backgroundColor: '#f0fdf4', padding: 12, borderBottomWidth: 1, borderBottomColor: '#dcfce7' },
  trackingTitle: { fontSize: 13, fontWeight: '800', color: '#059669', marginBottom: 8 },
  trackingSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  trackingStep: { alignItems: 'center', gap: 4 },
  trackingDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#d1d5db' },
  trackingDotActive: { backgroundColor: '#059669' },
  trackingStepTxt: { fontSize: 9, color: '#9ca3af', fontWeight: '600' },
  trackingStepActive: { color: '#059669' },
  msgRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: '#059669', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 14, color: '#111', lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 8 },
  attachBtn: { padding: 8 },
  msgInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111', maxHeight: 100 },
  sendBtn: { backgroundColor: '#059669', width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
