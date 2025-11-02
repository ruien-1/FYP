import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";
import CustomActivityModal from "./CustomActivityModal";
import AddActivityModal from "./AddActivityModal";

export default function ActivityPage({ route, navigation }) {
  const [query, setQuery] = useState("");
  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [savingId, setSavingId] = useState(null);
  

  // Modal states
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [customActivityModalVisible, setCustomActivityModalVisible] = useState(false);
  const [modalType, setModalType] = useState("add"); // "add" | "list" | "edit"
  const [editingActivity, setEditingActivity] = useState(null);

  // Custom activities state
  const [myActivities, setMyActivities] = useState([]);

  const selectedDate =
    route.params?.selectedDate || new Date().toISOString().split("T")[0];

  // Load default + custom activities
  useEffect(() => {
    loadDefaultActivities();
    loadMyActivities();
  }, []);

  const loadDefaultActivities = async () => {
    try {
      const res = await API.get("/activities"); // fetch from backend
      const formatted = res.data.map((a) => ({
        id: a.id,
        name: a.name,
        met: a.met,
      }));
      setActivities(formatted);
      setAllActivities(formatted);
    } catch (err) {
      console.error("❌ Error loading default activities:", err);
    }
  };

  const loadMyActivities = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        const res = await API.get(`/CustomActivity/${uid}`);
        setMyActivities(res.data || []);
      } catch (err) {
        console.error("❌ Error loading custom activities:", err);
      }
    }
  };

  // Search filter
  const searchExercise = (text) => {
    setQuery(text);
    if (text.length > 0) {
      const filtered = allActivities.filter((a) =>
        a.name.toLowerCase().includes(text.toLowerCase())
      );
      setActivities(filtered);
    } else {
      setActivities(allActivities);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activities</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.resultsBox}>
        {/* 🔍 Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.input}
            placeholder="Search activity (e.g. running)"
            value={query}
            onChangeText={searchExercise}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
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
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setEditingActivity(item);
                  setAddActivityModalVisible(true); // Open AddActivityModal
                }}
                disabled={savingId === item.id}
              >
                {savingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No activities found
            </Text>
          }
          style={styles.scrollBox}
        />

        {/* Bottom buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => {
              setModalType("add");
              setEditingActivity(null);
              setCustomActivityModalVisible(true); // Open CustomActivityModal
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#333" />
            <Text style={styles.bottomButtonText}>Add New Activity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => {
              setModalType("list");
              setEditingActivity(null);
              setCustomActivityModalVisible(true); // Open CustomActivityModal for list
            }}
          >
            <Ionicons name="list" size={18} color="#333" />
            <Text style={styles.bottomButtonText}>My Activities</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AddActivityModal */}
      <AddActivityModal
        visible={addActivityModalVisible}
        onClose={() => setAddActivityModalVisible(false)}
        selectedActivity={editingActivity}
        selectedDate={selectedDate}
      />

      {/* Custom Activity Modal */}
      <CustomActivityModal
        visible={customActivityModalVisible}
        onClose={() => setCustomActivityModalVisible(false)}
        modalType={modalType}
        setModalType={setModalType}
        selectedActivity={editingActivity}
        setSelectedActivity={setEditingActivity}
        selectedDate={selectedDate}
        uid={auth.currentUser?.uid}
        myActivities={myActivities}
        setMyActivities={setMyActivities}
        refreshActivities={loadMyActivities}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F0FF", padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  input: { flex: 1, marginLeft: 8, fontSize: 16 },
  resultsBox: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 16,
    maxHeight: 350,
  },
  scrollBox: { flexGrow: 0, maxHeight: 180, marginBottom: 12 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F7FB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  cardLeft: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textTransform: "capitalize",
  },
  cardInfo: { fontSize: 14, color: "#666", marginTop: 4 },
  cardCalories: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "bold",
    marginTop: 4,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 4,
  },
  bottomButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
});
