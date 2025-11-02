import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";

const MySubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchSubmissions = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      const response = await API.get(`/QRFood/${uid}`);
      const data = Array.isArray(response.data) ? response.data : [];
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  const getStatusConfig = (status) => {
    const statusLower = status ? String(status).toLowerCase() : "pending";
    
    switch (statusLower) {
      case "approved":
        return {
          color: "#10b981",
          backgroundColor: "#d1fae5",
          label: "Approved",
          icon: "checkmark-circle",
        };
      case "rejected":
        return {
          color: "#ef4444",
          backgroundColor: "#fee2e2",
          label: "Rejected",
          icon: "close-circle",
        };
      case "pending_verification":
      case "pending":
      default:
        return {
          color: "#f59e0b",
          backgroundColor: "#fef3c7",
          label: "Pending Review",
          icon: "time",
        };
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return "Unknown date";
      
      let date;
      
      // Handle Firestore timestamp with _seconds (from your backend)
      if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      }
      // Handle Firestore timestamp with seconds (standard format)
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Handle regular timestamp or date string
      else {
        date = new Date(timestamp);
      }
      
      // Verify the date is valid
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const renderSubmissionCard = ({ item }) => {
    const productName = item?.productName ? String(item.productName) : "Unknown Product";
    const barcode = item?.barcode ? String(item.barcode) : "No Barcode";
    const statusConfig = getStatusConfig(item?.status);
    
    // Safely handle nutrition values
    const caloriesValue = item?.calories != null ? String(item.calories) : null;
    const proteinValue = item?.protein != null ? String(item.protein) : null;
    const fatValue = item?.fat != null ? String(item.fat) : null;
    const carbsValue = item?.carbs != null ? String(item.carbs) : null;

    return (
      <View style={styles.submissionCard}>
        {/* Header with Product Name and Status */}
        <View style={styles.cardHeader}>
          <View style={styles.productNameContainer}>
            <Text style={styles.productName} numberOfLines={2}>
              {productName}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.backgroundColor },
            ]}
          >
            <Ionicons
              name={statusConfig.icon}
              size={14}
              color={statusConfig.color}
            />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Barcode */}
        <View style={styles.infoRow}>
          <Ionicons name="barcode-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Barcode:</Text>
          <Text style={styles.infoValue}>{barcode}</Text>
        </View>

        {/* Nutrition Information */}
        <View style={styles.nutritionContainer}>
          <Text style={styles.nutritionTitle}>Nutrition Information (per 100g)</Text>
          
          <View style={styles.nutritionGrid}>
            {/* Calories */}
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>
                {caloriesValue ? `${caloriesValue} kcal` : "N/A"}
              </Text>
            </View>

            {/* Protein */}
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>
                {proteinValue ? `${proteinValue}g` : "N/A"}
              </Text>
            </View>

            {/* Fat */}
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>
                {fatValue ? `${fatValue}g` : "N/A"}
              </Text>
            </View>

            {/* Carbs */}
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>
                {carbsValue ? `${carbsValue}g` : "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Submission Date */}
        {item?.createdAt && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#999" />
            <Text style={styles.dateText}>
              Submitted: {formatDate(item.createdAt)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={80} color="#e0e0e0" />
        <Text style={styles.emptyTitle}>No Submissions Yet</Text>
        <Text style={styles.emptySubtitle}>
          When you scan a barcode and the product is not found, you can submit
          the product information for verification.
        </Text>
        <Text style={styles.emptyHint}>
          Your submissions will appear here and you can track their approval
          status.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Submissions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {submissions.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={submissions}
          renderItem={renderSubmissionCard}
          keyExtractor={(item, index) => {
            if (item?.id) return String(item.id);
            if (item?.barcode) return String(item.barcode) + index;
            return String(index);
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4A90E2"]}
              tintColor="#4A90E2"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default MySubmissions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F2FF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  headerSpacer: {
    width: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  submissionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  productNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  nutritionContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: "45%",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },
});