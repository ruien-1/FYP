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
import { cancelMealReminderNotifications } from "../Home/notificationService";
import LogMealModal from "./LogMealModal";

export default function CustomRecipeModal({
  modalVisible,
  setModalVisible,
  modalType,
  setModalType,
  myRecipes = [],
  setMyRecipes,
  selectedRecipe,
  setSelectedRecipe,
  uid,
}) {
  const [form, setForm] = useState({
    recipename: "",
    ingredients: "",
    instructions: "",
    calories: "",
    proteins: "",
    fats: "",
    carbs: "",
  });

  const [search, setSearch] = useState("");
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchRecipes = async () => {
      if (modalVisible && modalType === "list" && uid) {
        try {
          const res = await API.get(`/CustomRecipe/${uid}`);
          setMyRecipes(res.data || []);
        } catch (err) {
          setMyRecipes([]);
          showError("Failed to fetch recipes.");
        }
      }
    };
    fetchRecipes();
  }, [modalVisible, modalType, uid]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 2000);
  };
  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 2000);
  };

  const LogToDiary = async (recipe, mealType, servings) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      const today = new Date().toISOString().split("T")[0];
      const mealLog = {
        mealType: mealType || "Lunch",
        date: today,
        food: recipe.recipename,
        servingSize: "1 serving",
        servings: servings || 1,
        calories: (Number(recipe.calories) || 0) * (servings || 1),
        protein: (Number(recipe.proteins) || 0) * (servings || 1),
        carbs: (Number(recipe.carbs) || 0) * (servings || 1),
        fats: (Number(recipe.fats) || 0) * (servings || 1),
        source: "customRecipe",
        recipeId: recipe.recipeid,
      };

      const postRes = await API.post(`/meals_log/${uid}`, mealLog);
      if (postRes.data.success) {
        if (today === new Date().toISOString().split("T")[0]) {
          cancelMealReminderNotifications();
        }
        showSuccess(`"${recipe.recipename}" logged to diary!`);
        setLogModalVisible(false);
      }
    } catch (err) {
      showError("Failed to log recipe to diary.");
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

const handleSave = async () => {
  if (!form.recipename.trim()) {
    showError("Recipe name is required.");
    return;
  }
  if (!form.ingredients.trim()) {
    showError("Ingredients are required.");
    return;
  }

  const cleanedForm = {
    ...form,
    title: form.recipename,
    calories:
      form.calories.trim() === "" ? 0 : parseFloat(form.calories),
    proteins:
      form.proteins.trim() === "" ? 0 : parseFloat(form.proteins),
    fats:
      form.fats.trim() === "" ? 0 : parseFloat(form.fats),
    carbs:
      form.carbs.trim() === "" ? 0 : parseFloat(form.carbs),
  };

  try {
    const res = await API.post(`/CustomRecipe/${uid}`, cleanedForm);
    setMyRecipes((prev) => [...prev, res.data.recipe]);
    showSuccess("Recipe added successfully!");
    resetForm();
  } catch (err) {
    showError("Failed to add recipe.");
  }
};

const handleUpdate = async () => {
  if (!form.recipename.trim()) {
    showError("Recipe name is required.");
    return;
  }
  if (!form.ingredients.trim()) {
    showError("Ingredients are required.");
    return;
  }

  const cleanedForm = {
    ...form,
    calories:
      form.calories.trim() === "" ? 0 : parseFloat(form.calories),
    proteins:
      form.proteins.trim() === "" ? 0 : parseFloat(form.proteins),
    fats:
      form.fats.trim() === "" ? 0 : parseFloat(form.fats),
    carbs:
      form.carbs.trim() === "" ? 0 : parseFloat(form.carbs),
  };

  try {
    await API.put(`/CustomRecipe/${uid}/${selectedRecipe.recipeid}`, cleanedForm);
    setMyRecipes((prev) =>
      prev.map((r) =>
        r.recipeid === selectedRecipe.recipeid ? { ...r, ...cleanedForm } : r
      )
    );
    showSuccess("Recipe updated successfully!");
    setModalType("list");
  } catch (err) {
    showError("Failed to update recipe.");
  }
};


  const handleDelete = async (recipeid) => {
    try {
      await API.delete(`/CustomRecipe/${uid}/${recipeid}`);
      setMyRecipes((prev) => prev.filter((r) => r.recipeid !== recipeid));
      showSuccess("Recipe deleted successfully!");
    } catch (err) {
      showError("Failed to delete recipe.");
    }
  };

  const resetForm = () => {
    setForm({
      recipename: "",
      ingredients: "",
      instructions: "",
      calories: "",
      proteins: "",
      fats: "",
      carbs: "",
    });
  };

  return (
    <Modal animationType="fade" transparent={true} visible={modalVisible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                resetForm();
                setModalVisible(false);
              }}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>

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

            {/* LIST MODE */}
            {modalType === "list" && (
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>List Of My Recipes</Text>

                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    placeholderTextColor="#888"
                    value={search}
                    onChangeText={(t) => setSearch(t)}
                  />
                </View>

                {myRecipes.length === 0 ? (
                  <Text style={{ textAlign: "center", marginTop: 20 }}>No recipes found</Text>
                ) : (
                  <FlatList
                    data={myRecipes.filter((r) =>
                      r.recipename?.toLowerCase().includes(search.toLowerCase())
                    )}
                    keyExtractor={(item) => item.recipeid}
                    renderItem={({ item, index }) => (
                      <View style={styles.listRow}>
                        <Text style={styles.index}>{index + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityName}>{item.recipename}</Text>
                          <Text style={styles.detail}>{item.calories} kcal</Text>
                        </View>

                        {/* 👁 View icon */}
                        <TouchableOpacity
                          style={styles.viewBtn}
                          onPress={() => {
                            setSelectedRecipe(item);
                            setViewModalVisible(true);
                          }}
                        >
                          <Ionicons name="eye-outline" size={20} color="black" />
                        </TouchableOpacity>

                        {/* 🍴 Log */}
                        <TouchableOpacity
                          style={styles.logBtn}
                          onPress={() => {
                            setSelectedRecipe(item);
                            setLogModalVisible(true);
                          }}
                        >
                          <Ionicons name="restaurant-outline" size={18} color="black" />
                        </TouchableOpacity>

                        {/* Edit */}
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => {
                            setSelectedRecipe(item);
                            setForm(item);
                            setModalType("edit");
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "600" }}>Edit</Text>
                        </TouchableOpacity>

                        {/* 🗑 Delete */}
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(item.recipeid)}
                        >
                          <Ionicons name="trash" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>
            )}

            {/* ADD + EDIT MODALS */}
            {modalType === "add" || modalType === "edit" ? (
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={[styles.modalContent, { flex: 1 }]}>
                  <Text style={styles.modalTitle}>
                    {modalType === "add" ? "Add My Recipe" : "Edit My Recipe"}
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>Recipe Name</Text>
                    <TextInput
                      style={styles.input}
                      value={form.recipename}
                      onChangeText={(t) => handleChange("recipename", t)}
                    />

                    <Text style={styles.label}>Ingredients</Text>
                    <TextInput
                      style={[styles.input, { height: 60 }]}
                      multiline
                      value={form.ingredients}
                      onChangeText={(t) => handleChange("ingredients", t)}
                    />

                    <Text style={styles.label}>Instructions</Text>
                    <TextInput
                      style={[styles.input, { height: 60 }]}
                      multiline
                      value={form.instructions}
                      onChangeText={(t) => handleChange("instructions", t)}
                    />

                    <Text style={[styles.label, { marginTop: 10 }]}>Nutrition Per Serving</Text>
                    <View style={styles.nutritionRow}>
                      {[
                        { label: "Calories", key: "calories" },
                        { label: "Protein", key: "proteins" },
                        { label: "Fats", key: "fats" },
                        { label: "Carbs", key: "carbs" },
                      ].map((nut, i) => (
                        <View style={styles.nutritionBox} key={i}>
                          <TextInput
                            style={styles.nutritionInput}
                            keyboardType="numeric"
                            value={form[nut.key]}
                            onChangeText={(t) => handleChange(nut.key, t)}
                          />
                          <Text style={styles.nutritionLabel}>{nut.label}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Bottom buttons */}
                  <View style={{ marginTop: 15 }}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={modalType === "add" ? handleSave : handleUpdate}
                    >
                      <Text style={{ fontWeight: "600" }}>
                        {modalType === "add" ? "Save" : "Update"}
                      </Text>
                    </TouchableOpacity>

                    {modalType === "edit" && (
                      <TouchableOpacity
                        style={[styles.modalButton, { marginTop: 10 }]}
                        onPress={() => {
                          resetForm();
                          setModalType("list");
                        }}
                      >
                        <Text style={{ fontWeight: "600" }}>Back</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            ) : null}
          </View>
        </View>

        {/* Sub Modals */}
        <LogMealModal
          visible={logModalVisible}
          onClose={() => setLogModalVisible(false)}
          recipe={selectedRecipe}
          onLog={(recipe, mealType, servings) => LogToDiary(recipe, mealType, servings)}
        />

        <RecipeDetailsModal
          visible={viewModalVisible}
          onClose={() => setViewModalVisible(false)}
          recipe={selectedRecipe}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ───────────────────────────────
    Recipe Details Modal
──────────────────────────────── */
function RecipeDetailsModal({ visible, onClose, recipe }) {
  if (!recipe) return null;
  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.detailsOverlay}>
        <View style={styles.detailsContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.detailsTitle}>{recipe.recipename}</Text>

            <Text style={styles.detailsSection}>🧂 Ingredients</Text>
            <Text style={styles.detailsText}>{recipe.ingredients || "N/A"}</Text>

            <Text style={styles.detailsSection}>👩‍🍳 Instructions</Text>
            <Text style={styles.detailsText}>{recipe.instructions || "N/A"}</Text>

            <Text style={styles.detailsSection}>🍽 Nutrition (per serving)</Text>
            <View style={styles.nutritionInfoBox}>
              <Text>Calories: {recipe.calories || 0} kcal</Text>
              <Text>Protein: {recipe.proteins || 0} g</Text>
              <Text>Fats: {recipe.fats || 0} g</Text>
              <Text>Carbs: {recipe.carbs || 0} g</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────────────────────
    Styles
──────────────────────────────── */
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: {
    height: "70%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  closeBtn: { alignSelf: "flex-end" },
  modalTitle: { fontSize: 25, fontWeight: "700", marginBottom: 15 },
  modalContent: { flex: 1 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
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
  index: { fontWeight: "bold", marginRight: 6 },
  activityName: { fontSize: 16, fontWeight: "600" },
  detail: { fontSize: 13, color: "#555" },
  editBtn: {
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  deleteBtn: { backgroundColor: "red", padding: 6, borderRadius: 6 },
  logBtn: {
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  viewBtn: {
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  nutritionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  nutritionBox: { flex: 1, alignItems: "center", marginHorizontal: 4 },
  nutritionInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 6,
    textAlign: "center",
    marginBottom: 4,
  },
  nutritionLabel: { fontSize: 11, color: "#333", textAlign: "center" },
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
  },
  errorMsg: {
    backgroundColor: "#f8d7da",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  messageText: { color: "#155724", fontWeight: "600", textAlign: "center", fontSize: 14 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 16, color: "#000" },
  detailsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" },
  detailsContainer: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 15,
    padding: 20,
    maxHeight: "80%",
  },
  detailsTitle: { fontSize: 22, fontWeight: "700", marginBottom: 15, textAlign: "center" },
  detailsSection: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  detailsText: { fontSize: 14, color: "#444", marginTop: 4 },
  nutritionInfoBox: {
    backgroundColor: "#E8F2FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
});
