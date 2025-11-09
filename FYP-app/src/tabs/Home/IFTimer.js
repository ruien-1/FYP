// IFTimer.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TimerContext } from "./TimerContext";
import API from "../../api/backend";
import { getAuth } from "firebase/auth";
import DateTimePickerModal from "react-native-modal-datetime-picker"; // 👈 new import

export default function IFTimer() {
  const {
    scheduleFasting,
    activePlan,
    setActivePlan,
    customPlans,
    setCustomPlans,
    stopFasting,
  } = useContext(TimerContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [newStart, setNewStart] = useState(new Date());
  const [newHours, setNewHours] = useState(16);

  const [isTimePickerVisible, setTimePickerVisible] = useState(false); // 👈 modal time picker
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when activePlan changes

  // 🔄 Load custom plans from Firestore on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;

        const res = await API.get(`/CustomIFPlan/${uid}/customPlans`);

        // ✅ normalize start & end into Date objects
        const normalized = (res.data || []).map((p) => ({
          ...p,
          start: p.start ? new Date(p.start) : null,
          end: p.end ? new Date(p.end) : null,
        }));

        setCustomPlans(normalized);
      } catch (err) {
        console.error("❌ Failed to fetch custom plans:", err);
      }
    };
    fetchPlans();
  }, []);

  // Force re-render when activePlan changes to ensure toggle updates
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [activePlan]);

  const handleToggle = (plan) => {
    // Check if this plan is currently active
    // For custom plans, check by id. For fixed plans, check by fasting hours and isCustom flag
    const isSamePlan = activePlan && (
      plan.isCustom 
        ? (activePlan.isCustom && activePlan.id === plan.id)
        : (!activePlan.isCustom && activePlan.fasting === plan.fasting)
    );

    if (isSamePlan) {
      // Timer is active for this plan, so stop it
      stopFasting();
    } else {
      if (!plan.isCustom) {
        // Fixed plan - start immediately
        // Pass the plan data so activePlan can be properly set with all properties
        scheduleFasting(new Date(), plan.fasting, false, { ...plan, isCustom: false });
      } else {
        // Custom plan - check if start time has passed
        const now = new Date();
        if (now >= plan.start) {
          Alert.alert(
            "Choose Start Time",
            `You planned to start fasting at ${plan.start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}. Do you want to start from then or from now?`,
            [
              {
                text: "From Planned Time",
                onPress: () => {
                  // Schedule with planned time and pass plan data to preserve id
                  scheduleFasting(plan.start, plan.fasting, true, { ...plan, isCustom: true });
                },
              },
              {
                text: "From Now",
                onPress: () => {
                  // Schedule with current time but keep plan id and other properties
                  // Important: preserve the plan.id so toggle can recognize it
                  scheduleFasting(now, plan.fasting, true, { ...plan, start: now, isCustom: true });
                },
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        } else {
          // Start time hasn't arrived yet, use planned time
          scheduleFasting(plan.start, plan.fasting, true, { ...plan, isCustom: true });
        }
      }
    }
  };

  const handleAddCustomPlan = async () => {
    const eating = 24 - newHours;
    const cleanStartTime = new Date(newStart);
    cleanStartTime.setSeconds(0, 0);

    const newPlan = {
      id: Date.now(),
      fasting: newHours,
      eating,
      start: cleanStartTime,
      isCustom: true,
    };

    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      const res = await API.post(`/CustomIFPlan/${uid}/customPlans`, newPlan);
      if (res.data.success) {
        setCustomPlans([...customPlans, newPlan]);
      }
      setModalVisible(false);
    } catch (err) {
      console.error("❌ Failed to save custom plan:", err);
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      await API.delete(`/CustomIFPlan/${uid}/customPlans/${planId}`);
      setCustomPlans(customPlans.filter((p) => p.id !== planId));
    } catch (err) {
      console.error("❌ Failed to delete plan:", err);
    }
  };

  const fixedPlans = [
    { fasting: 16, eating: 8 },
    { fasting: 14, eating: 10 },
    { fasting: 18, eating: 6 },
  ];

  // Time picker handlers
  const showTimePicker = () => setTimePickerVisible(true);
  const hideTimePicker = () => setTimePickerVisible(false);
  const handleConfirm = (date) => {
    setNewStart(date);
    hideTimePicker();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>IF Timer</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
        >
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 20 }} />

      {/* Fixed plans */}
      {fixedPlans.map((plan) => (
        <View style={styles.row} key={`fixed-${plan.fasting}`}>
          <Text style={styles.plan}>
            {plan.fasting}/{plan.eating}
          </Text>
          <Switch
            value={
              !!(activePlan && !activePlan.isCustom && activePlan.fasting === plan.fasting)
            }
            onValueChange={() => handleToggle(plan)}
          />
        </View>
      ))}

      {/* Custom plans */}
      {customPlans.map((plan) => (
        <View style={styles.row} key={`custom-${plan.id}`}>
          <View>
            <Text style={styles.plan}>
              {plan.fasting}/{plan.eating}
            </Text>
            {plan.start && (
              <Text style={styles.startNote}>
                Fasting starts at{" "}
                {plan.start.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Switch
              value={
                !!(activePlan && activePlan.isCustom && activePlan.id !== undefined && plan.id !== undefined && String(activePlan.id) === String(plan.id))
              }
              onValueChange={() => handleToggle(plan)}
            />
            <TouchableOpacity
              onPress={() => handleDeletePlan(plan.id)}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ color: "red", fontWeight: "bold" }}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Add Custom Plan Modal */}
      <Modal visible={modalVisible} animationType="fade">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.headerBtn}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>IF Timer</Text>
            <TouchableOpacity
              onPress={handleAddCustomPlan}
              style={styles.headerBtn}
            >
              <Text style={styles.save}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Time Picker */}
          <View style={styles.pickerWrapper}>
            <TouchableOpacity onPress={showTimePicker}>
              <Text style={{ fontSize: 18, color: "#154360" }}>
                Start Time:{" "}
                {newStart.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={isTimePickerVisible}
            mode="time"
            date={newStart || new Date()}
            onConfirm={handleConfirm}
            onCancel={hideTimePicker}
            display="spinner"
            is24Hour={false}
            minuteInterval={1}
            themeVariant="light"
          />

          {/* Fasting Hour Selector */}
          <View style={styles.fastingBox}>
            <Text style={styles.subText}>Fasting Hours</Text>
            <View style={styles.fastingRow}>
              {[14, 15, 16, 17, 18, 19, 20].map((hour) => (
                <TouchableOpacity
                  key={hour}
                  onPress={() => setNewHours(hour)}
                  style={[
                    styles.fastingBtn,
                    newHours === hour && styles.fastingBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fastingText,
                      newHours === hour && styles.fastingTextActive,
                    ]}
                  >
                    {hour}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subText}>Eating window</Text>
            <Text style={styles.eating}>{24 - newHours}</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#E8F0FF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
    paddingTop: 10,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#154360" },
  addBtn: { padding: 8, marginRight: 5 },
  addText: { fontSize: 28, fontWeight: "bold", color: "#1A5276" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  plan: { fontSize: 18, fontWeight: "600", color: "#2C3E50" },
  startNote: { fontSize: 12, color: "#555", marginTop: 4 },
  modalContainer: {
    flex: 1,
    backgroundColor: "#E8F0FF",
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
    paddingTop: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#154360" },
  headerBtn: { padding: 5 },
  cancel: { fontSize: 16, color: "#E74C3C", fontWeight: "600" },
  save: { fontSize: 16, color: "#27AE60", fontWeight: "600" },
  pickerWrapper: {
    marginVertical: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fastingBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subText: { fontSize: 16, fontWeight: "600", color: "#2C3E50" },
  fastingRow: { flexDirection: "row", marginTop: 10, flexWrap: "wrap" },
  fastingBtn: {
    padding: 10,
    margin: 5,
    borderRadius: 20,
    backgroundColor: "#ECF0F1",
    minWidth: 50,
    alignItems: "center",
  },
  fastingBtnActive: { backgroundColor: "#3498DB" },
  fastingText: { fontSize: 16, color: "#2C3E50" },
  fastingTextActive: { color: "white", fontWeight: "bold" },
  eating: { fontSize: 22, fontWeight: "bold", marginTop: 10, color: "#1A5276" },
});
