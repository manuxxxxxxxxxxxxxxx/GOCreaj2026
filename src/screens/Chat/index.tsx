// src/screens/Chat/index.tsx
import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHATS } from './ChatData';
import { s } from './styles';

const INITIAL_MESSAGES = [
  { id: 1, text: '¡Hola! ¿En qué puedo ayudarte?', from: 'them', time: '10:30' },
  { id: 2, text: 'Hola, quería preguntar por mi pedido', from: 'me', time: '10:31' },
  { id: 3, text: 'Claro, déjame revisar 👀', from: 'them', time: '10:32' },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages(p => [...p, { id: p.length + 1, text: msg, from: 'me', time: 'Ahora' }]);
    setMsg('');
  };

  const activeData = CHATS.find(c => c.id === activeChat);

  if (activeChat && activeData) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={() => setActiveChat(null)} style={s.backBtn}>
            <Text style={{ fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          <View style={s.chatHeaderAvatar}>
            {activeData.avatar ? (
              <Image source={{ uri: activeData.avatar }} style={s.chatAvatar} />
            ) : (
              <View style={[s.chatAvatar, { backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>SV</Text>
              </View>
            )}
            <View style={[s.onlineDot, { backgroundColor: activeData.online ? '#10b981' : '#9ca3af' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chatHeaderName}>{activeData.name}</Text>
            <Text style={[s.chatHeaderStatus, { color: activeData.statusColor }]}>{activeData.status}</Text>
          </View>
          <TouchableOpacity style={s.chatAction}><Text style={{ fontSize: 18 }}>📞</Text></TouchableOpacity>
          <TouchableOpacity style={s.chatAction}><Text style={{ fontSize: 18 }}>📍</Text></TouchableOpacity>
        </View>

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

        <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={s.attachBtn}><Text style={{ fontSize: 20 }}>📎</Text></TouchableOpacity>
          <TextInput
            style={s.msgInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9ca3af"
            value={msg}
            onChangeText={setMsg}
            multiline
          />
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
        <TextInput
          style={s.searchInput}
          placeholder="Buscar conversaciones..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {CHATS.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <TouchableOpacity key={c.id} style={s.chatItem} onPress={() => setActiveChat(c.id)}>
            <View style={s.chatAvatarWrap}>
              {c.avatar ? (
                <Image source={{ uri: c.avatar }} style={s.listAvatar} />
              ) : (
                <View style={[s.listAvatar, { backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>SV</Text>
                </View>
              )}
              {c.online && <View style={s.onlineDotList} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.chatItemHead}>
                <Text style={s.chatItemName}>{c.name}</Text>
                <Text style={s.chatItemTime}>{c.time}</Text>
              </View>
              <View style={s.chatItemBottom}>
                <Text style={s.chatItemMsg} numberOfLines={1}>{c.lastMsg}</Text>
                {c.unread > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadTxt}>{c.unread}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.chatItemStatus, { color: c.statusColor }]}>
                {c.type === 'vendedor' ? '🏪' : c.type === 'repartidor' ? '🛵' : '💙'} {c.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}