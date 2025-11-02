import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function CoachProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { coachId } = route.params;
  
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningCoach, setAssigningCoach] = useState(false);
  
  // Rating modal states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Get current user ID
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    fetchCoachProfile();
  }, []);

  const fetchCoachProfile = async () => {
    try {
      const response = await API.get(`/coach/${coachId}`);
      setCoach(response.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching coach profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const assignCoachAndChat = async () => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please login to start chatting.");
      return;
    }

    setAssigningCoach(true);

    try {
      console.log("Assigning coach to user...");
      
      // Call backend to assign coach
      const response = await API.post(`/user/${currentUserId}/assign-coach`, {
        coachId: coachId,
      });

      if (response.data.success) {
        console.log("Coach assigned successfully");
        
        // Navigate to chat screen
        navigation.navigate("CoachesChatScreen", { 
          coachId: coachId, 
          coachName: coach.name 
        });
      } else {
        Alert.alert("Error", response.data.error || "Failed to assign coach");
      }
    } catch (err) {
      console.error("Error assigning coach:", err);
      
      // Check if already assigned (if, just navigate to chat)
      if (err.response?.status === 200) {
        navigation.navigate("ChatScreen", { 
          coachId: coachId, 
          coachName: coach.name 
        });
      } else {
        Alert.alert(
          "Error", 
          err.response?.data?.error || "Failed to assign coach. Please try again."
        );
      }
    } finally {
      setAssigningCoach(false);
    }
  };

  const handleViewRatings = () => {
    navigation.navigate("ViewRatingCoach", { 
      coachId: coachId,
      coachName: coach.name 
    });
  };

  const handleOpenRatingModal = () => {
    if (!currentUserId) {
      Alert.alert("Authentication Required", "Please log in to rate this coach.");
      return;
    }
    setShowRatingModal(true);
    setSelectedRating(0);
    setRatingComment("");
  };

  const handleCloseRatingModal = () => {
    Keyboard.dismiss();
    setShowRatingModal(false);
    setSelectedRating(0);
    setRatingComment("");
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.");
      return;
    }

    if (!currentUserId) {
      Alert.alert("Authentication Required", "Please log in to submit a rating.");
      return;
    }

    Keyboard.dismiss();
    setSubmittingRating(true);
    try {
      const response = await API.post(`/coach/${coachId}/rating`, {
        rating: selectedRating,
        comment: ratingComment.trim(),
        userId: currentUserId,
      });

      Alert.alert("Success", "Thank you for your rating!");
      handleCloseRatingModal();
      // Refresh coach profile to get updated rating
      fetchCoachProfile();
    } catch (err) {
      console.error("Error submitting rating:", err);
      Alert.alert("Error", err.response?.data?.error || "Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderStars = (rating = 5) => {
    return "⭐".repeat(Math.floor(rating));
  };

  const renderRatingStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => setSelectedRating(star)}
        style={styles.starButton}
      >
        <Text style={styles.ratingStar}>
          {selectedRating >= star ? "⭐" : "☆"}
        </Text>
      </TouchableOpacity>
    ));
  };

  // Format availability object to readable string
  const formatAvailability = (availability) => {
    if (!availability) return "Contact for details";
    
    if (typeof availability === "string") {
      return availability;
    }
    
    // If it's an object with days
    if (typeof availability === "object") {
      const availableDays = Object.entries(availability)
        .filter(([day, isAvailable]) => isAvailable)
        .map(([day]) => day);
      
      if (availableDays.length === 0) {
        return "Contact for details";
      }
      
      return availableDays.join(", ");
    }
    
    return "Contact for details";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !coach) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Error loading profile</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchCoachProfile}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Not specified"}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Coach Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar and Rating Badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {coach.name?.charAt(0).toUpperCase() || "C"}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.ratingBadge}
              onPress={handleOpenRatingModal}
            >
              <Text style={styles.ratingBadgeIcon}>⭐</Text>
              <Text style={styles.ratingBadgeText}>Rate</Text>
            </TouchableOpacity>
          </View>

          {/* Name and Reviews */}
          <Text style={styles.coachName}>{coach.name || "Coach"}</Text>
          <TouchableOpacity 
            style={styles.reviewContainer}
            onPress={handleViewRatings}
          >
            <Text style={styles.stars}>{renderStars(coach.averageRating)}</Text>
            <Text style={styles.reviewText}>
              {coach.averageRating?.toFixed(1) || "5.0"} ({coach.totalRatings || "0"} Reviews)
            </Text>
            <Text style={styles.viewArrow}> →</Text>
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity 
            style={[styles.chatButton, assigningCoach && styles.chatButtonDisabled]} 
            onPress={assignCoachAndChat}
            disabled={assigningCoach}
          >
            {assigningCoach ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.chatIcon}>💬</Text>
                <Text style={styles.chatButtonText}>Chat Now</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Bio Section */}
          {coach.bio && (
            <View style={styles.section}>
              <InfoRow label="Bio" value={coach.bio} />
            </View>
          )}

          {/* Professional Details */}
          <View style={styles.section}>
            <InfoRow
              label="Highest Qualification"
              value={coach.credentials}
            />
            <InfoRow 
              label="Specialization" 
              value={coach.specializations?.join(", ")} 
            />
            <InfoRow label="Language" value={coach.languages} />
            <InfoRow label="Years of Experience" value={coach.yearsOfExperience?.toString()} />
            <InfoRow
              label="Availability"
              value={formatAvailability(coach.availability)}
            />
          </View>
        </View>

        {/* Services Section */}
        {coach.services && coach.services.length > 0 && (
          <View style={styles.servicesCard}>
            <Text style={styles.sectionTitle}>Services</Text>
            {coach.services.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Place of Practice */}
        {coach.placeOfPractice && (
          <View style={styles.placeCard}>
            <InfoRow label="Place of Practice" value={coach.placeOfPractice} />
          </View>
        )}

        {/* Additional Info */}
        {coach.gymName && (
          <View style={styles.placeCard}>
            <InfoRow label="Gym Name" value={coach.gymName} />
          </View>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseRatingModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={handleCloseRatingModal}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>

                {/* Modal Title */}
                <Text style={styles.modalTitle}>Rate</Text>

                {/* Rating Stars */}
                <Text style={styles.ratingLabel}>Your Rating</Text>
                <View style={styles.starsContainer}>
                  {renderRatingStars()}
                </View>

                {/* Comment Input */}
                <Text style={styles.commentLabel}>Comment (Optional)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your experience..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  textAlignVertical="top"
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    submittingRating && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingVertical: 12,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
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
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#D0E7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#007AFF",
  },
  ratingBadge: {
    position: "absolute",
    top: -4,
    right: "35%",
    backgroundColor: "#FFC107",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingBadgeIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  coachName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  reviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingVertical: 4,
  },
  stars: {
    fontSize: 14,
    marginRight: 6,
  },
  reviewText: {
    fontSize: 14,
    color: "#666",
  },
  viewArrow: {
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 4,
  },
  chatButton: {
    backgroundColor: "#7BA3FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  chatButtonDisabled: {
    opacity: 0.6,
  },
  chatIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  chatButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    marginTop: 8,
  },
  infoRow: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
  },
  servicesCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  serviceItem: {
    backgroundColor: "#E8F0FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 14,
    color: "#333",
  },
  placeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#E8F4FF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 1,
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "400",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  starButton: {
    marginHorizontal: 4,
  },
  ratingStar: {
    fontSize: 40,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    height: 100,
    fontSize: 15,
    color: "#333",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D0E7FF",
  },
  submitButton: {
    backgroundColor: "#7BA3FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});