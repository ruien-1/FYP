import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth, db } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import API from "../../api/backend";

export default function ExpertTab() {
  const navigation = useNavigation();
  const currentUser = auth.currentUser;
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      fetchUpcomingAppointments();
      setupUnreadListener();
    }, [])
  );

  useEffect(() => {
    fetchUpcomingAppointments();
    setupUnreadListener();
  }, []);

  // Listen for unread messages in real-time
const setupUnreadListener = () => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unsubscribers = [];
      const chatUnreadCounts = {};

      snapshot.forEach((chatDoc) => {
        const chatId = chatDoc.id;

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const unreadQuery = query(
          messagesRef,
          where('read', '==', false)
        );

        const messageUnsubscribe = onSnapshot(unreadQuery, (msgSnapshot) => {
          const unreadInChat = msgSnapshot.docs.filter(
            doc => doc.data().user?._id !== currentUser.uid
          ).length;
          
          chatUnreadCounts[chatId] = unreadInChat;
          
          const totalUnread = Object.values(chatUnreadCounts).reduce((sum, count) => sum + count, 0);
          setUnreadCount(totalUnread);
        });

        unsubscribers.push(messageUnsubscribe);
      });
    });

    return unsubscribe;
  } catch (error) {
    console.log('Error setting up unread listener:', error);
  }
};

  const fetchUpcomingAppointments = async () => {
    try {
      setRefreshing(true);
      const response = await API.get(`/appointments/all/${currentUser.uid}`);

      const appointmentsData = response?.data?.data || response?.data || [];

      console.log("📋 All appointments fetched:", appointmentsData);

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const upcoming = appointmentsData
        .filter((apt) => {
          const aptDate = new Date(apt.appointmentDate);
          const isConfirmed = apt.status === "confirmed";
          const isRecentOrFuture = aptDate > oneHourAgo;

          console.log("Filtering appointment:", {
            date: apt.appointmentDate,
            status: apt.status,
            isConfirmed,
            isRecentOrFuture,
            included: isRecentOrFuture && isConfirmed,
          });

          return isRecentOrFuture && isConfirmed;
        })
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
        .slice(0, 5);

      console.log("✅ Filtered upcoming appointments:", upcoming);
      setUpcomingAppointments(upcoming);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleCancel = (appointment) => {
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment with ${
        appointment.coachName || appointment.nutritionistName
      }?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const endpoint =
                appointment.type === "coach"
                  ? `/appointments/coach/${appointment.id}`
                  : `/appointments/nutritionist/${appointment.id}`;

              await API.delete(endpoint);

              const expertId =
                appointment.coachId || appointment.nutritionistId;
              const chatId =
                currentUser.uid > expertId
                  ? `${currentUser.uid}_${expertId}`
                  : `${expertId}_${currentUser.uid}`;

              const appointmentDate = new Date(appointment.appointmentDate);
              const cancelMessage = `❌ Appointment Cancelled\n\nI have cancelled the appointment scheduled for ${appointmentDate.toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              )} at ${appointmentDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}.`;

              await addDoc(collection(db, "chats", chatId, "messages"), {
                _id: Math.random().toString(36).substring(7),
                text: cancelMessage,
                createdAt: serverTimestamp(),
                user: {
                  _id: currentUser.uid,
                  name: currentUser.displayName || "User",
                },
                appointmentId: appointment.id,
                isCancellation: true,
                read: false, // ADD THIS LINE
              });

              Alert.alert("Success", "Appointment cancelled successfully");
              fetchUpcomingAppointments();
            } catch (error) {
              console.error("Error cancelling appointment:", error);
              Alert.alert(
                "Error",
                "Failed to cancel appointment. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setNewDate(new Date(appointment.appointmentDate));
    setNewTime(new Date(appointment.appointmentDate));
    setRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    try {
      const appointmentDateTime = new Date(newDate);
      appointmentDateTime.setHours(newTime.getHours());
      appointmentDateTime.setMinutes(newTime.getMinutes());
      appointmentDateTime.setSeconds(0);
      appointmentDateTime.setMilliseconds(0);

      if (appointmentDateTime < new Date()) {
        Alert.alert("Invalid Date", "Please select a future date and time.");
        return;
      }

      const endpoint =
        selectedAppointment.type === "coach"
          ? `/appointments/coach/${selectedAppointment.id}`
          : `/appointments/nutritionist/${selectedAppointment.id}`;

      await API.put(endpoint, {
        appointmentDate: appointmentDateTime.toISOString(),
        status: "pending",
      });

      const expertId =
        selectedAppointment.coachId || selectedAppointment.nutritionistId;
      const chatId =
        currentUser.uid > expertId
          ? `${currentUser.uid}_${expertId}`
          : `${expertId}_${currentUser.uid}`;

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

      const rescheduleMessage = `🔄 Appointment Rescheduled\n\nNew Date: ${dateStr}\nNew Time: ${timeStr}\n\nI would like to reschedule our appointment to this new time. Please confirm your availability.`;

      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: Math.random().toString(36).substring(7),
        text: rescheduleMessage,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || "User",
        },
        appointmentId: selectedAppointment.id,
        isReschedule: true,
        read: false, // ADD THIS LINE
      });

      setRescheduleModal(false);
      Alert.alert("Success", "Appointment rescheduled successfully");
      fetchUpcomingAppointments();
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      Alert.alert("Error", "Failed to reschedule appointment. Please try again.");
    }
  };

  const getExpertInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  const renderAppointmentCard = (appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const expertName = appointment.coachName || appointment.nutritionistName;
    const expertType =
      appointment.type === "coach" ? "Coach" : "Nutritionist";

    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.dateIconContainer}>
            <Text style={styles.calendarIcon}>📅</Text>
            <View style={styles.dateInfoContainer}>
              <Text style={styles.appointmentDate}>
                {appointmentDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {appointmentDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(appointment)}
          >
            <Text style={styles.cancelIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.appointmentBody}>
          <View style={styles.coachAvatarCircle}>
            <Text style={styles.coachAvatarText}>
              {getExpertInitial(expertName)}
            </Text>
          </View>
          <View style={styles.appointmentDetails}>
            <Text style={styles.coachName}>{expertName}</Text>
            <Text style={styles.appointmentType}>
              {expertType} Consultation
            </Text>
          </View>
          <TouchableOpacity
            style={styles.rescheduleButton}
            onPress={() => handleReschedule(appointment)}
          >
            <Text style={styles.rescheduleText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchUpcomingAppointments}
            tintColor="#007AFF"
          />
        }
      >
        {/* Header with Chat Button */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Expert</Text>
          <TouchableOpacity
            style={styles.chatButtonContainer}
            onPress={() => navigation.navigate("ChatList")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={26}
              color="#007AFF"
            />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Get Expert Advice Section */}
        <View style={styles.expertAdviceSection}>
          <Text style={styles.sectionTitle}>Get Expert Advice</Text>
          <View style={styles.expertRow}>
            <TouchableOpacity
              style={styles.expertCard}
              onPress={() => navigation.navigate("FindCoach")}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🏋️‍♂️</Text>
              </View>
              <Text style={styles.expertCardText}>
                Connect with certified
              </Text>
              <Text style={styles.expertCardText}>
                coach for advice and
              </Text>
              <Text style={styles.expertCardText}>workout plans</Text>
              <View style={styles.findButton}>
                <Text style={styles.findButtonText}>Find Coach</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.expertCard}
              onPress={() => navigation.navigate("FindNutritionist")}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🥗</Text>
              </View>
              <Text style={styles.expertCardText}>
                Connect with certified
              </Text>
              <Text style={styles.expertCardText}>
                nutritionists for meal
              </Text>
              <Text style={styles.expertCardText}>plans and advice</Text>
              <View style={styles.findButton}>
                <Text style={styles.findButtonText}>Find Nutritionist</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Appointments Section */}
        <View style={styles.appointmentsSection}>
          <View style={styles.appointmentsSectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : upcomingAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>
                No upcoming appointments
              </Text>
              <Text style={styles.emptySubText}>
                Book an appointment with a coach or nutritionist
              </Text>
            </View>
          ) : (
            upcomingAppointments.map((appointment) =>
              renderAppointmentCard(appointment)
            )
          )}
        </View>
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rescheduleModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>

            <ScrollView
              style={{ maxHeight: '70%' }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                    {newDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.dateTimeButtonIcon}>›</Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={newDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') setShowDatePicker(false);
                        if (date) setNewDate(date);
                      }}
                      minimumDate={new Date()}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>
                )}
              </View>

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
                    {newTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.dateTimeButtonIcon}>›</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={newTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, time) => {
                        if (Platform.OS === 'android') setShowTimePicker(false);
                        if (time) setNewTime(time);
                      }}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setRescheduleModal(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmReschedule}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F0FF" },
  container: { flex: 1, padding: 16 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatButtonContainer: {
    position: 'relative',
    padding: 6,
  },
  badgeContainer: {
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
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginVertical: 10,
  },
  expertAdviceSection: {
    marginBottom: 20,
  },
  expertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  expertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E8F0FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#D0E3FF",
  },
  iconEmoji: {
    fontSize: 35,
  },
  expertCardText: {
    fontSize: 11,
    textAlign: "center",
    color: "#333",
    lineHeight: 16,
  },
findButton: {
  backgroundColor: "#7BA3FF",
  paddingHorizontal: 16,  // Changed from 20 to 16
  paddingVertical: 10,
  borderRadius: 20,
  marginTop: 12,
  minWidth: 120,  // Add this line to ensure minimum width
},
  findButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
    textAlign: 'center',
  },
  appointmentsSection: {
    marginBottom: 20,
  },
  appointmentsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  appointmentCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dateIconContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  dateInfoContainer: {
    flex: 1,
    marginLeft: 4,
  },
  calendarIcon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  appointmentDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    flexWrap: 'wrap',
    flexShrink: 1,
    marginBottom: 4,
  },
  cancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelIcon: {
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "bold",
  },
  appointmentBody: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F9FF",
    padding: 12,
    borderRadius: 12,
  },
  coachAvatarCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#D0E3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  coachAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  appointmentDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  appointmentType: {
    fontSize: 12,
    color: "#666",
  },
  rescheduleButton: {
    backgroundColor: "#7BA3FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  rescheduleText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  rescheduleModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F8F9FA',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});