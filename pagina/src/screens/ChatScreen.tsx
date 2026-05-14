import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import ChatBubble from '../components/ChatBubble';
import { Colors, Radius } from '../theme/colors';
import {
  getConversations,
  getMessages,
  sendMessage as apiSendMessage,
  markConversationRead,
} from '../services/messagesService';
import type { Conversation, Message } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const QUICK_REPLIES = ['¿Está disponible?', '¿Cuánto tiempo tarda?', 'Gracias 😊', '¿Puedes llamarme?'];

export default function ChatScreen({ navigation }: Props) {
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [active,         setActive]         = useState<Conversation | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState('');
  const [filterType,     setFilterType]     = useState<'all' | 'vendedor' | 'repartidor'>('all');
  const [loadingConvs,   setLoadingConvs]   = useState(true);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (active) loadMessages(active.id);
  }, [active]);

  async function loadConversations() {
    setLoadingConvs(true);
    const data = await getConversations();
    setConversations(data);
    setLoadingConvs(false);
  }

  async function loadMessages(partnerId: string) {
    setLoadingMsgs(true);
    const data = await getMessages(partnerId);
    setMessages(data);
    setLoadingMsgs(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    await markConversationRead(partnerId);
    setConversations((prev) =>
      prev.map((c) => (c.id === partnerId ? { ...c, unread: 0 } : c))
    );
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !active) return;
    const optimistic: Message = {
      id:          `local-${Date.now()}`,
      senderId:    'me',
      recipientId: active.id,
      body:        text.trim(),
      timestamp:   Date.now(),
      read:        true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    const sent = await apiSendMessage(active.id, text.trim());
    if (sent) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...optimistic, id: sent.id } : m))
      );
    }
  }

  const filtered = filterType === 'all'
    ? conversations
    : conversations.filter((c) => c.type === filterType);

  if (active) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Chat header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActive(null)} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={[styles.avatarSm, { backgroundColor: typeColor(active.type) + '30' }]}>
              <Text style={[styles.avatarInitials, { color: typeColor(active.type) }]}>{active.initials}</Text>
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{active.name}</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: active.online ? Colors.green : Colors.textMuted }]} />
                <Text style={styles.onlineText}>{active.online ? 'En línea' : 'Desconectado'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery banner */}
        {active.type === 'repartidor' && (
          <View style={styles.deliveryBanner}>
            <Text style={styles.deliveryBannerText}>🛵 En camino · Estimado: 8 min</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Delivery' as any)}>
              <Text style={styles.deliveryBannerLink}>Rastrear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        {loadingMsgs ? (
          <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messagesContent}
            onLayout={() => listRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <ChatBubble
                body={item.body}
                timestamp={item.timestamp}
                isMine={item.senderId === 'me'}
              />
            )}
          />
        )}

        {/* Quick replies */}
        <FlatList
          horizontal
          data={QUICK_REPLIES}
          keyExtractor={(q) => q}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesContent}
          style={styles.quickReplies}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.quickChip} onPress={() => sendMessage(item)}>
              <Text style={styles.quickChipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.msgInput}
            placeholder="Escribe un mensaje…"
            value={input}
            onChangeText={setInput}
            multiline
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(input)}>
            <Text style={{ fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {([
          { key: 'all',        label: 'Todos' },
          { key: 'vendedor',   label: 'Vendedores' },
          { key: 'repartidor', label: 'Repartidores' },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filterType === f.key && styles.filterTabActive]}
            onPress={() => setFilterType(f.key)}
          >
            <Text style={[styles.filterTabText, filterType === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversations */}
      {loadingConvs ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.blue} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 14 }}>No hay conversaciones aún.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.convRow} onPress={() => setActive(item)} activeOpacity={0.7}>
              <View style={[styles.avatar, { backgroundColor: typeColor(item.type) + '25' }]}>
                <Text style={[styles.avatarText, { color: typeColor(item.type) }]}>{item.initials}</Text>
                {item.online && <View style={styles.onlineBadge} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.convTop}>
                  <Text style={styles.convName}>{item.name}</Text>
                  <Text style={styles.convTime}>{item.timestamp}</Text>
                </View>
                <View style={styles.convBottom}>
                  <Text style={styles.convLast} numberOfLines={1}>{item.lastMessage}</Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function typeColor(type: Conversation['type']) {
  if (type === 'repartidor') return Colors.purple;
  if (type === 'soporte')    return Colors.orange;
  return Colors.blue;
}

const styles = StyleSheet.create({
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:             { paddingRight: 12 },
  backText:            { fontSize: 22, color: Colors.blue, fontWeight: '600' },
  headerTitle:         { fontSize: 17, fontWeight: '700', color: Colors.text },
  filterRow:           { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 8 },
  filterTab:           { flex: 1, paddingVertical: 12, alignItems: 'center' },
  filterTabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.blue },
  filterTabText:       { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  filterTabTextActive: { color: Colors.blue },
  convRow:             { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  avatar:              { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText:          { fontSize: 16, fontWeight: '700' },
  onlineBadge:         { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.green, borderWidth: 2, borderColor: Colors.white },
  convTop:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName:            { fontSize: 14, fontWeight: '700', color: Colors.text },
  convTime:            { fontSize: 11, color: Colors.textMuted },
  convBottom:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLast:            { flex: 1, fontSize: 12, color: Colors.textMuted },
  unreadBadge:         { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  unreadText:          { color: Colors.white, fontSize: 10, fontWeight: '700' },
  chatHeader:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  chatHeaderInfo:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatHeaderName:      { fontSize: 15, fontWeight: '700', color: Colors.text },
  avatarSm:            { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:      { fontSize: 13, fontWeight: '700' },
  onlineRow:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot:           { width: 7, height: 7, borderRadius: 4 },
  onlineText:          { fontSize: 11, color: Colors.textMuted },
  deliveryBanner:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.purple + '15', paddingHorizontal: 16, paddingVertical: 10 },
  deliveryBannerText:  { fontSize: 13, color: Colors.purple, fontWeight: '600' },
  deliveryBannerLink:  { fontSize: 13, color: Colors.blue, fontWeight: '600' },
  messagesContent:     { paddingVertical: 12, paddingBottom: 20 },
  quickReplies:        { maxHeight: 46, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  quickRepliesContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  quickChip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.blue + '15', borderWidth: 1, borderColor: Colors.blue + '40' },
  quickChipText:       { fontSize: 12, color: Colors.blue, fontWeight: '500' },
  inputBar:            { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  msgInput:            { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text, maxHeight: 100 },
  sendBtn:             { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
});
