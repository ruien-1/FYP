import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";

export default function RecipeDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params || {};

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  //fetch recipe detail
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await API.get(`/recipeDetails/${id}`);
        setRecipe(res.data);
      } catch (err) {
        console.error("Error fetching recipe detail:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text>Recipe not found</Text>
      </SafeAreaView>
    );
  }

    // for instructions display
    let steps = [];
    if (recipe.instructions) {
      let cleaned = recipe.instructions.replace(/<[^>]+>/g, "").trim();

      // Remove leading "Instructions" if it exists
      cleaned = cleaned.replace(/^instructions[:\-]?\s*/i, "");

      if (/^\d+\./.test(cleaned)) {
        // If instructions already numbered
        steps = cleaned
          .split(/\s*\d+\.\s*/) // split by 1. 2. 3.
          .filter((s) => s.trim().length > 0);
      } else {
        // If instruction is plain sentences
        steps = cleaned
          .replace(/([.?!])(?=[A-Z])/g, "$1 ") // fix missing spaces
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.trim().length > 0);
      }

      // remove any standalone "Instructions" steps
      steps = steps.filter(
        (s) => !/^instructions?$/i.test(s.trim())
      );
    }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#E8F0FF" }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#000000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Details</Text>
        <View style={{ width: 26 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Recipe Image */}
        <Image source={{ uri: recipe.image }} style={styles.image} />

        {/* Title */}
        <Text style={styles.title}>{recipe.title}</Text>

        {/* Nutrition Summary */}
        <View style={styles.nutritionBox}>
          <Text style={styles.nutritionText}>Calories: {recipe.calories} kcal</Text>
          <Text style={styles.nutritionText}>Protein: {recipe.protein} g</Text>
          <Text style={styles.nutritionText}>Carbs: {recipe.carbs} g</Text>
          <Text style={styles.nutritionText}>Fat: {recipe.fat} g</Text>
        </View>

        {/* Ingredients */}
        <Text style={styles.section}>🛒 Ingredients</Text>
        <View style={styles.listBox}>
          {(recipe.ingredients || []).map((ing, index) => (
            <Text key={index} style={styles.listItem}>
              • {ing}
            </Text>
          ))}
        </View>

        {/* Instructions */}
        <Text style={styles.section}>👩‍🍳 Instructions</Text>
        <View style={styles.instructionsBox}>
          {steps.length > 0 ? (
            steps.map((step, index) => (
              <Text key={index} style={styles.instructionStep}>
                {index + 1}. {step.trim()}
              </Text>
            ))
          ) : (
            <Text style={styles.instructionsText}>
              No instructions available.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "600",
    color: "#000",
  },
  image: { width: "100%", height: 240, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 25, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  nutritionBox: {
    backgroundColor: "#f5f7fa",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  nutritionText: { fontSize: 15, marginBottom: 4 },
  section: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  listBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  listItem: { fontSize: 15, marginBottom: 6 },
  instructionsBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 30,
  },
  instructionStep: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  instructionsText: { fontSize: 15, lineHeight: 22 },
});
