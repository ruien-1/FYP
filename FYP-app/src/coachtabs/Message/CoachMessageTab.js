import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

export default function CoachMessageTab() {
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastOpenedChatId, setLastOpenedChatId] = useState(null);
  const unsubscribersRef = useRef([]);

  // --- Handle focus: fetch conversations and force clear unread for last opened chat ---
  useFocusEffect(
    React.useCallback(() => {
      console.log("📱 Screen focused - fetching conversations");
      const refreshConversations = async () => {
        // ✅ Get current user ID at the time of fetching
        const currentCoachId = auth.currentUser?.uid;
        if (!currentCoachId) {
          console.log("❌ No authenticated coach found");
          setLoading(false);
          return;
        }

        await fetchConversations(currentCoachId);

        // ✅ Force mark last opened chat as read
        if (lastOpenedChatId) {
          try {
            const messagesRef = collection(db, "chats", lastOpenedChatId, "messages");
            const unreadQuery = query(messagesRef, where("read", "==", false));
            const snapshot = await getDocs(unreadQuery);

            const toUpdate = snapshot.docs.filter(
              (doc) => doc.data().user?._id !== currentCoachId
            );
            const updates = toUpdate.map((msgDoc) =>
              updateDoc(msgDoc.ref, { read: true })
            );
            await Promise.all(updates);

            console.log(
              `✅ Force-marked ${updates.length} messages as read for ${lastOpenedChatId}`
            );

            // Immediately clear unread in state
            setUnreadCounts((prev) => ({
              ...prev,
              [lastOpenedChatId]: 0,
            }));
          } catch (error) {
            console.error("❌ Error force-marking messages as read:", error);
          }
        }
      };

      refreshConversations();

      return () => {
        console.log("🧹 Cleaning up listeners");
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];
      };
    }, [lastOpenedChatId])
  );

  // --- Real-time unread and latest message listeners ---
  const setupUnreadListeners = async (conversationList, currentCoachId) => {
    try {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];

      conversationList.forEach((conv) => {
        const messagesRef = collection(db, "chats", conv.chatId, "messages");
        const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(50));

        const unsubscribe = onSnapshot(
          messagesQuery,
          (snapshot) => {
            const messages = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              parsedDate: doc.data().createdAt?.toDate
                ? doc.data().createdAt.toDate()
                : new Date(0),
            }));

            const unreadCount = messages.filter(
              (msg) => msg.user?._id !== currentCoachId && msg.read === false
            ).length;
            const latestMessage = messages[0];

            setUnreadCounts((prev) => ({
              ...prev,
              [conv.chatId]: unreadCount,
            }));

            if (latestMessage) {
              setConversations((prevConvs) => {
                const updated = prevConvs.map((c) => {
                  if (c.chatId === conv.chatId) {
                    return {
                      ...c,
                      lastMessage: latestMessage.text || "Message",
                      timestamp: latestMessage.parsedDate,
                      unreadCount,
                    };
                  }
                  return c;
                });
                updated.sort((a, b) => b.timestamp - a.timestamp);
                return updated;
              });

              if (searchText.trim() === "") {
                setFilteredConversations((prevConvs) => {
                  const updated = prevConvs.map((c) => {
                    if (c.chatId === conv.chatId) {
                      return {
                        ...c,
                        lastMessage: latestMessage.text || "Message",
                        timestamp: latestMessage.parsedDate,
                        unreadCount,
                      };
                    }
                    return c;
                  });
                  updated.sort((a, b) => b.timestamp - a.timestamp);
                  return updated;
                });
              }
            }

            console.log(
              `📬 Updated ${conv.clientName}: ${unreadCount} unread, latest: "${latestMessage?.text?.substring(
                0,
                30
              )}..."`
            );
          },
          (error) => console.error(`❌ Snapshot error for ${conv.chatId}:`, error)
        );

        unsubscribersRef.current.push(unsubscribe);
      });

      console.log(`✅ Setup ${unsubscribersRef.current.length} real-time listeners`);
    } catch (error) {
      console.error("❌ Error setting up listeners:", error);
    }
  };

// --- Fetch all conversations (Option 3: show all chats that include this coach) ---
const fetchConversations = async (currentCoachId) => {
  try {
    console.log("📥 Fetching all chats involving coach:", currentCoachId);
    if (!refreshing) setLoading(true);

    const chatsRef = collection(db, "chats");
    const chatSnapshot = await getDocs(chatsRef);
    const conversationList = [];

    for (const chatDoc of chatSnapshot.docs) {
      const chatId = chatDoc.id;

      // Only include chats where coach is one of the participants
      if (chatId.includes(currentCoachId)) {
        const [id1, id2] = chatId.split("_");
        const clientId = id1 === currentCoachId ? id2 : id1;

        // Fetch user info from "user" collection
        const userDocRef = doc(db, "user", clientId);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) continue;

        const clientData = userSnap.data();

        // Get messages
        const messagesRef = collection(db, "chats", chatId, "messages");
        const messagesSnapshot = await getDocs(messagesRef);
        if (messagesSnapshot.docs.length === 0) continue;

        const messages = messagesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            parsedDate: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(0),
          };
        });

        messages.sort((a, b) => b.parsedDate - a.parsedDate);
        const latestMessage = messages[0];
        const unreadCount = messages.filter(
          (msg) => msg.user?._id !== currentCoachId && msg.read === false
        ).length;

        conversationList.push({
          clientId,
          chatId,
          clientName: clientData.name || "Unknown Client",
          lastMessage: latestMessage.text || "Message",
          timestamp: latestMessage.parsedDate,
          unreadCount,
        });
      }
    }

    conversationList.sort((a, b) => b.timestamp - a.timestamp);
    setConversations(conversationList);
    setFilteredConversations(conversationList);

    // Real-time updates for unread/latest message
    setTimeout(() => setupUnreadListeners(conversationList, currentCoachId), 400);
  } catch (error) {
    console.error("❌ Error fetching all coach chats:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};


  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter((conv) =>
        conv.clientName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  };

  const handleChatPress = (clientId, clientName, chatId) => {
    console.log("💬 Opening chat with client:", clientName);
    setLastOpenedChatId(chatId); // ✅ Store last opened chat
    navigation.navigate("CoachChatScreen", {
      userId: clientId,
      userName: clientName,
      chatId,
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const currentCoachId = auth.currentUser?.uid;
    if (currentCoachId) {
      fetchConversations(currentCoachId);
    } else {
      setRefreshing(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    const diffInDays = Math.floor(diffInMinutes / 1440);
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversationItem = ({ item }) => {
    const unreadCount =
      unreadCounts[item.chatId] !== undefined
        ? unreadCounts[item.chatId]
        : item.unreadCount;

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          unreadCount > 0 && styles.conversationCardUnread,
        ]}
        onPress={() => handleChatPress(item.clientId, item.clientName, item.chatId)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.clientName?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.clientName,
                unreadCount > 0 && styles.clientNameUnread,
              ]}
            >
              {item.clientName}
            </Text>
            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
          </View>
          <Text
            style={[
              styles.lastMessage,
              unreadCount > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name"
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            {searchText
              ? "No matching conversations"
              : "No clients assigned yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.chatId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#D0E7FF",
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    color: "#666",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  clearIcon: {
    fontSize: 18,
    color: "#999",
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationCardUnread: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D0E7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
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
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  clientNameUnread: {
    fontWeight: '700',
    color: '#007AFF',
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  lastMessageUnread: {
    color: '#000',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
});