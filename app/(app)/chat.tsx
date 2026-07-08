import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { answerQuestion, FALLBACK_MESSAGE } from '@/lib/chat/answerQuestion';
import { useFinancialData } from '@/lib/queries/useFinancialData';
import { useWorkspace } from '@/lib/WorkspaceProvider';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_QUESTIONS = [
  '¿En qué gasté más este mes?',
  '¿Cuánto he ahorrado?',
  '¿Cuánto puedo invertir?',
  '¿Qué deuda debería pagar primero?',
];

let nextId = 1;

export default function ChatScreen() {
  const { currentWorkspace } = useWorkspace();
  const { today, transactionsQuery, debtsQuery } = useFinancialData(currentWorkspace?.id);
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hola, soy el chat financiero de Kuenta. Pregúntame sobre tus movimientos en ${currentWorkspace?.name ?? 'este workspace'}, por ejemplo cuánto gastaste, cuánto puedes invertir, o si te alcanza para una compra.`,
    },
  ]);
  const [input, setInput] = useState('');
  const ready = !transactionsQuery.isLoading && !debtsQuery.isLoading;

  function send(text: string) {
    const question = text.trim();
    if (!question) return;

    const userMessage: ChatMessage = { id: `m${nextId++}`, role: 'user', text: question };

    const answer = ready
      ? answerQuestion(question, transactionsQuery.data ?? [], debtsQuery.data ?? [], today)
      : FALLBACK_MESSAGE;
    const assistantMessage: ChatMessage = { id: `m${nextId++}`, role: 'assistant', text: answer };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Chat financiero</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListFooterComponent={
            messages.length === 1 ? (
              <View style={styles.suggestions}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Pressable key={q} style={styles.suggestionChip} onPress={() => send(q)}>
                    <Text style={styles.suggestionText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />

        <Text style={styles.disclaimer}>
          Respuestas calculadas localmente a partir de tus movimientos (no es un modelo de IA externo todavía).
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu pregunta..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim()}
          >
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="robot-happy-outline" size={16} color={colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ahorroBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAssistant: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  suggestions: {
    marginTop: 4,
    gap: 8,
  },
  suggestionChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ahorroBg,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
