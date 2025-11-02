import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

// MET values for activity categories
const ACTIVITY_CATEGORIES = {
  sedentary: { label: "Sedentary", met: 1.5 },
  light: { label: "Light", met: 3.0 },
  moderate: { label: "Moderate", met: 5.0 },
  vigorous: { label: "Vigorous", met: 8.0 },
  very_vigorous: { label: "Very Vigorous", met: 12.0 },
};

export default function CustomActivityModal({
  visible,
  onClose,
  modalType,
  setModalType,
  myActivities = [],
  setMyActivities,
  selectedActivity,
  setSelectedActivity,
  uid,
  selectedDate,
}) {
  const [form, setForm] = useState({
    name: "",
    duration: "",
    calories: "",
    category: "moderate",
  });

  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [estimatedCalories, setEstimatedCalories] = useState(null);

  // Fetch user info when modal opens
  useEffect(() => {
    if (visible && uid) {
      fetchUserInfo(uid);
    }
  }, [visible, uid]);

  // Fetch activities when modal opens in list mode
  useEffect(() => {
    const fetchActivities = async () => {
      if (visible && modalType === "list" && uid) {
        try {
          const res = await API.get(`/CustomActivity/${uid}`);
          setMyActivities(res.data || []);
        } catch (err) {
          console.error("❌ Error fetching activities:", err);
          setMyActivities([]);
          showError("Failed to fetch activities.");
        }
      }
    };
    fetchActivities();
  }, [visible, modalType, uid]);

  // Calculate estimated calories when form changes
  useEffect(() => {
    if (modalType === "add" || modalType === "edit") {
      calculateEstimatedCalories();
    }
  }, [form.duration, form.category, userInfo, modalType]);

  const fetchUserInfo = async (uid) => {
    try {
      console.log("🔍 Fetching user info for UID:", uid);
      const res = await API.get(`/user_info/${uid}`);
      console.log("✅ User info fetched successfully:", res.data);
      setUserInfo(res.data);
    } catch (err) {
      console.error("❌ Error fetching user info:", err);
    }
  };

  const calculateEstimatedCalories = () => {
    if (!userInfo || !form.duration || !form.category) {
      setEstimatedCalories(null);
      return;
    }

    const dur = parseFloat(form.duration);
    if (isNaN(dur) || dur <= 0) {
      setEstimatedCalories(null);
      return;
    }

    const { weight, height, age, gender } = userInfo;
    
    // Calculate BMR
    let bmr = gender.toLowerCase() === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

    const bmrPerHour = bmr / 24;
    const met = ACTIVITY_CATEGORIES[form.category].met;
    const calBurned = bmrPerHour * met * (dur / 60);

    setEstimatedCalories(Math.round(calBurned));
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 2000);
  };
  
  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 2000);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Add
const handleSave = async () => {
  if (!form.name.trim()) return showError("Activity name is required.");
  if (!form.duration.trim()) return showError("Duration is required.");

  const cleanedForm = {
    ...form,
    calories:
      form.calories.trim() === ""
        ? estimatedCalories || 0
        : parseFloat(form.calories),
  };

  try {
    const res = await API.post(`/CustomActivity/${uid}`, cleanedForm);
    setMyActivities((prev) => [...prev, res.data.entry]);
    showSuccess("Activity added successfully!");
    resetForm();
  } catch (err) {
    console.error("Add activity error:", err);
    showError("Failed to add activity.");
  }
};

// Update
const handleUpdate = async () => {
  if (!form.name.trim()) return showError("Activity name is required.");

  const cleanedForm = {
    ...form,
    calories:
      form.calories.trim() === ""
        ? estimatedCalories || 0
        : parseFloat(form.calories),
  };

  try {
    await API.put(`/CustomActivity/${uid}/${selectedActivity.id}`, cleanedForm);
    setMyActivities((prev) =>
      prev.map((a) =>
        a.id === selectedActivity.id ? { ...a, ...cleanedForm } : a
      )
    );
    showSuccess("Activity updated successfully!");
    setModalType("list");
  } catch (err) {
    console.error("Update activity error:", err);
    showError("Failed to update activity.");
  }
};


  // Delete
  const handleDelete = async (entryId) => {
    try {
      await API.delete(`/CustomActivity/${uid}/${entryId}`);
      setMyActivities((prev) => prev.filter((a) => a.id !== entryId));
      showSuccess("Activity deleted successfully!");
    } catch (err) {
      console.error("Delete activity error:", err);
      showError("Failed to delete activity.");
    }
  };

  // Log
  const LogToDiary = async (activity) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      const activityLog = {
        name: activity.name,
        duration: Number(activity.duration) || 0,
        calories: Number(activity.calories) || 0,
        date: selectedDate || new Date().toISOString().split("T")[0],
        activityId: activity.id,
      };

      const postRes = await API.post(`/activity_log/${uid}`, activityLog);

      if (postRes.data.success) {
        showSuccess(`"${activity.name}" logged to activity log!`);
      }
    } catch (err) {
      console.error("Error logging activity:", err);
      showError("Failed to log activity.");
    }
  };

  const resetForm = () => {
    setForm({ name: "", duration: "", calories: "", category: "moderate" });
    setEstimatedCalories(null);
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>

            {/* Messages - Now positioned absolutely */}
            {successMessage ? (
              <View style={styles.messageOverlay}>
                <View style={styles.successMsg}>
                  <Text style={styles.messageText}>{successMessage}</Text>
                </View>
              </View>
            ) : null}
            {errorMessage ? (
              <View style={styles.messageOverlay}>
                <View style={styles.errorMsg}>
                  <Text style={styles.messageText}>{errorMessage}</Text>
                </View>
              </View>
            ) : null}

            {/* Add */}
            {modalType === "add" && (
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={[styles.modalContent, { flex: 1 }]}>
                  <Text style={styles.modalTitle}>Add Activity</Text>

                  <Text style={styles.label}>Activity Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={(t) => handleChange("name", t)}
                  />

                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={form.duration}
                    onChangeText={(t) => handleChange("duration", t)}
                  />

                  <Text style={styles.label}>Activity Category</Text>
                  <View style={styles.categoryContainer}>
                    {Object.entries(ACTIVITY_CATEGORIES).map(([key, val]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categoryButton,
                          form.category === key && styles.categorySelected,
                        ]}
                        onPress={() => handleChange("category", key)}
                      >
                        <Text
                          style={{
                            color: form.category === key ? "#fff" : "#333",
                            fontWeight: "600",
                            fontSize: 12,
                          }}
                        >
                          {val.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Calories (kcal)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={form.calories}
                    onChangeText={(t) => handleChange("calories", t)}
                    placeholder={estimatedCalories ? String(estimatedCalories) : ""}
                  />

                  {estimatedCalories !== null && (
                    <Text style={styles.estimatedText}>
                      Estimated: {estimatedCalories} kcal
                    </Text>
                  )}

                  <View style={{ marginTop: "auto" }}>
                    <TouchableOpacity style={styles.modalButton} onPress={handleSave}>
                      <Text style={{ fontWeight: "600" }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}

            {/* List */}
            {modalType === "list" && (
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>My Activities</Text>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    placeholderTextColor="#888"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                {myActivities.length === 0 ? (
                  <Text style={{ textAlign: "center", marginTop: 20 }}>
                    No activities found
                  </Text>
                ) : (
                  <FlatList
                    data={myActivities.filter((a) =>
                      a.name?.toLowerCase().includes(search.toLowerCase())
                    )}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                      <View style={styles.listRow}>
                        <Text style={styles.index}>{index + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityName}>{item.name}</Text>
                          <Text style={styles.detail}>
                            {item.duration} min • {item.calories} kcal
                          </Text>
                        </View>

                        {/* Log */}
                        <TouchableOpacity
                          style={styles.logBtn}
                          onPress={() => LogToDiary(item)}
                        >
                          <Text style={{ color: "black", fontSize: 14, fontWeight: "600" }}>
                            Log
                          </Text>
                        </TouchableOpacity>

                        {/* Edit */}
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => {
                            setSelectedActivity(item);
                            setForm({
                              name: item.name,
                              duration: item.duration,
                              calories: item.calories,
                              category: item.category || "moderate",
                            });
                            setModalType("edit");
                          }}
                        >
                          <Text style={{ fontWeight: "600" }}>Edit</Text>
                        </TouchableOpacity>

                        {/* Delete */}
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(item.id)}
                        >
                          <Ionicons name="trash" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>
            )}

            {/* Edit */}
            {modalType === "edit" && selectedActivity && (
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={[styles.modalContent, { flex: 1 }]}>
                  <Text style={styles.modalTitle}>Edit Activity</Text>

                  <Text style={styles.label}>Activity Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={(t) => handleChange("name", t)}
                  />

                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={form.duration}
                    onChangeText={(t) => handleChange("duration", t)}
                  />

                  <Text style={styles.label}>Activity Category</Text>
                  <View style={styles.categoryContainer}>
                    {Object.entries(ACTIVITY_CATEGORIES).map(([key, val]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categoryButton,
                          form.category === key && styles.categorySelected,
                        ]}
                        onPress={() => handleChange("category", key)}
                      >
                        <Text
                          style={{
                            color: form.category === key ? "#fff" : "#333",
                            fontWeight: "600",
                            fontSize: 12,
                          }}
                        >
                          {val.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Calories (kcal)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={form.calories}
                    onChangeText={(t) => handleChange("calories", t)}
                    placeholder={estimatedCalories ? String(estimatedCalories) : ""}
                  />

                  {estimatedCalories !== null && (
                    <Text style={styles.estimatedText}>
                      Estimated: {estimatedCalories} kcal
                    </Text>
                  )}

                  <View style={{ marginTop: "auto" }}>
                    <TouchableOpacity style={styles.modalButton} onPress={handleUpdate}>
                      <Text style={{ fontWeight: "600" }}>Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, { marginTop: 10 }]}
                      onPress={() => {
                        resetForm();
                        setModalType("list");
                      }}
                    >
                      <Text style={{ fontWeight: "600" }}>Back</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    height: "70%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  closeBtn: {
    alignSelf: "flex-end",
  },
  modalTitle: {
    fontSize: 25,
    fontWeight: "700",
    marginBottom: 15,
  },
  modalContent: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#4A90E2",
    borderRadius: 8,
    alignItems: "center",
  },
  categorySelected: {
    backgroundColor: "#4A90E2",
  },
  estimatedText: {
    marginTop: -5,
    marginBottom: 10,
    color: "#555",
    fontStyle: "italic",
    fontSize: 13,
  },
  modalButton: {
    backgroundColor: "#E8F2FF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  index: {
    fontWeight: "bold",
    marginRight: 6,
  },
  activityName: {
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    fontSize: 13,
    color: "#555",
  },
  editBtn: {
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  deleteBtn: {
    backgroundColor: "red",
    padding: 6,
    borderRadius: 6,
  },
  logBtn: {
    backgroundColor: "#E8F2FF",
    padding: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  // Fixed message styles - now with absolute positioning
  messageOverlay: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: "center",
  },
  successMsg: {
    backgroundColor: "#d4edda",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  errorMsg: {
    backgroundColor: "#f8d7da",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  messageText: {
    color: "#155724",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: "#000",
  },
});