import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
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

export default function CoachesChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { coachId, coachName } = route.params || {};
  const currentUser = auth.currentUser;

  if (!coachId || !currentUser) {
    return (
      <View style={styles.container}>
        <Text>Loading chat...</Text>
      </View>
    );
  }

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userName, setUserName] = useState("User"); // ✅ Add userName state
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const textInputRef = useRef(null);

  const chatId =
    currentUser.uid > coachId
      ? `${currentUser.uid}_${coachId}`
      : `${coachId}_${currentUser.uid}`;

  // ✅ Fetch user name from Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userDocRef = doc(db, "user", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().name) {
          setUserName(userDocSnap.data().name);
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };
    fetchUserName();
  }, [currentUser.uid]);

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      const markMessagesAsRead = async () => {
        try {
          const messagesRef = collection(db, "chats", chatId, "messages");
          const unreadQuery = query(messagesRef, where("read", "==", false));
          const snapshot = await getDocs(unreadQuery);

          const messagesToUpdate = snapshot.docs.filter(
            (doc) => doc.data().user?._id !== currentUser.uid
          );

          const updatePromises = messagesToUpdate.map((msgDoc) =>
            updateDoc(msgDoc.ref, { read: true })
          );

          await Promise.all(updatePromises);
          console.log(`✅ User marked ${updatePromises.length} messages as read`);
        } catch (error) {
          console.log("Error marking messages as read:", error);
        }
      };

      markMessagesAsRead();
    }, [chatId, currentUser.uid])
  );

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
      },
      (error) => console.error("❌ Snapshot error:", error)
    );

    return unsubscribe;
  }, [chatId]);

  // ✅ Ensure chat document exists
  const ensureChatDocument = async (messageText) => {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      // Fetch coach name if not provided or is undefined
      let coachNameToUse = coachName;
      if (!coachNameToUse || coachNameToUse === undefined) {
        try {
          const coachDoc = await getDoc(doc(db, "coach", coachId));
          if (coachDoc.exists()) {
            coachNameToUse = coachDoc.data().name || 'Coach';
          } else {
            // Fallback to coach_info collection
            const coachInfoDoc = await getDoc(doc(db, "coach_info", coachId));
            if (coachInfoDoc.exists()) {
              coachNameToUse = coachInfoDoc.data().name || 'Coach';
            } else {
              coachNameToUse = 'Coach'; // Final fallback
            }
          }
        } catch (fetchError) {
          console.warn('Could not fetch coach name:', fetchError);
          coachNameToUse = 'Coach'; // Fallback if fetch fails
        }
      }

      const chatData = {
        participants: [currentUser.uid, coachId],
        participantNames: {
          [currentUser.uid]: userName,
          [coachId]: coachNameToUse,
        },
        expertType: "coach",
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          ...chatData,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(chatDocRef, chatData, { merge: true });
      }
    } catch (error) {
      console.error("❌ Error ensuring chat document:", error);
    }
  };

  const onSend = useCallback(async (messageText) => {
    if (!messageText.trim()) return;
    
    const messageId = Math.random().toString(36).substring(7);
    setText("");

    try {
      await ensureChatDocument(messageText);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: messageId,
        text: messageText,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: userName,
        },
        read: false,
      });
    } catch (error) {
      console.error("Error sending message:", error.message);
    }
  }, [chatId, currentUser, userName, coachId, coachName]);

  const handleMakeAppointment = async () => {
    try {
      const appointmentData = {
        userId: currentUser.uid,
        userName: userName, // ✅ Use fetched userName
        expertId: coachId,
        expertName: coachName,
        appointmentDate: selectedDate.toISOString(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const response = await API.post("/appointments/coach", appointmentData);

      if (response.data.success) {
        // Send message to chat
        const appointmentMessage = `📅 Appointment Request\n\nDate: ${selectedDate.toLocaleDateString(
          "en-US",
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        )}\nTime: ${selectedDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}\n\nWaiting for confirmation...`;

        await ensureChatDocument(appointmentMessage); // ✅ Ensure chat doc

        await addDoc(collection(db, "chats", chatId, "messages"), {
          _id: Math.random().toString(36).substring(7),
          text: appointmentMessage,
          createdAt: serverTimestamp(),
          user: {
            _id: currentUser.uid,
            name: userName, // ✅ Use fetched userName
          },
          appointmentId: response.data.appointmentId,
          isAppointmentRequest: true,
          read: false,
        });

        Alert.alert("Success", "Appointment request sent!");
        setShowAppointmentModal(false);
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      Alert.alert("Error", "Failed to create appointment request.");
    }
  };

  const handleRequestWorkoutPlan = async () => {
    try {
      // Try to create a backend workout plan request if available
      let workoutPlanId = null;
      try {
        const workoutPlanData = {
          userId: currentUser.uid,
          userName: userName || "User",
          expertId: coachId,
          expertName: coachName || "Coach",
          duration: "1 week",
          requestMessage: "I would like to request a personalized 1-week workout plan.",
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        const resp = await API.post("/workout-plans/coach", workoutPlanData);
        workoutPlanId = resp.data?.workoutPlanId || null;
      } catch (_) {
        // Silently ignore if endpoint not implemented yet
      }

      const workoutMessage = `💪 Workout Plan Request\n\nDuration: 1 Week\n\nI would like to request a personalized workout plan for one week. Please provide a detailed schedule.`;

      await ensureChatDocument(workoutMessage);

      const messageData = {
        _id: Math.random().toString(36).substring(7),
        text: workoutMessage,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: userName,
        },
        isWorkoutRequest: true,
        read: false,
      };
      if (workoutPlanId) {
        messageData.workoutPlanId = workoutPlanId;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      Alert.alert("Success", "Workout plan request sent!");
      setShowWorkoutModal(false);
    } catch (error) {
      console.error("Error requesting workout plan:", error);
      Alert.alert("Error", "Failed to send workout plan request.");
    }
  };

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

  const renderCustomInputToolbar = () => (
    <View style={styles.inputToolbar}>
      <View style={styles.inputRow}>
        <TouchableOpacity 
          style={styles.plusButton}
          onPress={() => setShowPlusMenu(!showPlusMenu)}
          activeOpacity={0.7}
        >
          <Text style={styles.plusIcon}>+</Text>
        </TouchableOpacity>

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
         
          <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7} onPress={() => navigation.navigate("CoachProfile", { coachId, coachName })}>
            <View style={styles.avatarContainer}>
              <Ionicons name="fitness" size={24} color="#5B9FED" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{coachName || 'Coach'}</Text>
              <Text style={styles.headerRole}>Fitness Coach</Text>
            </View>
          </TouchableOpacity>
         
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

      {/* Plus Menu Modal */}
      <Modal
        visible={showPlusMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlusMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlusMenu(false)}
        >
          <View style={styles.plusMenuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowPlusMenu(false);
                setShowAppointmentModal(true);
              }}
            >
              <Text style={styles.menuIcon}>📅</Text>
              <Text style={styles.menuText}>Make Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowPlusMenu(false);
                setShowWorkoutModal(true);
              }}
            >
              <Text style={styles.menuIcon}>💪</Text>
              <Text style={styles.menuText}>Request Workout Plan</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Appointment Modal */}
      <Modal
        visible={showAppointmentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appointmentModal}>
            <Text style={styles.modalTitle}>Schedule Appointment</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                📅 {selectedDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                🕐 {selectedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAppointmentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleMakeAppointment}
              >
                <Text style={styles.confirmButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Workout Plan Modal */}
      <Modal
        visible={showWorkoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appointmentModal}>
            <Text style={styles.modalTitle}>Request Workout Plan</Text>
            <Text style={styles.modalDescription}>
              Request a personalized 1-week workout plan from your coach.
            </Text>

            <View style={styles.planInfo}>
              <Text style={styles.planInfoText}>💪 Duration: 1 Week</Text>
              <Text style={styles.planInfoText}>📋 Personalized schedule</Text>
              <Text style={styles.planInfoText}>🎯 Tailored to your goals</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowWorkoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleRequestWorkoutPlan}
              >
                <Text style={styles.confirmButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === "android" && <KeyboardAvoidingView behavior="padding" />}
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
  plusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#5B9FED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  plusIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '400',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  plusMenuContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: { fontSize: 24, marginRight: 16 },
  menuText: { fontSize: 16, fontWeight: "600", color: "#333" },
  appointmentModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 100,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  planInfo: {
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  planInfoText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateButtonText: { fontSize: 16, color: "#333", fontWeight: "500" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#666" },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  confirmButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});