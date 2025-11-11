import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth, db } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import API from "../../api/backend";

export default function CreateWorkoutPlan() {
  const navigation = useNavigation();
  const route = useRoute();
  const { workoutPlan } = route.params || {};
  const currentUser = auth.currentUser;


  // Form state
  const [title, setTitle] = useState(workoutPlan?.duration ? `${workoutPlan.duration} Workout Plan` : "");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Date selection state
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Activities state - array of day objects
  const [days, setDays] = useState([]);
  
  // Activity selection modals
  const [showActivityListModal, setShowActivityListModal] = useState(false);
  const [showActivityDetailsModal, setShowActivityDetailsModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  
  // Activity details form
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState("moderate");
  const [calories, setCalories] = useState("");
  const [estimatedCalories, setEstimatedCalories] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Generate days based on start and end date
  const generateDays = (start, end) => {
    const daysArray = [];
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);
    const endDateObj = new Date(end);
    endDateObj.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = Math.abs(endDateObj - currentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Ensure we generate exactly 7 days
    const daysToGenerate = Math.min(diffDays, 7);
    
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      const dayNumber = date.getDate();
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      const label = `${dayNumber}${getDaySuffix(dayNumber)} ${monthName} (${dayName})`;

      // Format date as YYYY-MM-DD using local date components to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      daysArray.push({
        id: i.toString(),
        date: dateString,
        label: label,
        activity: "", // Keep for backward compatibility (manual text entry)
        calories: "", // Keep for backward compatibility
        activities: [], // Array of activity objects from selection
      });
    }

    return daysArray;
  };

  // Get day suffix (1st, 2nd, 3rd, etc.)
  const getDaySuffix = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  const handleDateRangeSelect = () => {
    if (startDate >= endDate) {
      Alert.alert("Invalid Date Range", "End date must be after start date.");
      return;
    }

    const generatedDays = generateDays(startDate, endDate);
    setDays(generatedDays);
    setShowDatePickerModal(false);
    Alert.alert("Success", `Generated ${generatedDays.length} days for the workout plan.`);
  };

  // Load activities when component mounts
  useEffect(() => {
    loadActivities();
    if (workoutPlan?.userId) {
      fetchUserInfo(workoutPlan.userId);
    }
  }, []);

  // Load activities from backend
  const loadActivities = async () => {
    try {
      const res = await API.get("/activities");
      const formatted = res.data.map((a) => ({
        id: a.id,
        name: a.name,
        met: a.met,
      }));
      setActivities(formatted);
      setAllActivities(formatted);
    } catch (err) {
    }
  };

  // Fetch user info for calorie calculation
  const fetchUserInfo = async (uid) => {
    try {
      const res = await API.get(`/user_info/${uid}`);
      setUserInfo(res.data);
    } catch (err) {
    }
  };

  // Search activities
  const searchActivities = (text) => {
    setActivitySearchQuery(text);
    if (text.length > 0) {
      const filtered = allActivities.filter((a) =>
        a.name.toLowerCase().includes(text.toLowerCase())
      );
      setActivities(filtered);
    } else {
      setActivities(allActivities);
    }
  };

  // Calculate estimated calories
  useEffect(() => {
    if (showActivityDetailsModal && selectedActivity && duration && userInfo) {
      calculateEstimatedCalories();
    } else {
      setEstimatedCalories(null);
    }
  }, [duration, intensity, selectedActivity, userInfo, showActivityDetailsModal]);

  const calculateEstimatedCalories = () => {
    if (!userInfo || !duration || !selectedActivity?.met) {
      setEstimatedCalories(null);
      return;
    }

    const dur = parseFloat(duration);
    if (isNaN(dur) || dur <= 0) {
      setEstimatedCalories(null);
      return;
    }

    let intensityMultiplier = 1;
    switch (intensity) {
      case "light":
        intensityMultiplier = 0.8;
        break;
      case "moderate":
        intensityMultiplier = 1;
        break;
      case "vigorous":
        intensityMultiplier = 1.2;
        break;
    }

    const { weight, height, age, gender } = userInfo;
    const bmr =
      gender?.toLowerCase() === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const bmrPerHour = bmr / 24;
    const calBurned =
      bmrPerHour *
      selectedActivity.met *
      intensityMultiplier *
      (dur / 60);

    setEstimatedCalories(Math.round(calBurned));
  };

  // Handle opening activity list for a specific day
  const handleOpenActivityList = (dayId) => {
    setSelectedDayId(dayId);
    setActivitySearchQuery("");
    setActivities(allActivities);
    setShowActivityListModal(true);
  };

  // Handle selecting an activity from the list
  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
    setDuration("");
    setCalories("");
    setIntensity("moderate");
    setEstimatedCalories(null);
    setShowActivityListModal(false);
    setShowActivityDetailsModal(true);
  };

  // Handle saving activity to day
  const handleSaveActivity = () => {
    if (!duration || !calories) {
      Alert.alert("Missing Information", "Please fill in both Time (Minutes) and Calories.");
      return;
    }

    const activityData = {
      id: Math.random().toString(36).substring(7),
      name: selectedActivity.name,
      activityId: selectedActivity.id,
      duration: Number(duration),
      intensity: intensity,
      calories: Number(calories),
      estimatedCalories: estimatedCalories,
      met: selectedActivity.met,
    };

    // Add activity to the selected day
    setDays(days.map(day => 
      day.id === selectedDayId 
        ? { ...day, activities: [...(day.activities || []), activityData] }
        : day
    ));

    // Reset form
    setShowActivityDetailsModal(false);
    setSelectedActivity(null);
    setDuration("");
    setCalories("");
    setIntensity("moderate");
    setEstimatedCalories(null);
    
    Alert.alert("Success", "Activity added to workout plan!");
  };

  // Handle removing activity from day
  const handleRemoveActivity = (dayId, activityId) => {
    setDays(days.map(day =>
      day.id === dayId
        ? { ...day, activities: (day.activities || []).filter(a => a.id !== activityId) }
        : day
    ));
  };

  const handleDayActivityChange = (dayId, field, value) => {
    setDays(days.map(day => 
      day.id === dayId ? { ...day, [field]: value } : day
    ));
  };

  const handleSaveWorkoutPlan = async () => {
    // Validation
    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in the required fields (Title, Description).");
      return;
    }

    if (days.length === 0) {
      Alert.alert("No Activities Added", "Please add activities by selecting a date range.");
      return;
    }

    // Check if all days have at least some activity (either manual text or selected activities)
    const incompleteDays = days.filter(day => 
      !day.activity.trim() && (!day.activities || day.activities.length === 0)
    );
    if (incompleteDays.length > 0) {
      Alert.alert("Incomplete Activities", "Please add activities for all days using the Activities List button or fill in the manual Activity field.");
      return;
    }

    try {
      setLoading(true);

      // Calculate total calories (from manual entry + selected activities)
      const totalCalories = days.reduce((sum, day) => {
        const manualCalories = Number(day.calories) || 0;
        const activityCalories = (day.activities || []).reduce((acc, act) => acc + (act.calories || 0), 0);
        return sum + manualCalories + activityCalories;
      }, 0);

      // Format dates using local components to avoid timezone issues
      const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Create workout plan data
      const workoutPlanData = {
        title: title.trim(),
        description: description.trim(),
        activities: days,
        caloriesTotal: totalCalories,
        notes: notes.trim(),
        coachId: currentUser.uid,
        coachName: currentUser.displayName || "Coach",
        userId: workoutPlan.userId,
        userName: workoutPlan.userName,
        duration: workoutPlan.duration,
        startDate: formatDateLocal(startDate),
        endDate: formatDateLocal(endDate),
        createdAt: new Date().toISOString(),
      };

      // Save to database
      try {
        await API.put(`/workout-plans/coach/${workoutPlan.id}`, {
          status: "completed",
          completedAt: new Date().toISOString(),
          workoutPlanDetails: workoutPlanData
        });
      } catch (apiError) {
      }

      const message = `💪 Your ${workoutPlan.duration} Workout Plan is Ready!`;

      try {
        const userId = workoutPlan.userId;
        const chatId = currentUser.uid > userId
          ? `${currentUser.uid}_${userId}`
          : `${userId}_${currentUser.uid}`;

        await addDoc(collection(db, "chats", chatId, "messages"), {
          _id: Math.random().toString(36).substring(7),
          text: message,
          createdAt: serverTimestamp(),
          user: {
            _id: currentUser.uid,
            name: currentUser.displayName || "Coach",
          },
          messageType: 'workoutPlan',
          workoutPlanId: workoutPlan.id,
          workoutPlanDetails: workoutPlanData,
          isWorkoutPlanResponse: true,
          read: false,
        });
      } catch (e) {
      }

      Alert.alert(
        "✅ Success!",
        "Workout plan has been created and sent to the user!",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      Alert.alert("Error", "Failed to save workout plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePickerModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDatePickerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <TouchableOpacity
              onPress={() => setShowDatePickerModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Start Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setShowEndDatePicker(false);
                  setShowStartDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {startDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}
            </View>

            {/* End Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {endDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  minimumDate={startDate}
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>

            <Text style={styles.dateInfoText}>
              This will generate up to 7 days of activities between the selected dates.
            </Text>
          </ScrollView>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleDateRangeSelect}
          >
            <Text style={styles.confirmButtonText}>Generate Days</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Activity List Modal
  const renderActivityListModal = () => {
    if (!showActivityListModal) return null;

    return (
      <Modal
        visible={showActivityListModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActivityListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.activityListModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Activity</Text>
              <TouchableOpacity
                onPress={() => setShowActivityListModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search activity (e.g. running)"
                value={activitySearchQuery}
                onChangeText={searchActivities}
                placeholderTextColor="#999"
              />
              {activitySearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setActivitySearchQuery("");
                    setActivities(allActivities);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* Activity list */}
            <FlatList
              data={activities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.activityListItem}
                  onPress={() => handleSelectActivity(item)}
                >
                  <Text style={styles.activityListItemText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No activities found</Text>
              }
              style={styles.activityList}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // Activity Details Modal
  const renderActivityDetailsModal = () => {
    if (!showActivityDetailsModal || !selectedActivity) return null;

    const handleCloseModal = () => {
      setShowActivityDetailsModal(false);
      setSelectedActivity(null);
      setDuration("");
      setCalories("");
      setIntensity("moderate");
      setEstimatedCalories(null);
    };

    return (
      <Modal
        visible={showActivityDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.activityDetailsModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedActivity.name}</Text>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Time (Minutes)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                      placeholder="Enter duration in minutes"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Intensity</Text>
                    <View style={styles.intensityContainer}>
                      {["light", "moderate", "vigorous"].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.intensityButton,
                            intensity === level && styles.intensitySelected,
                          ]}
                          onPress={() => setIntensity(level)}
                        >
                          <Text
                            style={[
                              styles.intensityButtonText,
                              intensity === level && styles.intensityButtonTextSelected,
                            ]}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Estimated Calories (Cal)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={calories}
                      onChangeText={setCalories}
                      keyboardType="numeric"
                      placeholder="Enter estimated calories"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {estimatedCalories !== null && (
                    <View style={styles.estimatedCaloriesContainer}>
                      <Text style={styles.estimatedCaloriesLabel}>
                        System Estimated Calories:
                      </Text>
                      <Text style={styles.estimatedCaloriesValue}>
                        {estimatedCalories} kcal
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.saveActivityButton}
                  onPress={handleSaveActivity}
                >
                  <Text style={styles.saveActivityButtonText}>Save Activity</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.mainContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#000000ff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Workout Plan</Text>
          </View>

          {/* Workout Plan Details Container */}
          <View style={styles.sectionContainer}>
            <Text style={styles.containerTitle}>Workout Plan Details</Text>
            
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Workout Plan Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter workout plan title"
                placeholderTextColor="#999"
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Day 1: Core Day 2: Run"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

          </View>

          {/* Activities Container */}
          <View style={styles.sectionContainer}>
            <View style={styles.activitiesHeader}>
              <Text style={styles.containerTitle}>Activities</Text>
              <TouchableOpacity
                style={styles.addActivityButtonSmall}
                onPress={() => setShowDatePickerModal(true)}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.addActivityButtonSmallText}>Add Activities</Text>
              </TouchableOpacity>
            </View>

            {days.length === 0 ? (
              <Text style={styles.emptyActivitiesText}>
                No activities added yet. Tap "Add Activities" to select a date range and get started.
              </Text>
            ) : (
              days.map((day) => (
                <View key={day.id} style={styles.dayContainer}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <TouchableOpacity
                      style={styles.activitiesListButton}
                      onPress={() => handleOpenActivityList(day.id)}
                    >
                      <Ionicons name="list" size={16} color="#007AFF" />
                      <Text style={styles.activitiesListButtonText}>Activities List</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Display saved activities */}
                  {(day.activities && day.activities.length > 0) && (
                    <View style={styles.savedActivitiesContainer}>
                      {day.activities.map((activity) => (
                        <View key={activity.id} style={styles.savedActivityItem}>
                          <View style={styles.savedActivityInfo}>
                            <Text style={styles.savedActivityName}>{activity.name}</Text>
                            <Text style={styles.savedActivityDetails}>
                              {activity.duration} min • {activity.intensity} • {activity.calories} cal
                              {activity.estimatedCalories && ` (Est: ${activity.estimatedCalories} cal)`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveActivity(day.id, activity.id)}
                            style={styles.removeActivityButton}
                          >
                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <View style={styles.dayInputsContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Activity (Manual Entry)</Text>
                      <TextInput
                        style={[styles.textInput, styles.activityTextArea]}
                        placeholder="e.g. 
Core:
Situps - 4 sets of 20 reps
Russian Twist - 4 sets of 20 reps"
                        placeholderTextColor="#999"
                        value={day.activity}
                        onChangeText={(value) => handleDayActivityChange(day.id, "activity", value)}
                        multiline
                        textAlignVertical="top"
                        numberOfLines={4}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Calories (Manual Entry)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 300"
                        placeholderTextColor="#999"
                        value={day.calories}
                        onChangeText={(value) => handleDayActivityChange(day.id, "calories", value)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Other Comments Container */}
          <View style={styles.sectionContainer}>
            <Text style={styles.containerTitle}>Other Comments</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes: (e.g. Rest days are important)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveWorkoutPlan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Workout Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {renderDatePickerModal()}
        {renderActivityListModal()}
        {renderActivityDetailsModal()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#EAF3FF",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginLeft: 10,
  },
  containerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
    color: "#000",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  activityTextArea: {
    height: 100,
    textAlignVertical: "top",
    minHeight: 100,
  },
  activitiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addActivityButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  addActivityButtonSmallText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyActivitiesText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
    paddingVertical: 20,
  },
  dayContainer: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 8,
  },
  dayInputsContainer: {
  },
  actionButtons: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DCDCDC",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9F9F9",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  dateInfoText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  activitiesListButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  activitiesListButtonText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  savedActivitiesContainer: {
    marginBottom: 12,
  },
  savedActivityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  savedActivityInfo: {
    flex: 1,
  },
  savedActivityName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  savedActivityDetails: {
    fontSize: 12,
    color: "#666",
  },
  removeActivityButton: {
    padding: 4,
  },
  activityListModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    alignSelf: "center",
    marginTop: "10%",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#F9F9F9",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#000",
  },
  activityList: {
    maxHeight: 400,
  },
  activityListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  activityListItemText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    fontSize: 14,
  },
  activityDetailsModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "85%",
    alignSelf: "center",
    marginTop: "5%",
  },
  intensityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  intensityButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  intensitySelected: {
    backgroundColor: "#007AFF",
  },
  intensityButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 12,
  },
  intensityButtonTextSelected: {
    color: "#FFFFFF",
  },
  estimatedCaloriesContainer: {
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  estimatedCaloriesLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  estimatedCaloriesValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  saveActivityButton: {
    backgroundColor: "#007AFF",
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveActivityButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
