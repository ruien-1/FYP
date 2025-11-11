import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import API from "../../api/backend";

export default function RecipeTab() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  //fetch category from firestore
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/categories");
        setCategories(res.data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  // Define section titles
  const sectionOrder = ["Popular", "Healthy", "Diet", "Allergy"];
  const sectionTitles = {
    Popular: "Popular Categories",
    Healthy: "Healthy Categories",
    Diet: "Pick Your Diet",
    Allergy: "Allergy Preferences",
  };

  // Group categories by section title
  const grouped = categories.reduce((acc, cat) => {
    if (sectionOrder.includes(cat.section)) {
      if (!acc[cat.section]) acc[cat.section] = [];
      acc[cat.section].push(cat);
    }
    return acc;
  }, {});

  // Colors for section
  const sectionColors = {
    Popular: "#ffe2b6ff",
    Healthy: "#c3f8e9ff",
    Diet: "#cce5feff",
    Allergy: "#e4d8feff",
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Recipes</Text>

        {sectionOrder.map(
          (section) =>
            grouped[section] && (
              <View key={section} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {sectionTitles[section] || section}
                </Text>

                <View style={styles.grid}>
                  {grouped[section].map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.card,
                        { backgroundColor: sectionColors[section] || "#f1f2f6" },
                      ]}
                      onPress={() =>
                        navigation.navigate("RecipeList", { category: cat })
                      }
                    >
                      <Text style={styles.icon}>{cat.icon}</Text>
                      <Text style={styles.cardText}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  container: { padding: 16 },
  pageTitle: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "left",
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    minWidth: "40%",
    justifyContent: "center",
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  cardText: { fontSize: 14, fontWeight: "500", color: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
