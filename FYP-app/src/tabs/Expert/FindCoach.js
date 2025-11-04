// FindCoach.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import API from "../../api/backend";

export default function FindCoach() {
  const navigation = useNavigation();
  const [coaches, setCoaches] = useState([]);
  const [filteredCoaches, setFilteredCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards are expanded

  // Filter states - now arrays for multiple selection
  const [selectedSpecializations, setSelectedSpecializations] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState("");

  // Predefined lists from your signup pages
  const SPECIALIZATIONS = [
    "Weight Loss",
    "Muscle Building",
    "Strength Training",
    "Cardio Fitness",
    "Yoga & Flexibility",
    "HIIT Training",
    "Sports Performance",
    "Injury Rehabilitation",
    "CrossFit",
    "Senior Fitness",
  ];

  const SERVICES = [
    "1-on-1 Personal Training",
    "Group Training",
    "Online Coaching",
    "Workout Programming",
    "Nutrition Coaching",
    "Fitness Assessments",
    "Goal Setting & Tracking",
  ];

  useEffect(() => {
    fetchCoaches();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCoaches();
    }, [])
  );

  const fetchCoaches = async () => {
    try {
      const res = await API.get("/coaches");
      console.log("Fetched coaches:", res.data);
      setCoaches(res.data);
      
      // Reapply current filters to the new data
      applyFilters(searchQuery, selectedSpecializations, selectedServices, selectedExperience, res.data);
    } catch (err) {
      console.error("Error fetching coaches:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(text, selectedSpecializations, selectedServices, selectedExperience);
  };

  const toggleSpecialization = (spec) => {
    const newSelections = selectedSpecializations.includes(spec)
      ? selectedSpecializations.filter(s => s !== spec)
      : [...selectedSpecializations, spec];
    setSelectedSpecializations(newSelections);
  };

  const toggleService = (service) => {
    const newSelections = selectedServices.includes(service)
      ? selectedServices.filter(s => s !== service)
      : [...selectedServices, service];
    setSelectedServices(newSelections);
  };

  const toggleExpandCard = (coachId) => {
    setExpandedCards(prev => ({
      ...prev,
      [coachId]: !prev[coachId]
    }));
  };

  const applyFilters = (search, specializations, services, experience, dataSource = null) => {
    let filtered = [...(dataSource || coaches)];

    // Search filter
    if (search.trim() !== "") {
      filtered = filtered.filter(
        (coach) =>
          coach.name?.toLowerCase().includes(search.toLowerCase()) ||
          coach.specializations?.some((spec) =>
            spec.toLowerCase().includes(search.toLowerCase())
          ) ||
          coach.services?.some((serv) =>
            serv.toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    // Specialization filter - match ANY selected specialization
    if (specializations.length > 0) {
      filtered = filtered.filter((coach) =>
        specializations.some(spec => 
          coach.specializations?.includes(spec)
        )
      );
    }

    // Service filter - match ANY selected service
    if (services.length > 0) {
      filtered = filtered.filter((coach) =>
        services.some(service => 
          coach.services?.includes(service)
        )
      );
    }

    // Experience filter
    if (experience) {
      const expYears = parseInt(experience);
      filtered = filtered.filter(
        (coach) => parseInt(coach.yearsOfExperience) >= expYears
      );
    }

    setFilteredCoaches(filtered);
  };

  const handleApplyFilters = () => {
    applyFilters(searchQuery, selectedSpecializations, selectedServices, selectedExperience);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setSelectedSpecializations([]);
    setSelectedServices([]);
    setSelectedExperience("");
    applyFilters(searchQuery, [], [], "");
  };

  const renderStars = (rating) => {
    if (!rating || rating === 0) return "";
    return "⭐".repeat(Math.floor(rating));
  };

  const getActiveFilterCount = () => {
    return selectedSpecializations.length + selectedServices.length + (selectedExperience ? 1 : 0);
  };

  const renderSpecializations = (specializations, coachId) => {
    if (!specializations || specializations.length === 0) {
      return <Text style={styles.coachSpecialty}>Fitness Coaching</Text>;
    }

    const isExpanded = expandedCards[coachId];
    const displayedSpecs = isExpanded ? specializations : specializations.slice(0, 3);
    const hasMore = specializations.length > 3;

    return (
      <View>
        <Text style={styles.coachSpecialty} numberOfLines={isExpanded ? undefined : 2}>
          {displayedSpecs.join(", ")}
          {!isExpanded && hasMore && "..."}
        </Text>
        {hasMore && (
          <TouchableOpacity onPress={() => toggleExpandCard(coachId)}>
            <Text style={styles.viewMoreText}>
              {isExpanded ? "View less" : `View more (+${specializations.length - 3})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading coaches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Find A Coach</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#b3b1b1ff"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterIcon}>☰</Text>
          <Text style={styles.filterText}>Filter</Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {filteredCoaches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No coaches found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsText}>
              {filteredCoaches.length} coach
              {filteredCoaches.length !== 1 ? "es" : ""} found
            </Text>
            {filteredCoaches.map((coach) => (
              <View key={coach.id} style={styles.coachCard}>
                <View style={styles.coachInfo}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {coach.name?.charAt(0).toUpperCase() || "C"}
                    </Text>
                  </View>
                  <View style={styles.coachDetails}>
                    <Text style={styles.coachName}>{coach.name || "Coach"}</Text>
                    {renderSpecializations(coach.specializations, coach.id)}
                    <View style={styles.coachMetaRow}>
                      {coach.averageRating && coach.averageRating > 0 ? (
                        <>
                          <Text style={styles.coachRating}>
                            {renderStars(coach.averageRating)}
                          </Text>
                          <Text style={styles.ratingText}>
                            {coach.averageRating?.toFixed(1)}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.noReviewText}>No reviews yet</Text>
                      )}
                      {coach.yearsOfExperience && (
                        <Text style={styles.coachExperience}>
                          • {coach.yearsOfExperience} yrs exp
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() =>
                    navigation.navigate("CoachProfile", { coachId: coach.id })
                  }
                >
                  <Text style={styles.viewProfileText}>View →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Coaches</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Specialization Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Specialization</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsScrollContainer}
              >
                {SPECIALIZATIONS.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.filterChip,
                      selectedSpecializations.includes(spec) && styles.filterChipActive,
                    ]}
                    onPress={() => toggleSpecialization(spec)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedSpecializations.includes(spec) &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Services Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Services</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsScrollContainer}
              >
                {SERVICES.map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.filterChip,
                      selectedServices.includes(service) && styles.filterChipActive,
                    ]}
                    onPress={() => toggleService(service)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedServices.includes(service) && styles.filterChipTextActive,
                      ]}
                    >
                      {service}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Experience Filter */}
              <Text style={styles.filterLabel}>Minimum Experience</Text>
              <View style={styles.filterChipsContainer}>
                {["", "3", "5", "10"].map((exp) => (
                  <TouchableOpacity
                    key={exp || "all"}
                    style={[
                      styles.filterChip,
                      selectedExperience === exp && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedExperience(exp)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedExperience === exp &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {exp ? `${exp}+ years` : "Any"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>
                  Apply {getActiveFilterCount() > 0 ? `(${getActiveFilterCount()})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F0FF" },
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
    fontSize: 22,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  clearIcon: {
    fontSize: 18,
    color: "#999",
    paddingLeft: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#DDD",
    position: "relative",
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontWeight: "500",
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
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
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
    textAlign: "center",
  },
  coachCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  coachInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  avatarCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#D0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#007AFF",
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#333",
  },
  coachSpecialty: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  viewMoreText: {
    fontSize: 12,
    color: "#7BA3FF",
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 4,
  },
  coachMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  coachRating: {
    fontSize: 13,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  coachExperience: {
    fontSize: 11,
    color: "#888",
    marginLeft: 4,
  },
  noReviewText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  viewProfileButton: {
    backgroundColor: "#7BA3FF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  viewProfileText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  filterSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  filterChipsScrollContainer: {
    marginBottom: 8,
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    marginTop: 12,
  },
  filterChip: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#7BA3FF",
    borderColor: "#7BA3FF",
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#7BA3FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});