import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";

export default function FilterModal({
  visible,
  onClose,
  selectedFilters,
  setSelectedFilters,
  setFilteredResults,
}) {
  const [filterOptions, setFilterOptions] = useState({
    popular: [],
    diets: [],
    intolerances: [],
  });

  // fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await API.get("/filteroptions");
        setFilterOptions(res.data || { popular: [], diets: [], intolerances: [] });
      } catch (err) {
      }
    };
    fetchFilterOptions();
  }, []);

  // use for the filter button 
  const toggleTag = (type, value) => {
    setSelectedFilters((prev) => {
      const exists = prev[type].includes(value);
      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((item) => item !== value)
          : [...prev[type], value],
      };
    });
  };

  // apply filter
  const applyFilters = async () => {
    try {
      const params = {
        diets: selectedFilters.diets.join(","),
        intolerances: selectedFilters.intolerances.join(","),
        categories: selectedFilters.popular.join(","),
        minCalories: selectedFilters.calories.min,
        maxCalories: selectedFilters.calories.max,
        minReadyTime: selectedFilters.time.min,
        maxReadyTime: selectedFilters.time.max,
      };

      const res = await API.get("/recipes/filter", { params });
      const data = res.data || [];

      // Store results with appropriate section name
      const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

      if (selectedFilters.intolerances.length === 1) {
        const intol = selectedFilters.intolerances[0];
        setFilteredResults({ [capitalize(intol)]: data });
      } else if (selectedFilters.intolerances.length > 1) {
        const results = {};
        selectedFilters.intolerances.forEach((intol) => {
          results[capitalize(intol)] = data;
        });
        setFilteredResults(results);
      } else if (selectedFilters.diets.length === 1) {
        const diet = selectedFilters.diets[0];
        setFilteredResults({ [capitalize(diet)]: data });
      } else if (selectedFilters.diets.length > 1) {
        const results = {};
        selectedFilters.diets.forEach((diet) => {
          results[capitalize(diet)] = data;
        });
        setFilteredResults(results);
      } else if (selectedFilters.popular.length === 1) {
        const cat = selectedFilters.popular[0];
        setFilteredResults({ [capitalize(cat)]: data });
      } else if (selectedFilters.popular.length > 1) {
        const results = {};
        selectedFilters.popular.forEach((cat) => {
          results[capitalize(cat)] = data;
        });
        setFilteredResults(results);
      } else {
        setFilteredResults({ Filtered: data });
      }
    } catch (err) {
      setFilteredResults({});
    } finally {
      onClose();
    }
  };

  // clear filter
  const clearFilters = () => {
    setSelectedFilters({
      popular: [],
      calories: { min: "", max: "" },
      time: { min: "", max: "" },
      diets: [],
      intolerances: [],
    });
    setFilteredResults(null);
    onClose();
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Recipes</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Popular */}
            <Text style={styles.sectionTitle}>Popular Filters</Text>
            <View style={styles.rowWrap}>
              {filterOptions.popular.map((f) => {
                const selected = selectedFilters.popular.includes(f.value);
                return (
                  <TouchableOpacity
                    key={`popular-${f.value}`}
                    style={[styles.tag, selected && styles.tagSelected]}
                    onPress={() => toggleTag("popular", f.value)}
                  >
                    <Text style={selected ? styles.tagTextSelected : styles.tagText}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calories */}
            <Text style={styles.sectionTitle}>By Calories</Text>
            <View style={styles.rangeRow}>
              <TextInput
                style={styles.rangeInput}
                keyboardType="numeric"
                value={selectedFilters.calories.min}
                onChangeText={(val) =>
                  setSelectedFilters((p) => ({ ...p, calories: { ...p.calories, min: val } }))
                }
              />
              <Text style={{ marginHorizontal: 6 }}>To</Text>
              <TextInput
                style={styles.rangeInput}
                keyboardType="numeric"
                value={selectedFilters.calories.max}
                onChangeText={(val) =>
                  setSelectedFilters((p) => ({ ...p, calories: { ...p.calories, max: val } }))
                }
              />
            </View>

            {/* Cooking Time */}
            <Text style={styles.sectionTitle}>By Cooking Time (min)</Text>
            <View style={styles.rangeRow}>
              <TextInput
                style={styles.rangeInput}
                keyboardType="numeric"
                value={selectedFilters.time.min}
                onChangeText={(val) =>
                  setSelectedFilters((p) => ({ ...p, time: { ...p.time, min: val } }))
                }
              />
              <Text style={{ marginHorizontal: 6 }}>To</Text>
              <TextInput
                style={styles.rangeInput}
                keyboardType="numeric"
                value={selectedFilters.time.max}
                onChangeText={(val) =>
                  setSelectedFilters((p) => ({ ...p, time: { ...p.time, max: val } }))
                }
              />
            </View>

            {/* Diet */}
            <Text style={styles.sectionTitle}>Diet</Text>
            <View style={styles.rowWrap}>
              {filterOptions.diets.map((diet) => {
                const selected = selectedFilters.diets.includes(diet.value);
                return (
                  <TouchableOpacity
                    key={`diet-${diet.value}`}
                    style={[styles.tag, selected && styles.tagSelected]}
                    onPress={() => toggleTag("diets", diet.value)}
                  >
                    <Text style={selected ? styles.tagTextSelected : styles.tagText}>{diet.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Intolerances */}
            <Text style={styles.sectionTitle}>Food Intolerances</Text>
            <View style={styles.rowWrap}>
              {filterOptions.intolerances.map((item) => {
                const selected = selectedFilters.intolerances.includes(item.value);
                return (
                  <TouchableOpacity
                    key={`intolerance-${item.value}`}
                    style={[styles.tag, selected && styles.tagSelected]}
                    onPress={() => toggleTag("intolerances", item.value)}
                  >
                    <Text style={selected ? styles.tagTextSelected : styles.tagText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Buttons */}
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, styles.clearBtn]} onPress={clearFilters}>
              <Text style={styles.clearText}>Clear Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "bold" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginVertical: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
    margin: 4,
  },
  tagSelected: { backgroundColor: "#007AFF" },
  tagText: { color: "#000" },
  tagTextSelected: { color: "#fff" },
  rangeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  rangeInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 8,
    width: 70,
    textAlign: "center",
  },
  applyBtn: {
    backgroundColor: "#E0EFFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  applyText: { fontWeight: "600" },
  clearBtn: { backgroundColor: "#FFDADA" },
  clearText: { color: "red", fontWeight: "600" },
});
