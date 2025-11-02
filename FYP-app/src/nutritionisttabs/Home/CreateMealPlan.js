// CreateMealPlan.js - Form for nutritionist to create detailed meal plans
import React, { useMemo, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import API from "../../api/backend";

export default function CreateMealPlan() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mealPlan } = route.params || {};
  const currentUser = auth.currentUser;

  // Debug logging
  console.log("CreateMealPlan - Received mealPlan:", mealPlan);
  console.log("CreateMealPlan - Current user:", currentUser?.uid);

  // Form state
  const [title, setTitle] = useState(mealPlan?.duration ? `${mealPlan.duration} Meal Plan` : "");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  // Per-meal macro inputs
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFats, setMealFats] = useState("");

  // Add meal modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [mealTime, setMealTime] = useState("Breakfast");
  const [food, setFood] = useState("");
  const [servings, setServings] = useState("");
  const [amount, setAmount] = useState("");

  const mealTimeOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

  const handleAddMeal = () => {
    // Validation
    if (!food.trim() || !servings.trim() || !amount.trim()) {
      Alert.alert("Missing Information", "Please fill in all meal fields.");
      return;
    }
    if (!mealCalories.trim() || !mealProtein.trim() || !mealCarbs.trim() || !mealFats.trim()) {
      Alert.alert("Missing Information", "Please enter Calories, Protein, Carbs and Fats for this meal.");
      return;
    }

    const newMeal = {
      id: Date.now().toString(),
      mealTime,
      food: food.trim(),
      servings: servings.trim(),
      amount: amount.trim(),
      calories: mealCalories.trim(),
      protein: mealProtein.trim(),
      carbs: mealCarbs.trim(),
      fats: mealFats.trim(),
    };

    setMeals([...meals, newMeal]);
    
    // Reset form
    setMealTime("Breakfast");
    setFood("");
    setServings("");
    setAmount("");
    setMealCalories("");
    setMealProtein("");
    setMealCarbs("");
    setMealFats("");
    setShowAddMealModal(false);
  };

  const handleRemoveMeal = (mealId) => {
    setMeals(meals.filter(meal => meal.id !== mealId));
  };

  const sendChatMessage = async (messageText) => {
    try {
      const userId = mealPlan.userId;
      const chatId = currentUser.uid > userId
        ? `${currentUser.uid}_${userId}`
        : `${userId}_${currentUser.uid}`;

      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: Math.random().toString(36).substring(7),
        text: messageText,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || "Nutritionist",
        },
        mealPlanId: mealPlan.id,
        isMealPlanResponse: true,
        read: false,
      });

      console.log('✅ Chat message sent successfully');
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
    }
  };

  const totalMacros = useMemo(() => {
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fats: acc.fats + (Number(m.fats) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    return totals;
  }, [meals]);

  const handleSaveMealPlan = async () => {
    // Validation
    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in the required fields (Title, Description).");
      return;
    }

    if (meals.length === 0) {
      Alert.alert("No Meals Added", "Please add at least one meal to the plan.");
      return;
    }

    try {
      setLoading(true);

      // Create meal plan data
      const mealPlanData = {
        title: title.trim(),
        description: description.trim(),
        nutrients: {
          protein: totalMacros.protein,
          carbs: totalMacros.carbs,
          fats: totalMacros.fats,
        },
        caloriesTotal: totalMacros.calories,
        meals: meals,
        notes: notes.trim(),
        nutritionistId: currentUser.uid,
        nutritionistName: currentUser.displayName || "Nutritionist",
        userId: mealPlan.userId,
        userName: mealPlan.userName,
        duration: mealPlan.duration,
        createdAt: new Date().toISOString(),
      };

      // Save to database (you might want to create a new collection for detailed meal plans)
      // For now, we'll update the existing meal plan record
      await API.put(`/meal-plans/nutritionist/${mealPlan.id}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
        mealPlanDetails: mealPlanData
      });

      // Send message to user with structured metadata for CTA rendering
      const message = `🎉 Your ${mealPlan.duration} Meal Plan is Ready!`;

      try {
        const userId = mealPlan.userId;
        const chatId = currentUser.uid > userId
          ? `${currentUser.uid}_${userId}`
          : `${userId}_${currentUser.uid}`;

        await addDoc(collection(db, "chats", chatId, "messages"), {
          _id: Math.random().toString(36).substring(7),
          text: message,
          createdAt: serverTimestamp(),
          user: {
            _id: currentUser.uid,
            name: currentUser.displayName || "Nutritionist",
          },
          // Metadata for client CTA
          messageType: 'mealPlan',
          mealPlanId: mealPlan.id,
          mealPlanDetails: mealPlanData,
          isMealPlanResponse: true,
          read: false,
        });
      } catch (e) {
        console.error('❌ Error sending structured meal plan message:', e);
        // Fallback to plain message
        await sendChatMessage(message);
      }

      Alert.alert(
        "✅ Success!",
        "Meal plan has been created and sent to the user!",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error("Error saving meal plan:", error);
      Alert.alert("Error", "Failed to save meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderAddMealModal = () => (
    <Modal
      visible={showAddMealModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddMealModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.addMealModal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Meal</Text>
            <TouchableOpacity
              onPress={() => setShowAddMealModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Meal Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Meal Time</Text>
              <View style={styles.dropdownContainer}>
                {mealTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      mealTime === option && styles.dropdownOptionSelected
                    ]}
                    onPress={() => setMealTime(option)}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      mealTime === option && styles.dropdownOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Food */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Food</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter food"
                placeholderTextColor="#999"
                value={food}
                onChangeText={setFood}
              />
            </View>

            {/* Servings and Amount */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Servings</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1"
                  placeholderTextColor="#999"
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="100"
                    placeholderTextColor="#999"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                  <Text style={styles.amountSuffix}>g</Text>
                </View>
              </View>
            </View>
            {/* Calories, Protein, Carbs, Fats inputs below Amount */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}> 
                <Text style={styles.inputLabel}>Calories (kcal)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 350"
                  placeholderTextColor="#999"
                  value={mealCalories}
                  onChangeText={setMealCalories}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}> 
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 25"
                  placeholderTextColor="#999"
                  value={mealProtein}
                  onChangeText={setMealProtein}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}> 
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 40"
                  placeholderTextColor="#999"
                  value={mealCarbs}
                  onChangeText={setMealCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}> 
                <Text style={styles.inputLabel}>Fats (g)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 12"
                  placeholderTextColor="#999"
                  value={mealFats}
                  onChangeText={setMealFats}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          {/* Add Meal Button */}
          <TouchableOpacity
            style={styles.addMealButton}
            onPress={handleAddMeal}
          >
            <Text style={styles.addMealButtonText}>Add Meal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Meal Plan</Text>
          </View>

          {/* Diet Plan Details Container */}
          <View style={styles.sectionContainer}>
            <Text style={styles.containerTitle}>Diet Plan Details</Text>
            
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Meal Plan Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter meal plan title"
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
                placeholder="Description (e.g Diet for weight loss)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

        </View>

          {/* Meals Container */}
          <View style={styles.sectionContainer}>
            <View style={styles.mealsHeader}>
              <Text style={styles.containerTitle}>Meals</Text>
              <TouchableOpacity
                style={styles.addMealButtonSmall}
                onPress={() => setShowAddMealModal(true)}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.addMealButtonSmallText}>Add Meal</Text>
              </TouchableOpacity>
            </View>

            {meals.length === 0 ? (
              <Text style={styles.emptyMealsText}>No meals added yet. Tap "Add Meal" to get started.</Text>
            ) : (
              meals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTime}>{meal.mealTime}</Text>
                    <Text style={styles.mealFood}>{meal.food}</Text>
                    <Text style={styles.mealDetails}>
                      {meal.servings} serving{meal.servings !== "1" ? "s" : ""} • {meal.amount}g
                    </Text>
                    <Text style={styles.mealDetails}>Calories: {meal.calories} kcal • P {meal.protein}g • C {meal.carbs}g • F {meal.fats}g</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveMeal(meal.id)}
                    style={styles.removeMealButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Nutrients Breakdown (Auto totals) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.containerTitle}>Nutrients Breakdown</Text>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}> 
                <Text style={styles.inputLabel}>Total Calories</Text>
                <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{totalMacros.calories} kcal</Text></View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}> 
                <Text style={styles.inputLabel}>Protein</Text>
                <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{totalMacros.protein} g</Text></View>
              </View>
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}> 
                <Text style={styles.inputLabel}>Carbs</Text>
                <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{totalMacros.carbs} g</Text></View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}> 
                <Text style={styles.inputLabel}>Fats</Text>
                <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{totalMacros.fats} g</Text></View>
              </View>
            </View>
          </View>

          {/* Other Comments Container */}
          <View style={styles.sectionContainer}>
            <Text style={styles.containerTitle}>Other Comments</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes: (e.g. Drink more water)"
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
              onPress={handleSaveMealPlan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Meal Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {renderAddMealModal()}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
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
  rowInputs: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addMealButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  addMealButtonSmallText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyMealsText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
    paddingVertical: 20,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  mealInfo: {
    flex: 1,
  },
  mealTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "uppercase",
  },
  mealFood: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginVertical: 2,
  },
  mealDetails: {
    fontSize: 12,
    color: "#666",
  },
  removeMealButton: {
    padding: 8,
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
  addMealModal: {
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
  dropdownContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCDCDC",
    backgroundColor: "#F9F9F9",
  },
  dropdownOptionSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  dropdownOptionText: {
    fontSize: 14,
    color: "#666",
  },
  dropdownOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
  },
  amountSuffix: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  addMealButton: {
    backgroundColor: "#007AFF",
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addMealButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
