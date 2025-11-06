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
  doc,
  getDoc,
  setDoc,
  getDocs,
  where,
  updateDoc,
} from "firebase/firestore";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import API from "../../api/backend";

export default function NutChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const currentUser = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userName, setUserName] = useState("User");
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDietPlanModal, setShowDietPlanModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const textInputRef = useRef(null);

  const nutritionistId = route.params?.nutritionistId;
  const nutritionistName = route.params?.nutritionistName;

  const chatId =
    currentUser.uid > nutritionistId
      ? `${currentUser.uid}_${nutritionistId}`
      : `${nutritionistId}_${currentUser.uid}`;

  // Fetch user name from Firestore
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

  // --- MAIN CHAT MESSAGES REALTIME FETCH ---
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
      (error) => {
        console.error("❌ Snapshot error:", error);
      }
    );
    return unsubscribe;
  }, [chatId]);

  // --- 1️⃣ MARK ALL UNREAD MESSAGES AS READ WHEN OPENING CHAT ---
  useEffect(() => {
    const markMessagesAsRead = async () => {
      try {
        const messagesRef = collection(db, "chats", chatId, "messages");
        const unreadQuery = query(messagesRef, where('read', '==', false));
        const snapshot = await getDocs(unreadQuery);

        const messagesToUpdate = snapshot.docs.filter(
          doc => doc.data().user?._id !== currentUser.uid
        );

        const updatePromises = messagesToUpdate.map(doc => 
          updateDoc(doc.ref, { read: true })
        );

        await Promise.all(updatePromises);
        if (updatePromises.length > 0)
          console.log(`✅ Marked ${updatePromises.length} messages as read (on open)`);
      } catch (error) {
        console.log('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [chatId, currentUser.uid]);

  // --- 2️⃣ REAL-TIME MARK AS READ FOR NEW MESSAGES WHILE OPEN ---
  useEffect(() => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, where("read", "==", false));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newUnreadFromNutritionist = snapshot.docs.filter(
        doc => doc.data().user?._id !== currentUser.uid
      );

      if (newUnreadFromNutritionist.length > 0) {
        const updatePromises = newUnreadFromNutritionist.map(doc => 
          updateDoc(doc.ref, { read: true })
        );
        await Promise.all(updatePromises);
        console.log(`✅ Realtime: marked ${updatePromises.length} new messages as read`);
      }
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);
  // --- END REALTIME READ LOGIC ---

  // --- ENSURE CHAT DOCUMENT ---
  const ensureChatDocument = async (messageText) => {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      // Fetch nutritionist name if not provided or is undefined
      let nutritionistNameToUse = nutritionistName;
      if (!nutritionistNameToUse || nutritionistNameToUse === undefined) {
        try {
          const nutritionistDoc = await getDoc(doc(db, "nutritionist", nutritionistId));
          if (nutritionistDoc.exists()) {
            nutritionistNameToUse = nutritionistDoc.data().name || 'Nutritionist';
          } else {
            // Fallback to nutritionist_info collection
            const nutritionistInfoDoc = await getDoc(doc(db, "nutritionist_info", nutritionistId));
            if (nutritionistInfoDoc.exists()) {
              nutritionistNameToUse = nutritionistInfoDoc.data().name || 'Nutritionist';
            } else {
              nutritionistNameToUse = 'Nutritionist'; // Final fallback
            }
          }
        } catch (fetchError) {
          console.warn('Could not fetch nutritionist name:', fetchError);
          nutritionistNameToUse = 'Nutritionist'; // Fallback if fetch fails
        }
      }

      const chatData = {
        participants: [currentUser.uid, nutritionistId],
        participantNames: {
          [currentUser.uid]: userName,
          [nutritionistId]: nutritionistNameToUse,
        },
        expertType: "nutritionist",
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

  // --- SEND MESSAGE ---
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
  }, [chatId, currentUser, userName, nutritionistId, nutritionistName]);

  const handleMakeAppointment = () => {
    setShowOptionsModal(false);
    setShowAppointmentModal(true);
    const now = new Date();
    setSelectedDate(now);
    setSelectedTime(now);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleConfirmAppointment = async () => {
    try {
      // Validate required parameters
      if (!nutritionistId) {
        Alert.alert("Error", "Nutritionist information is missing. Please try again.");
        return;
      }

      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(selectedTime.getHours());
      appointmentDateTime.setMinutes(selectedTime.getMinutes());
      appointmentDateTime.setSeconds(0);
      appointmentDateTime.setMilliseconds(0);

      console.log('📅 Selected Date:', selectedDate);
      console.log('🕐 Selected Time:', selectedTime);
      console.log('✅ Combined DateTime:', appointmentDateTime);

      if (appointmentDateTime < new Date()) {
        Alert.alert("Invalid Date", "Please select a future date and time.");
        return;
      }

      // Fetch user name for appointment
      const userDocRef = doc(db, "user", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const nameFromDB =
        userDocSnap.exists() && userDocSnap.data().name
          ? userDocSnap.data().name
          : userName;

      const appointmentData = {
        userId: currentUser.uid,
        userName: nameFromDB || "User",
        expertId: nutritionistId,
        expertName: nutritionistName || "Nutritionist",
        appointmentDate: appointmentDateTime.toISOString(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Debug logging
      console.log("Creating appointment with data:", appointmentData);

      const response = await API.post("/appointments/nutritionist", appointmentData);

      const appointmentId = response.data.appointmentId;
      console.log("Created appointment with ID:", appointmentId);

      setShowAppointmentModal(false);
      setShowDatePicker(false);
      setShowTimePicker(false);

      const dateStr = appointmentDateTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = appointmentDateTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const appointmentMessage = `📅 Appointment Request\n\nDate: ${dateStr}\nTime: ${timeStr}\n\nI would like to schedule an appointment with you. Please confirm your availability.`;

      await ensureChatDocument(appointmentMessage);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: Math.random().toString(36).substring(7),
        text: appointmentMessage,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: nameFromDB,
        },
        appointmentId: appointmentId,
        appointmentType: "nutritionist",
        read: false,
      });

      Alert.alert("Success", "Appointment request sent successfully!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error creating appointment:", error);
      Alert.alert("Error", "Failed to create appointment. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleRequestDietPlan = () => {
    setShowOptionsModal(false);
    setShowDietPlanModal(true);
  };

  const handleDietPlanRequest = async (duration) => {
    setShowDietPlanModal(false);
    
    try {
      // Validate required parameters
      if (!nutritionistId) {
        Alert.alert("Error", "Nutritionist information is missing. Please try again.");
        return;
      }

      // Fetch user name for meal plan request
      const userDocRef = doc(db, "user", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const nameFromDB =
        userDocSnap.exists() && userDocSnap.data().name
          ? userDocSnap.data().name
          : userName;

      const mealPlanData = {
        userId: currentUser.uid,
        userName: nameFromDB || "User",
        expertId: nutritionistId,
        expertName: nutritionistName || "Nutritionist",
        duration: duration,
        requestMessage: `I would like to request a ${duration} meal plan. Please help me create a personalized plan.`,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Debug logging
      console.log("Creating meal plan with data:", mealPlanData);

      const response = await API.post("/meal-plans/nutritionist", mealPlanData);
      const mealPlanId = response.data.mealPlanId;
      console.log("Created meal plan request with ID:", mealPlanId);

      const mealPlanMessage = `🥗 Meal Plan Request\n\nDuration: ${duration}\n\nI would like to request a ${duration} meal plan. Please help me create a personalized plan.`;

      await ensureChatDocument(mealPlanMessage);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: Math.random().toString(36).substring(7),
        text: mealPlanMessage,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: nameFromDB,
        },
        mealPlanId: mealPlanId,
        mealPlanType: "nutritionist",
        read: false,
      });

      Alert.alert("Success", "Meal plan request sent successfully!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error creating meal plan request:", error);
      Alert.alert("Error", "Failed to create meal plan request. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      console.log('📅 Date selected:', date);
    }
  };

  const onTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (time) {
      setSelectedTime(time);
      console.log('🕐 Time selected:', time);
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
          {item.messageType === 'mealPlan' && item.mealPlanDetails && (
            <TouchableOpacity
              style={styles.viewPlanButton}
              onPress={() => navigation.navigate('MealPlanDetails', {
                mealPlanDetails: item.mealPlanDetails,
              })}
              activeOpacity={0.8}
            >
              <Text style={styles.viewPlanButtonText}>View Meal Plan</Text>
            </TouchableOpacity>
          )}
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
          onPress={() => setShowOptionsModal(true)}
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
         
          <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7} onPress={() => navigation.navigate("NutritionistProfile", { nutritionistId, nutritionistName })}>
            <View style={styles.avatarContainer}>
              <Ionicons name="nutrition" size={24} color="#5B9FED" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{nutritionistName || 'Nutritionist'}</Text>
              <Text style={styles.headerRole}>Nutritionist</Text>
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

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModal}>
            <View style={styles.modalHandle} />
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={handleMakeAppointment}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>📅</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Make Appointment</Text>
                <Text style={styles.optionSubtext}>Schedule a session</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={handleRequestDietPlan}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>🥗</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Request Diet Plan</Text>
                <Text style={styles.optionSubtext}>Get personalized nutrition</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowOptionsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Appointment Date/Time Picker Modal */}
      <Modal
        visible={showAppointmentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAppointmentModal(false);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appointmentModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Schedule Appointment</Text>
            
            <ScrollView 
              style={styles.appointmentContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Date Selection */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>📅 Select Date</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setShowTimePicker(false);
                    setShowDatePicker(!showDatePicker);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateTimeButtonText}>
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.dateTimeButtonIcon}>›</Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>
                )}
              </View>

              {/* Time Selection */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>🕐 Select Time</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(!showTimePicker);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateTimeButtonText}>
                    {selectedTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <Text style={styles.dateTimeButtonIcon}>›</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.appointmentActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setShowAppointmentModal(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmActionButton]}
                onPress={handleConfirmAppointment}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmActionText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Diet Plan Duration Modal */}
      <Modal
        visible={showDietPlanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDietPlanModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDietPlanModal(false)}
        >
          <View style={styles.mealPlanModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Diet Plan Duration</Text>

            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => handleDietPlanRequest('1 day')}
              activeOpacity={0.7}
            >
              <Text style={styles.durationIcon}>📆</Text>
              <Text style={styles.durationText}>1 Day Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => handleDietPlanRequest('1 week')}
              activeOpacity={0.7}
            >
              <Text style={styles.durationIcon}>📅</Text>
              <Text style={styles.durationText}>1 Week Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowDietPlanModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  viewPlanButton: {
    marginTop: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  viewPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  optionsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
  },
  cancelButton: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  appointmentModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    paddingBottom: 20,
  },
  appointmentContent: {
    paddingHorizontal: 20,
  },
  pickerSection: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dateTimeButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  dateTimeButtonIcon: {
    fontSize: 24,
    color: '#8E8E93',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  appointmentActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 34,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelActionButton: {
    backgroundColor: '#F8F9FA',
  },
  confirmActionButton: {
    backgroundColor: '#007AFF',
  },
  cancelActionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmActionText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  mealPlanModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  durationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    gap: 8,
  },
  durationIcon: {
    fontSize: 20,
  },
  durationText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
});