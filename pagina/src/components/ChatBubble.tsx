import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme/colors';
import { fmtTime } from '../utils/formatters';

interface Props {
  body: string;
  timestamp: number;
  isMine: boolean;
}

export default function ChatBubble({ body, timestamp, isMine }: Props) {
  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>{body}</Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {fmtTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: 12,
  },
  rowLeft:  { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: Colors.blue,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMine:   { color: Colors.white },
  textTheirs: { color: Colors.text },
  time: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  timeMine:   { color: 'rgba(255,255,255,0.65)' },
  timeTheirs: { color: Colors.textMuted },
});
