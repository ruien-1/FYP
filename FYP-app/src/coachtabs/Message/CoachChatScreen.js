import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  where,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useRoute, useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import API from "../../api/backend";

export default function CoachChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, userName } = route.params || {};
  const currentUser = auth.currentUser;

  // Return loading state if required params are missing
  if (!userId || !currentUser) {
    return (
      <View style={styles.container}>
        <Text>Loading chat...</Text>
      </View>
    );
  }
  
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [respondedAppointments, setRespondedAppointments] = useState(new Set());
  const [appointmentStatuses, setAppointmentStatuses] = useState({}); // Track statuses by appointmentId
  const textInputRef = useRef(null);
  const isFetchingRef = useRef(false);

  const chatId =
    currentUser.uid > userId
      ? `${currentUser.uid}_${userId}`
      : `${userId}_${currentUser.uid}`;

  // Mark messages as read when screen is focused (when navigating back to chat)
  useFocusEffect(
    useCallback(() => {
      const markMessagesAsRead = async () => {
        try {
          const messagesRef = collection(db, "chats", chatId, "messages");
          const unreadQuery = query(
            messagesRef,
            where('read', '==', false)
          );
          
          const snapshot = await getDocs(unreadQuery);
          
          // Filter to only messages NOT from current coach
          const messagesToUpdate = snapshot.docs.filter(
            doc => doc.data().user?._id !== currentUser.uid
          );
          
          const updatePromises = messagesToUpdate.map(msgDoc => 
            updateDoc(msgDoc.ref, { read: true })
          );
          
          await Promise.all(updatePromises);
          console.log(`✅ Coach marked ${updatePromises.length} messages as read`);
        } catch (error) {
          console.log('Error marking messages as read:', error);
        }
      };

      markMessagesAsRead();
    }, [chatId, currentUser.uid])
  );

  // 🔥 Check which appointments have been responded to from messages
  const updateRespondedAppointments = useCallback((allMessages) => {
    const responded = new Set();
    
    allMessages.forEach(msg => {
      if (msg.user._id === currentUser.uid) {
        if (msg.text.includes("✅ Appointment confirmed") || 
            msg.text.includes("❌ Unfortunately, I cannot confirm")) {
          const appointmentId = msg.appointmentId;
          if (appointmentId) {
            responded.add(appointmentId);
          }
        }
      }
    });

    setRespondedAppointments(responded);
  }, [currentUser.uid]);

  // 🔥 Check appointment statuses for all pending appointment messages
  useEffect(() => {
    const checkAppointmentStatuses = async () => {
      try {
        const response = await API.get(
          `/appointments/coach?coachId=${currentUser.uid}&userId=${userId}`
        );
        const appointmentsData = response?.data?.data || [];
        
        const statuses = {};
        appointmentsData.forEach(apt => {
          statuses[apt.id] = apt.status;
        });
        
        setAppointmentStatuses(statuses);
        console.log('📊 Updated appointment statuses:', statuses);
      } catch (error) {
        console.error("Error checking appointment statuses:", error);
      }
    };

    checkAppointmentStatuses();
  }, [currentUser.uid, userId]);

  // 🔥 Listen to messages
  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allMessages = snapshot.docs.map((doc) => ({
          _id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        
        setMessages(allMessages);
        updateRespondedAppointments(allMessages);
      },
      (error) => console.error("❌ Snapshot error:", error)
    );

    return unsubscribe;
  }, [chatId, updateRespondedAppointments]);

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.user?._id === currentUser.uid;
    
    let messageTime;
    if (item.createdAt) {
      if (typeof item.createdAt.toDate === 'function') {
        messageTime = item.createdAt.toDate();
      } else if (item.createdAt instanceof Date) {
        messageTime = item.createdAt;
      } else {
        messageTime = new Date();
      }
    } else {
      messageTime = new Date();
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.text}
          </Text>
        </View>
        <Text style={[
          styles.messageTime,
          isCurrentUser ? styles.currentUserTime : styles.otherUserTime
        ]}>
          {messageTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  const onSend = useCallback(async (messageText) => {
    if (!messageText.trim()) return;
    
    const messageId = Math.random().toString(36).substring(7);
    setText("");

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: messageId,
        text: messageText,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || "Coach",
        },
        read: false,
      });
    } catch (error) {
      console.error("Error sending message:", error.message);
    }
  }, [chatId, currentUser]);

  const renderCustomInputToolbar = () => (
    <View style={styles.inputToolbar}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Type a message"
            placeholderTextColor="#999999"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            onPress={() => {
              if (text.trim()) {
                onSend(text.trim());
              }
            }}
            style={styles.sendButton}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
         
          <View style={styles.headerCenter}>
            <View style={styles.avatarContainer}>
              <Ionicons name="fitness" size={24} color="#5B9FED" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{userName || 'User'}</Text>
              <Text style={styles.headerRole}>Coach</Text>
            </View>
          </View>
         
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
        
        <View style={styles.inputWrapper}>
          {renderCustomInputToolbar()}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8F0FF',
  },
  headerSafeArea: {
    backgroundColor: '#E8F0FF',
  },
  container: { 
    flex: 1, 
    backgroundColor: "#E8F0FF",
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  headerRight: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  messagesList: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  messagesContent: {
    paddingTop: 10,
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 3,
    paddingHorizontal: 10,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: '#5B9FED',
  },
  otherUserBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  currentUserTime: {
    color: '#000000',
    marginRight: 10,
    textAlign: 'right',
  },
  otherUserTime: {
    color: '#000000',
    marginLeft: 10,
    textAlign: 'left',
  },
  inputWrapper: {
    backgroundColor: '#E8F0FF',
  },
  inputToolbar: {
    backgroundColor: "#E8F0FF",
    borderTopWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingBottom: 0,
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 38,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    paddingVertical: 8,
    paddingRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#5B9FED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});