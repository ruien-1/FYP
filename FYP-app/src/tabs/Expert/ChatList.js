import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../../firebaseConfig';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';

export default function ChatList() {
  const navigation = useNavigation();
  const currentUser = auth.currentUser;
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const unsubscribersRef = useRef([]);
  const [lastOpenedChatId, setLastOpenedChatId] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchChatList();

      return () => {
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];
      };
    }, [])
  );

  const setupRealtimeListeners = (chats) => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    chats.forEach((chat) => {
      const messagesRef = collection(db, 'chats', chat.chatId, 'messages');
      const msgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

      const unsubscribe = onSnapshot(msgQuery, (snapshot) => {
        if (!snapshot.empty) {
          const lastMsg = snapshot.docs[0].data();
          setChatList((prev) =>
            prev.map((c) =>
              c.chatId === chat.chatId
                ? {
                    ...c,
                    lastMessage: lastMsg.text || 'No messages yet',
                    lastMessageTime: lastMsg.createdAt?.toDate() || null,
                  }
                : c
            )
          );
        }
      });
      unsubscribersRef.current.push(unsubscribe);

      const unreadQuery = query(messagesRef, where('read', '==', false));
      const unreadUnsub = onSnapshot(unreadQuery, (snapshot) => {
        const unreadCount = snapshot.docs.filter(
          (doc) => doc.data().user?._id !== currentUser.uid
        ).length;

        setUnreadCounts((prev) => ({
          ...prev,
          [chat.chatId]: unreadCount,
        }));
      });
      unsubscribersRef.current.push(unreadUnsub);
    });

  };

  const fetchChatList = async () => {
    try {
      setRefreshing(true);
      setLoading(true);

      const chatsRef = collection(db, 'chats');
      const chatsSnapshot = await getDocs(chatsRef);
      const chats = [];

      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;
        const chatData = chatDoc.data();

        if (!chatData.participants || !chatData.participants.includes(currentUser.uid)) {
          continue;
        }

        const otherUserId = chatData.participants.find((id) => id !== currentUser.uid);
        if (!otherUserId) continue;

        const expertNameFromChat = chatData.participantNames?.[otherUserId] || 'Expert';
        const expertTypeFromChat = chatData.expertType || 'coach';

        let expertInfo = null;

        try {
          const coachDocRef = doc(db, "coach", otherUserId);
          const coachSnap = await getDoc(coachDocRef);
          
          if (coachSnap.exists()) {
            const coachData = coachSnap.data();
            expertInfo = {
              id: otherUserId,
              name: coachData.name || expertNameFromChat,
              type: 'coach',
              emoji: '🏋️‍♂️',
              specialization: coachData.specialization || '',
            };
          } else {
            const nutritionistDocRef = doc(db, "nutritionist", otherUserId);
            const nutritionistSnap = await getDoc(nutritionistDocRef);
            
            if (nutritionistSnap.exists()) {
              const nutritionistData = nutritionistSnap.data();
              expertInfo = {
                id: otherUserId,
                name: nutritionistData.name || expertNameFromChat,
                type: 'nutritionist',
                emoji: '🥗',
                specialization: nutritionistData.specialization || '',
              };
            }
          }
        } catch (error) {
        }

        if (!expertInfo) {
          expertInfo = {
            id: otherUserId,
            name: expertNameFromChat,
            type: expertTypeFromChat,
            emoji: expertTypeFromChat === 'coach' ? '🏋️‍♂️' : '🥗',
            specialization: '',
          };
        }

        let lastMessage = chatData.lastMessage || 'No messages yet';
        let lastMessageTime = chatData.lastMessageTime?.toDate() || null;

        if (!chatData.lastMessage) {
          try {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
            const messagesSnapshot = await getDocs(messagesQuery);
            if (!messagesSnapshot.empty) {
              const lastMsg = messagesSnapshot.docs[0].data();
              lastMessage = lastMsg.text || 'No messages yet';
              lastMessageTime = lastMsg.createdAt?.toDate();
            }
          } catch (err) {
          }
        }

        chats.push({
          ...expertInfo,
          chatId,
          lastMessage,
          lastMessageTime,
        });
      }

      chats.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime - a.lastMessageTime;
      });

      setChatList(chats);
      setupRealtimeListeners(chats);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChatPress = (chat) => {
    setLastOpenedChatId(chat.chatId); 

    if (chat.type === 'coach') {
      navigation.navigate('CoachesChatScreen', {
        coachId: chat.id,
        coachName: chat.name,
      });
    } else {
      navigation.navigate('NutChatScreen', {
        nutritionistId: chat.id,
        nutritionistName: chat.name,
      });
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return '';
    return message.length <= maxLength ? message : message.substring(0, maxLength) + '...';
  };

  const getExpertInitial = (name) => name?.charAt(0).toUpperCase() || '?';

  const renderChatItem = (chat) => {
    const unreadCount = unreadCounts[chat.chatId] || 0;

    return (
      <TouchableOpacity
        key={chat.chatId}
        style={[styles.chatItem, unreadCount > 0 && styles.chatItemUnread]}
        onPress={() => handleChatPress(chat)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getExpertInitial(chat.name)}</Text>
          </View>
          <Text style={styles.expertEmoji}>{chat.emoji}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.expertName, unreadCount > 0 && styles.expertNameUnread]}>
              {chat.name}
            </Text>
            <Text style={styles.timeText}>{formatTime(chat.lastMessageTime)}</Text>
          </View>
          <Text style={styles.expertType}>
            {chat.type === 'coach' ? 'Coach' : 'Nutritionist'}
            {chat.specialization ? ` • ${chat.specialization}` : ''}
          </Text>
          <Text
            style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {truncateMessage(chat.lastMessage)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Chat</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : chatList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubText}>Start chatting with a coach or nutritionist</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchChatList}
                tintColor="#007AFF"
              />
            }
          >
            {chatList.map((chat) => renderChatItem(chat))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8F0FF' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#000' },
  chatList: { flex: 1 },
  chatItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chatItemUnread: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D0E3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  expertEmoji: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unreadBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', paddingHorizontal: 5 },
  chatInfo: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expertName: { fontSize: 17, fontWeight: '600', color: '#000', flex: 1 },
  expertNameUnread: { fontWeight: '700', color: '#007AFF' },
  timeText: { fontSize: 12, color: '#8E8E93', marginLeft: 8 },
  expertType: { fontSize: 13, color: '#007AFF', marginBottom: 4, fontWeight: '500' },
  lastMessage: { fontSize: 14, color: '#666', lineHeight: 18 },
  lastMessageUnread: { color: '#000', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#666', textAlign: 'center' },
});