// CreateMealPlan.js - Form for nutritionist to create detailed meal plans
import React, { useEffect, useMemo, useState } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
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

  // Check if this is a 1 week plan
  const isOneWeekPlan = mealPlan?.duration === "1 week" || mealPlan?.duration === "1 Week";

  // Form state
  const [title, setTitle] = useState(mealPlan?.duration ? `${mealPlan.duration} Meal Plan` : "");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [meals, setMeals] = useState([]); // For 1 day plan
  const [days, setDays] = useState([]); // For 1 week plan - array of day objects
  const [loading, setLoading] = useState(false);

  // Date selection state (for 1 week plans)
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  // Per-meal macro inputs
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFats, setMealFats] = useState("");

  // Add meal modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(null); // For 1 week plans - tracks which day meal is being added to
  const [mealTime, setMealTime] = useState("Breakfast");
  const [food, setFood] = useState("");
  const [servings, setServings] = useState("");
  const [amount, setAmount] = useState("");
  const [mealIngredients, setMealIngredients] = useState([]);
  const [mealInstructions, setMealInstructions] = useState([]);
  const [editingMealId, setEditingMealId] = useState(null);
  const [viewMealModalVisible, setViewMealModalVisible] = useState(false);
  const [viewedMeal, setViewedMeal] = useState(null);

  // New ingredient/instruction input states
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [editSection, setEditSection] = useState("ingredients"); // 'ingredients' | 'instructions'

  const mealTimeOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

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

  // Generate days based on start and end date (for 1 week plans)
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
        meals: [], // Array of meals for this day
      });
    }

    return daysArray;
  };

  const handleDateRangeSelect = () => {
    if (startDate >= endDate) {
      Alert.alert("Invalid Date Range", "End date must be after start date.");
      return;
    }

    const generatedDays = generateDays(startDate, endDate);
    setDays(generatedDays);
    setShowDatePickerModal(false);
    Alert.alert("Success", `Generated ${generatedDays.length} days for the meal plan.`);
  };
  
  // When returning from NutritionistRecipeBrowser with an assigned recipe, auto-add as a meal
  useEffect(() => {
    const assigned = route.params?.assignedRecipe;
    if (assigned) {
      const mealTimeFromNav = route.params?.selectedMealTime;
      const mealTimeToUse = mealTimeFromNav || mealTime;
      const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const merged = { ...assigned, id: uniqueId, mealTime: mealTimeToUse };

      if (isOneWeekPlan) {
        // For 1 week plans, add to the selected day if available
        if (selectedDayId !== null) {
          setDays(days.map(day => 
            day.id === selectedDayId 
              ? { ...day, meals: [...(day.meals || []), merged] }
              : day
          ));
        }
      } else {
        // For 1 day plans, add to meals array
        if (!meals.some((m) => m.id === assigned.id)) {
          setMeals((prev) => [...prev, merged]);
        }
      }
      // Clear the assignedRecipe so it won't re-add on re-render
      navigation.setParams({ assignedRecipe: undefined, selectedMealTime: undefined });
    }
  }, [route.params?.assignedRecipe, isOneWeekPlan, selectedDayId]);

  const handleAddIngredient = () => {
    if (currentIngredient.trim()) {
      setMealIngredients([...mealIngredients, currentIngredient.trim()]);
      setCurrentIngredient("");
    }
  };

  const handleRemoveIngredient = (index) => {
    setMealIngredients(mealIngredients.filter((_, i) => i !== index));
  };

  const handleAddInstruction = () => {
    if (currentInstruction.trim()) {
      setMealInstructions([...mealInstructions, currentInstruction.trim()]);
      setCurrentInstruction("");
    }
  };

  const handleRemoveInstruction = (index) => {
    setMealInstructions(mealInstructions.filter((_, i) => i !== index));
  };

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
      id: editingMealId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mealTime,
      food: food.trim(),
      servings: servings.trim(),
      amount: amount.trim(),
      calories: mealCalories.trim(),
      protein: mealProtein.trim(),
      carbs: mealCarbs.trim(),
      fats: mealFats.trim(),
      ingredients: mealIngredients,
      instructions: mealInstructions,
    };

    if (isOneWeekPlan && selectedDayId !== null) {
      // For 1 week plans, add meal to the selected day
      if (editingMealId) {
        setDays(days.map(day => 
          day.id === selectedDayId
            ? { ...day, meals: day.meals.map(m => m.id === editingMealId ? newMeal : m) }
            : day
        ));
      } else {
        setDays(days.map(day => 
          day.id === selectedDayId 
            ? { ...day, meals: [...(day.meals || []), newMeal] }
            : day
        ));
      }
    } else {
      // For 1 day plans, use the original logic
      if (editingMealId) {
        setMeals((prev) => prev.map((m) => (m.id === editingMealId ? newMeal : m)));
      } else {
        setMeals([...meals, newMeal]);
      }
    }
    
    // Reset form
    setMealTime("Breakfast");
    setFood("");
    setServings("");
    setAmount("");
    setMealCalories("");
    setMealProtein("");
    setMealCarbs("");
    setMealFats("");
    setMealIngredients([]);
    setMealInstructions([]);
    setCurrentIngredient("");
    setCurrentInstruction("");
    setEditingMealId(null);
    setSelectedDayId(null);
    setShowAddMealModal(false);
  };

  const handleRemoveMeal = (mealId, dayId = null) => {
    if (isOneWeekPlan && dayId !== null) {
      // For 1 week plans, remove meal from specific day
      setDays(days.map(day =>
        day.id === dayId
          ? { ...day, meals: (day.meals || []).filter(m => m.id !== mealId) }
          : day
      ));
    } else {
      // For 1 day plans
      setMeals(meals.filter(meal => meal.id !== mealId));
    }
  };

  const handleOpenAddMealModal = (dayId = null) => {
    setSelectedDayId(dayId);
    setEditingMealId(null);
    setMealTime("Breakfast");
    setFood("");
    setServings("");
    setAmount("");
    setMealCalories("");
    setMealProtein("");
    setMealCarbs("");
    setMealFats("");
    setMealIngredients([]);
    setMealInstructions([]);
    setCurrentIngredient("");
    setCurrentInstruction("");
    setShowAddMealModal(true);
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
    if (isOneWeekPlan) {
      // Calculate totals from all days
      const allMeals = days.flatMap(day => day.meals || []);
      return allMeals.reduce(
        (acc, m) => ({
          calories: acc.calories + (Number(m.calories) || 0),
          protein: acc.protein + (Number(m.protein) || 0),
          carbs: acc.carbs + (Number(m.carbs) || 0),
          fats: acc.fats + (Number(m.fats) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );
    } else {
      // Calculate totals from meals array (1 day plan)
      return meals.reduce(
        (acc, m) => ({
          calories: acc.calories + (Number(m.calories) || 0),
          protein: acc.protein + (Number(m.protein) || 0),
          carbs: acc.carbs + (Number(m.carbs) || 0),
          fats: acc.fats + (Number(m.fats) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );
    }
  }, [meals, days, isOneWeekPlan]);

  const handleSaveMealPlan = async () => {
    // Validation
    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in the required fields (Title, Description).");
      return;
    }

    if (isOneWeekPlan) {
      // For 1 week plans, check if days are generated and have meals
      if (days.length === 0) {
        Alert.alert("No Dates Selected", "Please select a date range to generate days for the meal plan.");
        return;
      }
      const hasMeals = days.some(day => day.meals && day.meals.length > 0);
      if (!hasMeals) {
        Alert.alert("No Meals Added", "Please add at least one meal to the plan.");
        return;
      }
    } else {
      // For 1 day plans
      if (meals.length === 0) {
        Alert.alert("No Meals Added", "Please add at least one meal to the plan.");
        return;
      }
    }

    try {
      setLoading(true);

      // Format dates using local components to avoid timezone issues (for 1 week plans)
      const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

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
        meals: isOneWeekPlan ? null : meals, // For 1 day plans
        days: isOneWeekPlan ? days : null, // For 1 week plans
        notes: notes.trim(),
        nutritionistId: currentUser.uid,
        nutritionistName: currentUser.displayName || "Nutritionist",
        userId: mealPlan.userId,
        userName: mealPlan.userName,
        duration: mealPlan.duration,
        startDate: isOneWeekPlan ? formatDateLocal(startDate) : null,
        endDate: isOneWeekPlan ? formatDateLocal(endDate) : null,
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
      animationType="fade"
      onRequestClose={() => setShowAddMealModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.addMealModal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingMealId ? "Edit Meal" : "Add Meal"}</Text>
            <TouchableOpacity
              onPress={() => setShowAddMealModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={[styles.modalContent, { flex: 1 }]}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Quick action: View Recipe */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.addMealButtonSmall}
                onPress={() => {
                  setShowAddMealModal(false);
                  navigation.navigate("NutritionistRecipeBrowser", { 
                    mealPlan, 
                    selectedMealTime: mealTime, 
                    returnToKey: route.key,
                    selectedDayId: selectedDayId // Pass selected day ID for 1 week plans
                  });
                }}
              >
                <Ionicons name="book-outline" size={20} color="#007AFF" />
                <Text style={styles.addMealButtonSmallText}>Browse Recipes</Text>
              </TouchableOpacity>
            </View>

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
              <Text style={styles.inputLabel}>Food Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Grilled Chicken Salad"
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

            {/* Macros */}
            <View style={styles.macrosContainer}>
              <Text style={styles.sectionTitle}>Nutrition Information</Text>
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}> 
                  <Text style={styles.inputLabel}>Calories</Text>
                  <View style={styles.macroInputContainer}>
                    <TextInput
                      style={styles.macroInput}
                      placeholder="350"
                      placeholderTextColor="#999"
                      value={mealCalories}
                      onChangeText={setMealCalories}
                      keyboardType="numeric"
                    />
                    <Text style={styles.macroUnit}>kcal</Text>
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}> 
                  <Text style={styles.inputLabel}>Protein</Text>
                  <View style={styles.macroInputContainer}>
                    <TextInput
                      style={styles.macroInput}
                      placeholder="25"
                      placeholderTextColor="#999"
                      value={mealProtein}
                      onChangeText={setMealProtein}
                      keyboardType="numeric"
                    />
                    <Text style={styles.macroUnit}>g</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}> 
                  <Text style={styles.inputLabel}>Carbs</Text>
                  <View style={styles.macroInputContainer}>
                    <TextInput
                      style={styles.macroInput}
                      placeholder="40"
                      placeholderTextColor="#999"
                      value={mealCarbs}
                      onChangeText={setMealCarbs}
                      keyboardType="numeric"
                    />
                    <Text style={styles.macroUnit}>g</Text>
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}> 
                  <Text style={styles.inputLabel}>Fats</Text>
                  <View style={styles.macroInputContainer}>
                    <TextInput
                      style={styles.macroInput}
                      placeholder="12"
                      placeholderTextColor="#999"
                      value={mealFats}
                      onChangeText={setMealFats}
                      keyboardType="numeric"
                    />
                    <Text style={styles.macroUnit}>g</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Clean editor for Ingredients/Instructions */}
            <View style={styles.inputGroup}>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, editSection === 'ingredients' && styles.segmentButtonActive]}
                  onPress={() => setEditSection('ingredients')}
                >
                  <Text style={[styles.segmentText, editSection === 'ingredients' && styles.segmentTextActive]}>Ingredients</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, editSection === 'instructions' && styles.segmentButtonActive]}
                  onPress={() => setEditSection('instructions')}
                >
                  <Text style={[styles.segmentText, editSection === 'instructions' && styles.segmentTextActive]}>Instructions</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.editorScroll}
                contentContainerStyle={styles.editorScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {(editSection === 'ingredients' ? mealIngredients : mealInstructions).map((val, index) => (
                  <View key={`${editSection}-${index}`} style={styles.editorRow}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberBadgeText}>{index + 1}</Text>
                    </View>
                    <TextInput
                      style={styles.editorInput}
                      value={val}
                      onChangeText={(t) => {
                        if (editSection === 'ingredients') {
                          const arr = [...mealIngredients];
                          arr[index] = t;
                          setMealIngredients(arr);
                        } else {
                          const arr = [...mealInstructions];
                          arr[index] = t;
                          setMealInstructions(arr);
                        }
                      }}
                      placeholder={editSection === 'ingredients' ? 'Add ingredient' : 'Add instruction'}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (editSection === 'ingredients') handleRemoveIngredient(index); else handleRemoveInstruction(index);
                      }}
                      style={styles.removeItemButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addRowButton}
                  onPress={() => {
                    if (editSection === 'ingredients') setMealIngredients([...mealIngredients, ""]);
                    else setMealInstructions([...mealInstructions, ""]);
                  }}
                >
                  <Ionicons name="add-circle" size={22} color="#007AFF" />
                  <Text style={styles.addRowText}>Add {editSection === 'ingredients' ? 'Ingredient' : 'Instruction'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </ScrollView>

          {/* Add Meal Button */}
          <TouchableOpacity
            style={styles.addMealButton}
            onPress={handleAddMeal}
          >
            <Text style={styles.addMealButtonText}>
              {editingMealId ? "Update Meal" : "Add Meal"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderViewMealModal = () => (
    <Modal
      visible={viewMealModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setViewMealModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.viewMealModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Meal Details</Text>
            <TouchableOpacity onPress={() => setViewMealModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.viewModalScrollView}
            contentContainerStyle={styles.viewModalContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {viewedMeal ? (
              <View>
                {/* Meal header */}
                <View style={styles.viewMealHeader}>
                  <View style={styles.mealTimeBadge}>
                    <Text style={styles.mealTimeBadgeText}>{viewedMeal.mealTime}</Text>
                  </View>
                  <Text style={styles.viewMealTitle}>{viewedMeal.food}</Text>
                  <Text style={styles.viewMealSubtitle}>
                    {viewedMeal.servings} serving(s) • {viewedMeal.amount}g
                  </Text>
                </View>

                {/* Nutrition facts card */}
                <View style={styles.nutritionCard}>
                  <Text style={styles.nutritionCardTitle}>Nutrition Facts</Text>
                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{viewedMeal.calories}</Text>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{viewedMeal.protein}g</Text>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{viewedMeal.carbs}g</Text>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{viewedMeal.fats}g</Text>
                      <Text style={styles.nutritionLabel}>Fats</Text>
                    </View>
                  </View>
                </View>

                {/* Ingredients */}
                {Array.isArray(viewedMeal.ingredients) && viewedMeal.ingredients.length > 0 && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="basket-outline" size={20} color="#007AFF" />
                      <Text style={styles.detailSectionTitle}>Ingredients</Text>
                    </View>
                    <View style={styles.detailList}>
                      {viewedMeal.ingredients.map((ing, idx) => (
                        <View key={`ing-${idx}`} style={styles.detailListItem}>
                          <View style={styles.detailBullet} />
                          <Text style={styles.detailListText}>{ing}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Instructions */}
                {Array.isArray(viewedMeal.instructions) && viewedMeal.instructions.length > 0 && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="list-outline" size={20} color="#007AFF" />
                      <Text style={styles.detailSectionTitle}>Instructions</Text>
                    </View>
                    <View style={styles.detailList}>
                      {viewedMeal.instructions.map((step, idx) => (
                        <View key={`step-${idx}`} style={styles.detailListItem}>
                          <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>{idx + 1}</Text>
                          </View>
                          <Text style={styles.detailListText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Date Picker Modal (for 1 week plans)
  const renderDatePickerModal = () => {
    if (!isOneWeekPlan) return null;

    return (
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
                This will generate up to 7 days of meals between the selected dates.
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
              {isOneWeekPlan ? (
                <TouchableOpacity
                  style={styles.addMealButtonSmall}
                  onPress={() => setShowDatePickerModal(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  <Text style={styles.addMealButtonSmallText}>Select Dates</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addMealButtonSmall}
                  onPress={() => handleOpenAddMealModal()}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                  <Text style={styles.addMealButtonSmallText}>Add Meal</Text>
                </TouchableOpacity>
              )}
            </View>

            {isOneWeekPlan ? (
              // 1 Week Plan - Show days with meals
              days.length === 0 ? (
                <Text style={styles.emptyMealsText}>
                  No dates selected yet. Tap "Select Dates" to choose a date range and get started.
                </Text>
              ) : (
                days.map((day) => (
                  <View key={day.id} style={styles.dayContainer}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <TouchableOpacity
                        style={styles.addMealButtonSmall}
                        onPress={() => handleOpenAddMealModal(day.id)}
                      >
                        <Ionicons name="add" size={16} color="#007AFF" />
                        <Text style={styles.addMealButtonSmallText}>Add Meal</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Display meals for this day */}
                    {day.meals && day.meals.length > 0 ? (
                      day.meals.map((meal) => (
                        <TouchableOpacity
                          key={meal.id}
                          style={styles.mealItem}
                          activeOpacity={0.8}
                          onPress={() => {
                            setViewedMeal(meal);
                            setViewMealModalVisible(true);
                          }}
                        >
                          <View style={styles.mealInfo}>
                            <Text style={styles.mealTime}>{meal.mealTime}</Text>
                            <Text style={styles.mealFood}>{meal.food}</Text>
                            <Text style={styles.mealDetails}>
                              {meal.servings} serving{meal.servings !== "1" ? "s" : ""} • {meal.amount}g
                            </Text>
                            <Text style={styles.mealDetails}>
                              Calories: {meal.calories} kcal • P {meal.protein}g • C {meal.carbs}g • F {meal.fats}g
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row" }}>
                            <TouchableOpacity
                              onPress={() => {
                                // edit mode, prefill fields
                                setSelectedDayId(day.id);
                                setEditingMealId(meal.id);
                                setMealTime(meal.mealTime || "Breakfast");
                                setFood(meal.food || "");
                                setServings(String(meal.servings || ""));
                                setAmount(String(meal.amount || ""));
                                setMealCalories(String(meal.calories || ""));
                                setMealProtein(String(meal.protein || ""));
                                setMealCarbs(String(meal.carbs || ""));
                                setMealFats(String(meal.fats || ""));
                                setMealIngredients(Array.isArray(meal.ingredients) ? meal.ingredients : []);
                                setMealInstructions(Array.isArray(meal.instructions) ? meal.instructions : []);
                                setCurrentIngredient("");
                                setCurrentInstruction("");
                                setShowAddMealModal(true);
                              }}
                              style={styles.removeMealButton}
                            >
                              <Ionicons name="create-outline" size={18} color="#007AFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRemoveMeal(meal.id, day.id)}
                              style={styles.removeMealButton}
                            >
                              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.emptyDayText}>No meals added for this day</Text>
                    )}
                  </View>
                ))
              )
            ) : (
              // 1 Day Plan - Show meals list
              meals.length === 0 ? (
                <Text style={styles.emptyMealsText}>No meals added yet. Tap "Add Meal" to get started.</Text>
              ) : (
                meals.map((meal) => (
                  <TouchableOpacity
                  key={meal.id}
                  style={styles.mealItem}
                  activeOpacity={0.8}
                  onPress={() => {
                    setViewedMeal(meal);
                    setViewMealModalVisible(true);
                  }}
                >
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTime}>{meal.mealTime}</Text>
                    <Text style={styles.mealFood}>{meal.food}</Text>
                    <Text style={styles.mealDetails}>
                      {meal.servings} serving{meal.servings !== "1" ? "s" : ""} • {meal.amount}g
                    </Text>
                    <Text style={styles.mealDetails}>Calories: {meal.calories} kcal • P {meal.protein}g • C {meal.carbs}g • F {meal.fats}g</Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      onPress={() => {
                        // edit mode, prefill fields
                        setEditingMealId(meal.id);
                        setMealTime(meal.mealTime || "Breakfast");
                        setFood(meal.food || "");
                        setServings(String(meal.servings || ""));
                        setAmount(String(meal.amount || ""));
                        setMealCalories(String(meal.calories || ""));
                        setMealProtein(String(meal.protein || ""));
                        setMealCarbs(String(meal.carbs || ""));
                        setMealFats(String(meal.fats || ""));
                        setMealIngredients(Array.isArray(meal.ingredients) ? meal.ingredients : []);
                        setMealInstructions(Array.isArray(meal.instructions) ? meal.instructions : []);
                        setCurrentIngredient("");
                        setCurrentInstruction("");
                        setShowAddMealModal(true);
                      }}
                      style={styles.removeMealButton}
                    >
                      <Ionicons name="create-outline" size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveMeal(meal.id)}
                      style={styles.removeMealButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                ))
              )
            )}
          </View>

          {/* Nutrients Breakdown (Auto totals) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.containerTitle}>Nutrients Breakdown</Text>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownPill}><Text style={styles.breakdownPillText}>{totalMacros.calories} kcal</Text></View>
              <View style={styles.breakdownPill}><Text style={styles.breakdownPillText}>Protein {totalMacros.protein} g</Text></View>
              <View style={styles.breakdownPill}><Text style={styles.breakdownPillText}>Carbs {totalMacros.carbs} g</Text></View>
              <View style={styles.breakdownPill}><Text style={styles.breakdownPillText}>Fats {totalMacros.fats} g</Text></View>
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
        {renderViewMealModal()}
        {renderDatePickerModal()}
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
  readonlyBox: {
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
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
    height: "80%",
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
  macrosContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  macroInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  macroInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
  },
  macroUnit: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  // Breakdown pills (totals)
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E8F4FF',
    borderWidth: 1,
    borderColor: '#D6EAFF',
  },
  breakdownPillText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 12,
  },
  // New styles for ingredients/instructions
  listContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    maxHeight: 200,
  },
  listScroll: {
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 12,
    backgroundColor: "#F8F9FA",
  },
  listScrollContent: {
    padding: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  listItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  numberBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  removeItemButton: {
    padding: 4,
    marginLeft: 8,
  },
  addItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#F0F8FF",
    color: "#000",
  },
  addItemButton: {
    padding: 4,
  },
  // Segmented editor styles
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0F4FA',
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  segmentText: {
    color: '#666',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#007AFF',
  },
  editorScroll: {
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  editorScrollContent: {
    padding: 8,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  editorInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  addRowText: {
    color: '#007AFF',
    fontWeight: '700',
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
  // View meal modal styles
  viewMealModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    height: "80%",
  },
  viewModalScrollView: {
    flex: 1,
  },
  viewModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  viewMealHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  mealTimeBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  mealTimeBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  viewMealTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  viewMealSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  nutritionCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nutritionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#666",
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginLeft: 8,
  },
  detailList: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
  },
  detailListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  detailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#007AFF",
    marginTop: 7,
    marginRight: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  detailListText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  // Day container styles (for 1 week plans)
  dayContainer: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    flex: 1,
  },
  emptyDayText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  // Date picker modal styles
  datePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
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
});