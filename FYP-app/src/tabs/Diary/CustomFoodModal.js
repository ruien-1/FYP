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
import LogMealModal from "../Recipe/LogMealModal";

export default function CustomFoodModal({
  visible,
  onClose,
  modalType,
  setModalType,
  myFoods = [],
  setMyFoods,
  selectedFood,
  setSelectedFood,
  uid,
  selectedDate,
}) {
  const [form, setForm] = useState({
    name: "",
    serving: "",
    numOfServings: "1",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
    mealType: "Breakfast",
  });

  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ✅ LogMealModal states
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [foodToLog, setFoodToLog] = useState(null);

  // fetch foods
  useEffect(() => {
    const fetchFoods = async () => {
      if (visible && modalType === "list" && uid) {
        try {
          const res = await API.get(`/CustomFood/${uid}`);
          setMyFoods(res.data || []);
        } catch (err) {
          console.error("❌ Error fetching custom foods:", err);
          setMyFoods([]);
          showError("Failed to fetch foods.");
        }
      }
    };
    fetchFoods();
  }, [visible, modalType, uid]);

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

  // add food
  const handleSave = async () => {
  if (!form.name.trim()) return showError("Food name is required.");
  if (!form.serving.trim()) return showError("Serving size is required.");

  const cleanedForm = {
    ...form,
    numOfServings:
      form.numOfServings.trim() === "" ? 1 : parseFloat(form.numOfServings),
    calories:
      form.calories.trim() === "" ? 0 : parseFloat(form.calories),
    protein:
      form.protein.trim() === "" ? 0 : parseFloat(form.protein),
    fat:
      form.fat.trim() === "" ? 0 : parseFloat(form.fat),
    carbs:
      form.carbs.trim() === "" ? 0 : parseFloat(form.carbs),
  };

  try {
    const res = await API.post(`/CustomFood/${uid}`, cleanedForm);
    setMyFoods((prev) => [...prev, res.data.entry]);
    showSuccess("Food added successfully!");
    resetForm();
  } catch (err) {
    console.error("Add food error:", err);
    showError("Failed to add food.");
  }
};

// update food
const handleUpdate = async () => {
  if (!form.name.trim()) return showError("Food name is required.");

  const cleanedForm = {
    ...form,
    numOfServings:
      form.numOfServings.trim() === "" ? 1 : parseFloat(form.numOfServings),
    calories:
      form.calories.trim() === "" ? 0 : parseFloat(form.calories),
    protein:
      form.protein.trim() === "" ? 0 : parseFloat(form.protein),
    fat:
      form.fat.trim() === "" ? 0 : parseFloat(form.fat),
    carbs:
      form.carbs.trim() === "" ? 0 : parseFloat(form.carbs),
  };

  try {
    await API.put(`/CustomFood/${uid}/${selectedFood.id}`, cleanedForm);
    setMyFoods((prev) =>
      prev.map((f) => (f.id === selectedFood.id ? { ...f, ...cleanedForm } : f))
    );
    showSuccess("Food updated successfully!");
    setModalType("list");
  } catch (err) {
    console.error("Update food error:", err);
    showError("Failed to update food.");
  }
};


  // delete food
  const handleDelete = async (entryId) => {
    try {
      await API.delete(`/CustomFood/${uid}/${entryId}`);
      setMyFoods((prev) => prev.filter((f) => f.id !== entryId));
      showSuccess("Food deleted successfully!");
    } catch (err) {
      console.error("Delete food error:", err);
      showError("Failed to delete food.");
    }
  };

  // log food to diary
  const LogToDiary = async (food, mealType, servings) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      const mealLog = {
        mealType: mealType || food.mealType || "Breakfast",
        date: selectedDate || new Date().toISOString().split("T")[0],
        food: food.name,
        calories: Number(food.calories) || 0,
        protein: Number(food.protein) || 0,
        carbs: Number(food.carbs) || 0,
        fats: Number(food.fat) || 0,
        servingSize: food.serving || "1 serving",
        servings: servings || Number(food.numOfServings) || 1,
      };

      const postRes = await API.post(`/meals_log/${uid}`, mealLog);
      if (postRes.data.success) {
        showSuccess(`"${food.name}" logged to meal log!`);
      }
    } catch (err) {
      console.error("Error logging food:", err);
      showError("Failed to log food.");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      serving: "",
      numOfServings: "1",
      calories: "",
      protein: "",
      fat: "",
      carbs: "",
      mealType: "Breakfast",
    });
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* close */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>

            {/* messages - now with absolute positioning */}
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

            {/* ADD FOOD */}
            {modalType === "add" && (
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={[styles.modalContent, { flex: 1 }]}>
                  <Text style={styles.modalTitle}>Add Food</Text>
                  
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.label}>Food Name</Text>
                    <TextInput style={styles.input} value={form.name} onChangeText={(t) => handleChange("name", t)} />

                    <Text style={styles.label}>Serving Size</Text>
                    <TextInput style={styles.input} value={form.serving} onChangeText={(t) => handleChange("serving", t)} />

                    <Text style={styles.label}>Number of Servings</Text>
                    <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.numOfServings} onChangeText={(t) => handleChange("numOfServings", t)} />

                    <Text style={styles.label}>Calories (kcal)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.calories} onChangeText={(t) => handleChange("calories", t)} />

                    <Text style={styles.label}>Macros (g)</Text>
                    <View style={styles.macroRow}>
                      <View style={styles.macroInput}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.protein} onChangeText={(t) => handleChange("protein", t)} />
                      </View>
                      <View style={styles.macroInput}>
                        <Text style={styles.macroLabel}>Fat</Text>
                        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.fat} onChangeText={(t) => handleChange("fat", t)} />
                      </View>
                      <View style={styles.macroInput}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.carbs} onChangeText={(t) => handleChange("carbs", t)} />
                      </View>
                    </View>
                  </ScrollView>

                  <View style={{ marginTop: "auto" }}>
                    <TouchableOpacity style={styles.modalButton} onPress={handleSave}>
                      <Text style={{ fontWeight: "600" }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}

            {/* LIST */}
            {modalType === "list" && (
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>My Foods</Text>
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
                {myFoods.length === 0 ? (
                  <Text style={{ textAlign: "center", marginTop: 20 }}>No foods found</Text>
                ) : (
                  <FlatList
                    data={myFoods.filter((f) => f.name?.toLowerCase().includes(search.toLowerCase()))}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                      <View style={styles.listRow}>
                        <Text style={styles.index}>{index + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodName}>{item.name}</Text>
                          <Text style={styles.detail}>
                            {item.calories} kcal • {item.serving}
                          </Text>
                          <Text style={styles.macros}>
                            P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                          </Text>
                        </View>

                        {/* LOG */}
                        <TouchableOpacity
                          style={styles.logBtn}
                          onPress={() => {
                            setFoodToLog(item);
                            setLogModalVisible(true);
                          }}
                        >
                          <Text style={{ color: "black", fontSize: 14, fontWeight: "600" }}>Log</Text>
                        </TouchableOpacity>

                        {/* EDIT */}
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => {
                            setSelectedFood(item);
                            setForm(item);
                            setModalType("edit");
                          }}
                        >
                          <Text style={{ fontWeight: "600" }}>Edit</Text>
                        </TouchableOpacity>

                        {/* DELETE */}
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                          <Ionicons name="trash" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>
            )}

            {/* EDIT */}
            {modalType === "edit" && selectedFood && (
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={[styles.modalContent, { flex: 1 }]}>
                  <Text style={styles.modalTitle}>Edit Food</Text>
                  
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.label}>Food Name</Text>
                    <TextInput style={styles.input} value={form.name} onChangeText={(t) => handleChange("name", t)} />

                    <Text style={styles.label}>Serving Size</Text>
                    <TextInput style={styles.input} value={form.serving} onChangeText={(t) => handleChange("serving", t)} />

                    <Text style={styles.label}>Number of Servings</Text>
                    <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.numOfServings} onChangeText={(t) => handleChange("numOfServings", t)} />

                    <Text style={styles.label}>Calories (kcal)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.calories} onChangeText={(t) => handleChange("calories", t)} />

                    <Text style={styles.label}>Macros (g)</Text>
                    <View style={styles.macroRow}>
                      <View style={styles.macroInput}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.protein} onChangeText={(t) => handleChange("protein", t)} />
                      </View>
                      <View style={styles.macroInput}>
                        <Text style={styles.macroLabel}>Fat</Text>
                        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.fat} onChangeText={(t) => handleChange("fat", t)} />
                      </View>
                      <View style={styles.macroInput}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="done" value={form.carbs} onChangeText={(t) => handleChange("carbs", t)} />
                      </View>
                    </View>
                  </ScrollView>

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

      <LogMealModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        recipe={foodToLog}
        onLog={(recipe, mealType, servings) => LogToDiary(recipe, mealType, servings)}
      />
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
  foodName: {
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    fontSize: 13,
    color: "#555",
  },
  macros: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
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
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  macroInput: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    color: "#555",
  },
});