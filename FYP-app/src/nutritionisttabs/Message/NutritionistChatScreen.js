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

export default function NutritionistChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, userName: userNameFromParams } = route.params || {};
  const currentUser = auth.currentUser;

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
  const [appointmentStatuses, setAppointmentStatuses] = useState({});
  const [nutritionistName, setNutritionistName] = useState("Nutritionist");
  const [userName, setUserName] = useState(userNameFromParams || "User");
  const textInputRef = useRef(null);
  const isFetchingRef = useRef(false);

  const chatId =
    currentUser.uid > userId
      ? `${currentUser.uid}_${userId}`
      : `${userId}_${currentUser.uid}`;

  useEffect(() => {
    const fetchNutritionistName = async () => {
      try {
        const nutritionistDocRef = doc(db, "nutritionist", currentUser.uid);
        const nutritionistDocSnap = await getDoc(nutritionistDocRef);
        
        if (nutritionistDocSnap.exists() && nutritionistDocSnap.data().name) {
          setNutritionistName(nutritionistDocSnap.data().name);
          return;
        }

        const nutritionistInfoDocRef = doc(db, "nutritionist_info", currentUser.uid);
        const nutritionistInfoDocSnap = await getDoc(nutritionistInfoDocRef);
        
        if (nutritionistInfoDocSnap.exists() && nutritionistInfoDocSnap.data().name) {
          setNutritionistName(nutritionistInfoDocSnap.data().name);
        } else {
        }
      } catch (error) {
      }
    };
    fetchNutritionistName();
  }, [currentUser.uid]);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userDocRef = doc(db, "user", userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().name) {
          setUserName(userDocSnap.data().name);
        }
      } catch (error) {
      }
    };
    fetchUserName();
  }, [userId]);

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
          
          const messagesToUpdate = snapshot.docs.filter(
            doc => doc.data().user?._id !== currentUser.uid
          );
          
          const updatePromises = messagesToUpdate.map(msgDoc => 
            updateDoc(msgDoc.ref, { read: true })
          );
          
          await Promise.all(updatePromises);
        } catch (error) {
        }
      };

      markMessagesAsRead();
    }, [chatId, currentUser.uid])
  );

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

  useEffect(() => {
    const checkAppointmentStatuses = async () => {
      try {
        const response = await API.get(
          `/appointments/nutritionist?nutritionistId=${currentUser.uid}&userId=${userId}`
        );
        const appointmentsData = response?.data?.data || [];
        
        const statuses = {};
        appointmentsData.forEach(apt => {
          statuses[apt.id] = apt.status;
        });
        
        setAppointmentStatuses(statuses);
      } catch (error) {
      }
    };

    checkAppointmentStatuses();
  }, [currentUser.uid, userId]);

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
          name: nutritionistName
        },
        read: false,
      });
      
    } catch (error) {
    }
  }, [chatId, currentUser, nutritionistName]);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            <Ionicons name="nutrition" size={24} color="#5B9FED" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{userName || 'User'}</Text>
          </View>
        </View>
       
        <View style={styles.headerRight} />
      </View>

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

      {Platform.OS === "android" && <KeyboardAvoidingView behavior="padding" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    paddingTop: 10,
    paddingBottom: 12,
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
    paddingBottom: 8,
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