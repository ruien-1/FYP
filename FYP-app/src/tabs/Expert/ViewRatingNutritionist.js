import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import API from "../../api/backend";

export default function ViewRatingNutritionist() {
  const navigation = useNavigation();
  const route = useRoute();
  const { nutritionistId, nutritionistName } = route.params;

  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setError(null);
      const response = await API.get(`/nutritionist/${nutritionistId}/ratings?limit=50`);
      
      if (response.data.success) {
        const sortedRatings = (response.data.ratings || []).sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA; 
        });
        setRatings(sortedRatings);
      } else {
        setError("Failed to fetch ratings");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRatings();
  };

  const renderStars = (rating) => {
    return "⭐".repeat(Math.floor(rating));
  };

  const formatDate = (date) => {
    if (!date) return "";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "";
      const options = { year: "numeric", month: "short", day: "numeric" };
      return dateObj.toLocaleDateString("en-US", options);
    } catch (e) {
      return "";
    }
  };

  const calculateAverageRating = () => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const RatingCard = ({ rating }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <View style={styles.starsRow}>
          <Text style={styles.starsText}>{renderStars(rating.rating)}</Text>
          <Text style={styles.ratingNumber}>{rating.rating}.0</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(rating.createdAt)}</Text>
      </View>
      {rating.userName && (
        <Text style={styles.userName}>By: {rating.userName}</Text>
      )}
      {rating.comment && rating.comment.trim() !== "" && (
        <Text style={styles.commentText}>{rating.comment}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reviews</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reviews</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {/* Summary Card */}
        {!error && (
          <View style={styles.summaryCard}>
            <Text style={styles.nutritionistNameText}>{nutritionistName}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.averageContainer}>
                <Text style={styles.averageRating}>
                  {calculateAverageRating()}
                </Text>
                <Text style={styles.outOf}>out of 5</Text>
              </View>
              <View style={styles.detailsContainer}>
                <Text style={styles.starsLarge}>
                  {renderStars(parseFloat(calculateAverageRating()))}
                </Text>
                <Text style={styles.totalReviews}>
                  {ratings.length} {ratings.length === 1 ? "Review" : "Reviews"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Reviews List */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>Error loading reviews</Text>
            <Text style={styles.errorDetails}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRatings}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : ratings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to leave a review!
            </Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            <Text style={styles.sectionTitle}>All Reviews</Text>
            {ratings.map((rating, index) => (
              <RatingCard key={rating.id || index} rating={rating} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backButton: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 25,
    fontWeight: "600",
    color: "#333",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  summaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  nutritionistNameText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  averageContainer: {
    alignItems: "center",
  },
  averageRating: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#007AFF",
  },
  outOf: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  detailsContainer: {
    alignItems: "center",
  },
  starsLarge: {
    fontSize: 20,
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  reviewsList: {
    marginBottom: 16,
  },
  ratingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsText: {
    fontSize: 16,
    marginRight: 6,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 6,
  },
  commentText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#7BA3FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
});