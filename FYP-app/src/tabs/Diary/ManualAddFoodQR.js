import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";

export default function ManualAddFoodQR() {
  const navigation = useNavigation();
  const route = useRoute();
  const { barcode, partialData } = route.params || {};

  const [foodName, setFoodName] = useState(partialData?.name || "");
  const [calories, setCalories] = useState(
    partialData?.nutriments?.calories !== "N/A"
      ? partialData?.nutriments?.calories
      : ""
  );
  const [protein, setProtein] = useState(
    partialData?.nutriments?.proteins_100g !== "N/A"
      ? partialData?.nutriments?.proteins_100g
      : ""
  );
  const [fat, setFat] = useState(
    partialData?.nutriments?.fat_100g !== "N/A"
      ? partialData?.nutriments?.fat_100g
      : ""
  );
  const [carbs, setCarbs] = useState(
    partialData?.nutriments?.carbohydrates_100g !== "N/A"
      ? partialData?.nutriments?.carbohydrates_100g
      : ""
  );

  // Serving size fields
  const [servingAmount, setServingAmount] = useState(
    partialData?.servingAmount || partialData?.serving_size || "100"
  );
  const [servingUnit, setServingUnit] = useState(
    partialData?.servingUnit || "g"
  );
  const servingOptions = [
    { label: "grams (g)", value: "g", icon: "scale-outline" },
    { label: "milliliters (ml)", value: "ml", icon: "water-outline" },
    { label: "cup", value: "cup", icon: "cafe-outline" },
    { label: "piece(s)", value: "piece", icon: "ellipse-outline" },
    { label: "slice(s)", value: "slice", icon: "cut-outline" },
    { label: "tablespoon (tbsp)", value: "tbsp", icon: "restaurant-outline" },
    { label: "teaspoon (tsp)", value: "tsp", icon: "restaurant-outline" },
    { label: "ounce (oz)", value: "oz", icon: "scale-outline" },
    { label: "serving", value: "serving", icon: "restaurant-outline" },
  ];
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (msg) => {
    setErrorMessage(msg);
  };

  const handleAddFood = async () => {
    if (!foodName || !calories || !servingAmount) {
      showError("Please fill Food Name, Calories, and Serving Size.");
      return;
    }

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        showError("User not logged in.");
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const mealId = Date.now().toString();

      const meal = {
        id: mealId,
        userId: uid,
        mealType: "Snack",
        date: route.params?.selectedDate || new Date().toISOString().split("T")[0],
        food: foodName,
        servingSize: `${servingAmount} ${servingUnit}`,
        servings: 1,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fat) || 0,
        source: "manual",
      };

      const response = await API.post(`/meals_log/${uid}`, meal);

      if (response.data) {
        setSuccessModalVisible(true);
      } else {
        showError("Failed to submit food.");
      }
    } catch (error) {
      console.error("Error adding food:", error);
      showError("Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        {/* Header (Fixed Center Alignment) */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>

          {/* Centered title */}
          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>
              {partialData ? "Complete Information" : "Add New Food"}
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Progress Indicator */}
        {partialData && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressTitle}>Almost There!</Text>
                <Text style={styles.progressSubtitle}>
                  Complete the missing nutritional information
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Barcode Badge */}
        {barcode && (
          <View style={styles.barcodeBadge}>
            <Ionicons name="barcode-outline" size={20} color="#666" />
            <Text style={styles.barcodeText}>{barcode}</Text>
          </View>
        )}

        {/* Product Info Card */}
        {partialData?.name && (
          <View style={styles.productInfoCard}>
            <Text style={styles.productCardTitle}>Product Details</Text>
            <View style={styles.productInfoRow}>
              <Ionicons name="fast-food-outline" size={20} color="#2196F3" />
              <Text style={styles.productName}>{partialData.name}</Text>
            </View>
            {partialData?.brand && (
              <View style={styles.productInfoRow}>
                <Ionicons name="business-outline" size={20} color="#666" />
                <Text style={styles.productBrand}>{partialData.brand}</Text>
              </View>
            )}
          </View>
        )}

        {/* Food Name Input */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Ionicons name="create-outline" size={22} color="#2196F3" />
            <Text style={styles.inputCardTitle}>Food Name</Text>
          </View>
          <TextInput
            style={[styles.input, partialData?.name && styles.prefilledInput]}
            placeholder="e.g. Cheetos, Haribo"
            placeholderTextColor="#999"
            value={foodName}
            onChangeText={setFoodName}
          />
        </View>

        {/* Serving Size Card */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Ionicons name="resize-outline" size={22} color="#2196F3" />
            <Text style={styles.inputCardTitle}>Serving Size</Text>
          </View>
          <Text style={styles.helperText}>
            Enter the reference serving size for nutritional values
          </Text>
          <View style={styles.servingSizeRow}>
            <View style={styles.servingAmountContainer}>
              <TextInput
                style={[styles.input, styles.servingAmountInput]}
                placeholder="100"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={servingAmount}
                onChangeText={setServingAmount}
              />
            </View>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDropdownVisible(true)}
            >
              <View style={styles.dropdownContent}>
                <Ionicons
                  name={
                    servingOptions.find((o) => o.value === servingUnit)?.icon ||
                    "ellipse-outline"
                  }
                  size={20}
                  color="#2196F3"
                />
                <Text style={styles.dropdownText}>
                  {servingOptions.find((o) => o.value === servingUnit)?.label ||
                    "Select"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition Card */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Ionicons name="nutrition-outline" size={22} color="#2196F3" />
            <Text style={styles.inputCardTitle}>Nutritional Information</Text>
          </View>
          <Text style={styles.helperText}>
            Per serving entered above
          </Text>
          
          {/* Calories - Full Width */}
          <View style={styles.nutritionItemFull}>
            <View style={styles.nutritionLabelRow}>
              <Ionicons name="flame-outline" size={20} color="#FF5722" />
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[
                  styles.nutritionInput,
                  partialData?.nutriments?.calories !== "N/A" &&
                    styles.prefilledInput,
                ]}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={calories}
                onChangeText={setCalories}
              />
              <Text style={styles.unitLabel}>kcal</Text>
            </View>
          </View>

          {/* Macros Grid */}
          <View style={styles.macrosGrid}>
            {[
              { 
                label: "Protein", 
                value: protein, 
                set: setProtein, 
                unit: "g",
                icon: "barbell-outline",
                color: "#4CAF50",
                key: "proteins_100g"
              },
              { 
                label: "Fat", 
                value: fat, 
                set: setFat, 
                unit: "g",
                icon: "water-outline",
                color: "#FFC107",
                key: "fat_100g"
              },
              { 
                label: "Carbs", 
                value: carbs, 
                set: setCarbs, 
                unit: "g",
                icon: "leaf-outline",
                color: "#FF9800",
                key: "carbohydrates_100g"
              },
            ].map((item, index) => (
              <View key={index} style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={styles.macroLabel}>{item.label}</Text>
                </View>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[
                      styles.macroInput,
                      partialData?.nutriments?.[item.key] !== "N/A" &&
                        styles.prefilledInput,
                    ]}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={item.value}
                    onChangeText={item.set}
                  />
                  <Text style={styles.unitLabel}>{item.unit}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            Enter values exactly as shown on the nutrition label. Your submission will be verified by our nutrition team.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleAddFood}
          disabled={loading}
        >
          {loading ? (
            <>
              <Ionicons name="hourglass-outline" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Logging...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Log Food</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Serving Unit</Text>
              <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={servingOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    item.value === servingUnit && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setServingUnit(item.value);
                    setDropdownVisible(false);
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.value === servingUnit ? "#2196F3" : "#666"}
                  />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      item.value === servingUnit && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === servingUnit && (
                    <Ionicons name="checkmark" size={22} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>
              You have successfully log your food!
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fa" },
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  headerContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 24,
  position: "relative",
},

backButton: {
  position: "absolute",
  left: 0,
  padding: 8,
},

headerTitleWrapper: {
  flex: 1,
  alignItems: "center",
},

headerTitle: {
  fontSize: 24,
  fontWeight: "700",
  color: "#1a1a1a",
},
  placeholder: { width: 40 },
  
  // Error Box
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
  },
  errorText: { 
    color: "#C62828", 
    marginLeft: 10, 
    flex: 1, 
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
  },
  
  // Progress Card
  progressCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#81C784",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#558B2F",
  },
  
  // Barcode Badge
  barcodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  barcodeText: { 
    color: "#555", 
    marginLeft: 8, 
    fontSize: 14,
    fontWeight: "600",
  },

  // Product Info Card
  productInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  productCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  productInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 10,
  },
  productBrand: {
    fontSize: 15,
    color: "#666",
    marginLeft: 10,
    fontStyle: "italic",
  },
  
  // Input Cards
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
  },
  prefilledInput: {
    backgroundColor: "#E3F2FD",
    borderColor: "#90CAF9",
  },
  helperText: { 
    fontSize: 13, 
    color: "#666", 
    marginBottom: 12,
    lineHeight: 18,
  },
  
  // Serving Size
  servingSizeRow: {
    flexDirection: "row",
    gap: 12,
  },
  servingAmountContainer: {
    flex: 1,
  },
  servingAmountInput: {
    marginBottom: 0,
  },
  dropdownButton: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    minHeight: 52,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dropdownText: { 
    fontSize: 15, 
    color: "#1a1a1a",
    fontWeight: "500",
  },
  
  // Nutrition
  nutritionItemFull: {
    marginBottom: 16,
  },
  nutritionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  nutritionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredBadgeText: {
    fontSize: 11,
    color: "#D32F2F",
    fontWeight: "600",
  },
  inputWithUnit: {
    position: "relative",
  },
  nutritionInput: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
    paddingRight: 50,
  },
  unitLabel: {
    position: "absolute",
    right: 16,
    top: 16,
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  
  // Macros Grid
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  macroItem: {
    flex: 1,
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  macroInput: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
    paddingRight: 35,
  },
  
  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  infoText: { 
    color: "#1565C0", 
    marginLeft: 10, 
    flex: 1, 
    fontSize: 13,
    lineHeight: 19,
  },
  
  // Submit Button
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 10,
    fontSize: 17,
  },
  
  // Dropdown Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  dropdownItemSelected: {
    backgroundColor: "#E3F2FD",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#1a1a1a",
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: "#2196F3",
    fontWeight: "600",
  },
  
  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: 340,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  successButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});