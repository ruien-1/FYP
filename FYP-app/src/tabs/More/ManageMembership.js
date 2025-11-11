import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ManageMembership() {
  const navigation = useNavigation();
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlanChangeConfirm, setShowPlanChangeConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Membership data
  const [planType, setPlanType] = useState("monthly");
  const [renewalDate, setRenewalDate] = useState(null);
  const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);

  // Change Plan
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  // Payment fields (not used anymore - will navigate to CheckoutScreen)
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  // Fetch membership data
  const fetchMembershipData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "user", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        ("ManageMembership - User data:", {
          planType: data.planType,
          renewalDate: data.renewalDate,
          renewalDateType: typeof data.renewalDate,
          subscriptionCancelled: data.subscriptionCancelled,
          membership: data.membership
        });
        
        setPlanType(data.planType || "monthly");
        
        // Handle renewalDate - could be ISO string, Firestore Timestamp, or null
        let renewalDateValue = null;
        if (data.renewalDate) {
          if (typeof data.renewalDate === 'string') {
            renewalDateValue = data.renewalDate;
          } else if (data.renewalDate?.toDate && typeof data.renewalDate.toDate === 'function') {
            renewalDateValue = data.renewalDate.toDate().toISOString();
          } else if (data.renewalDate instanceof Date) {
            renewalDateValue = data.renewalDate.toISOString();
          } else {
            try {
              renewalDateValue = new Date(data.renewalDate).toISOString();
            } catch (e) {
            }
          }
        } else if (data.premiumActivatedAt && data.planType) {
          try {
            let activatedDate;
            if (typeof data.premiumActivatedAt === 'string') {
              activatedDate = new Date(data.premiumActivatedAt);
            } else if (data.premiumActivatedAt?.toDate && typeof data.premiumActivatedAt.toDate === 'function') {
              activatedDate = data.premiumActivatedAt.toDate();
            } else {
              activatedDate = new Date(data.premiumActivatedAt);
            }
            
            const renewal = new Date(activatedDate);
            if (data.planType === "monthly") {
              renewal.setMonth(renewal.getMonth() + 1);
            } else if (data.planType === "yearly") {
              renewal.setFullYear(renewal.getFullYear() + 1);
            }
            renewalDateValue = renewal.toISOString();
            
            const currentUser = auth.currentUser;
            if (currentUser) {
              const userRef = doc(db, "user", currentUser.uid);
              updateDoc(userRef, { renewalDate: renewalDateValue }).catch(err => {
              });
            }
          } catch (e) {
          }
        }
        setRenewalDate(renewalDateValue);
        setSubscriptionCancelled(data.subscriptionCancelled || false);
        setSelectedPlan(data.planType || "monthly");
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchMembershipData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchMembershipData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Membership</Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Current Plan */}
            <View style={styles.planBox}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Current Plan</Text>
                <View style={styles.premiumTag}>
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              </View>
              <Text style={styles.planDetails}>
                {planType === "monthly" ? "Monthly Plan · $8.99 / month" : "Yearly Plan · $92.00 / year"}
              </Text>
              {subscriptionCancelled ? (
                <Text style={styles.planRenewal}>
                  {renewalDate ? `Access until ${formatRenewalDate(renewalDate)}` : "Subscription cancelled"}
                </Text>
              ) : (
                <Text style={styles.planRenewal}>
                  {renewalDate ? `Renews on ${formatRenewalDate(renewalDate)}` : "No renewal date set"}
                </Text>
              )}
            </View>

            {/* Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>

              <TouchableOpacity
                style={styles.optionBox}
                onPress={() => setShowChangePlan(true)}
              >
                <Ionicons name="repeat-outline" size={22} color="#445A86" />
                <Text style={styles.optionText}>Change Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionBox}
                onPress={() => {
                  // Navigate to CheckoutScreen similar to UpgradePremium
                  navigation.navigate("CheckoutScreen", { 
                    selectedPlan: planType,
                    isUpdatingPayment: true 
                  });
                }}
              >
                <Ionicons name="card-outline" size={22} color="#445A86" />
                <Text style={styles.optionText}>Update Payment Method</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBox, styles.cancelBox]}
                onPress={() => setShowCancelModal(true)}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color="#b00020"
                />
                <Text style={[styles.optionText, { color: "#b00020" }]}>
                  Cancel Subscription
                </Text>
              </TouchableOpacity>
            </View>

            {/* Benefits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Benefits</Text>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✅</Text>
                <Text style={styles.benefitText}>
                  Unlimited access to all features
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✅</Text>
                <Text style={styles.benefitText}>Advanced Tracking Tool</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✅</Text>
                <Text style={styles.benefitText}>Personalized Recommendations</Text>
              </View>
            </View>
          </ScrollView>

          {/* Change Plan Modal */}
          <Modal visible={showChangePlan} animationType="fade" transparent>
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Change Plan</Text>

                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      selectedPlan === "monthly" && styles.activePlan,
                    ]}
                    onPress={() => setSelectedPlan("monthly")}
                  >
                    <Text style={styles.planOptionText}>Monthly - $8.99</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      selectedPlan === "yearly" && styles.activePlan,
                    ]}
                    onPress={() => setSelectedPlan("yearly")}
                  >
                    <Text style={styles.planOptionText}>Yearly - $92.00</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={() => {
                      if (selectedPlan === planType) {
                        Alert.alert("Info", "You are already on this plan.");
                        setShowChangePlan(false);
                        return;
                      }
                      setShowChangePlan(false);
                      setShowPlanChangeConfirm(true);
                    }}
                  >
                    <Text style={styles.saveButtonText}>Confirm Plan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowChangePlan(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Plan Change Confirmation Modal */}
          <Modal visible={showPlanChangeConfirm} animationType="fade" transparent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Plan Change Notice</Text>
                  <Text style={styles.confirmMessage}>
                    Your plan will only be changed when it's time for the next payment. 
                    You will continue on your current plan until {renewalDate ? formatRenewalDate(renewalDate) : "the renewal date"}.
                  </Text>
                  <Text style={styles.confirmMessage}>
                    New plan: {selectedPlan === "monthly" ? "Monthly - $8.99/month" : "Yearly - $92.00/year"}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={async () => {
                      try {
                        setIsLoading(true);
                        const user = auth.currentUser;
                        if (!user) {
                          Alert.alert("Error", "User not authenticated");
                          setIsLoading(false);
                          return;
                        }

                        const now = new Date();
                        const newRenewalDate = new Date(now);
                        if (selectedPlan === "monthly") {
                          newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
                        } else if (selectedPlan === "yearly") {
                          newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
                        }

                        const userRef = doc(db, "user", user.uid);
                        await updateDoc(userRef, {
                          pendingPlanType: selectedPlan,
                          pendingRenewalDate: newRenewalDate.toISOString(),
                        });

                        Alert.alert(
                          "Success",
                          "Your plan change has been scheduled. It will take effect on your next renewal date.",
                          [
                            {
                              text: "OK",
                              onPress: () => {
                                setShowPlanChangeConfirm(false);
                                fetchMembershipData();
                              },
                            },
                          ]
                        );
                      } catch (error) {
                        Alert.alert("Error", "Failed to update plan. Please try again.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowPlanChangeConfirm(false)}
                  >
                    <Text style={styles.closeButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>


          {/* Cancel Subscription Modal */}
          <Modal visible={showCancelModal} animationType="fade" transparent>
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Cancel Subscription</Text>
                  <Text style={{ marginBottom: 16, color: "#444" }}>
                    {renewalDate
                      ? (() => {
                          // Calculate access end date (day before renewal date)
                          const renewal = new Date(renewalDate);
                          const accessEnd = new Date(renewal);
                          accessEnd.setDate(accessEnd.getDate() - 1);
                          return `Your subscription will be cancelled, but you'll retain premium access until ${formatRenewalDate(accessEnd.toISOString())}. After that date, you'll lose access to premium features.`;
                        })()
                      : "Your subscription will be cancelled. You'll lose access to premium features immediately."}
                  </Text>
                  <TouchableOpacity 
                    style={styles.cancelConfirmButton}
                    onPress={async () => {
                      try {
                        setIsLoading(true);
                        const user = auth.currentUser;
                        if (!user) {
                          Alert.alert("Error", "User not authenticated");
                          setIsLoading(false);
                          return;
                        }

                        // Calculate access end date (day before renewal date)
                        let accessEndDate = null;
                        if (renewalDate) {
                          const renewal = new Date(renewalDate);
                          renewal.setDate(renewal.getDate() - 1);
                          accessEndDate = renewal.toISOString();
                        }

                        const userRef = doc(db, "user", user.uid);
                        await updateDoc(userRef, {
                          subscriptionCancelled: true,
                          accessEndDate: accessEndDate,
                        });

                        // Calculate access end date for the alert message
                        let accessEndMessage = "Your subscription has been cancelled.";
                        if (renewalDate) {
                          const renewal = new Date(renewalDate);
                          const accessEnd = new Date(renewal);
                          accessEnd.setDate(accessEnd.getDate() - 1);
                          accessEndMessage = `Your subscription has been cancelled. You'll retain premium access until ${formatRenewalDate(accessEnd.toISOString())}.`;
                        }

                        Alert.alert(
                          "Subscription Cancelled",
                          accessEndMessage,
                          [
                            {
                              text: "OK",
                              onPress: () => {
                                setShowCancelModal(false);
                                fetchMembershipData();
                              },
                            },
                          ]
                        );
                      } catch (error) {
                        Alert.alert("Error", "Failed to cancel subscription. Please try again.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.cancelConfirmText}>Yes, Cancel</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowCancelModal(false)}
                  >
                    <Text style={styles.closeButtonText}>No, Go Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9F0FA" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#333" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  planBox: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  planTitle: { fontSize: 16, fontWeight: "600" },
  premiumTag: {
    backgroundColor: "#f5a623",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  planDetails: { fontSize: 14, color: "#444" },
  planRenewal: { fontSize: 13, color: "#666", marginTop: 4 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  optionBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cancelBox: {
    borderWidth: 1,
    borderColor: "#b00020",
    backgroundColor: "#fff5f5",
  },
  optionText: { fontSize: 15, marginLeft: 12, color: "#333" },
  benefitItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  benefitIcon: { fontSize: 18, marginRight: 8 },
  benefitText: { fontSize: 14, color: "#444" },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#222",
  },

  // Plan
  planOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f4f6fb",
    marginBottom: 10,
  },
  activePlan: {
    backgroundColor: "#91a6f7ff",
  },
  planOptionText: { fontSize: 15, color: "#333" },

  // Inputs
  input: {
    backgroundColor: "#f4f6fb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#000", 
  },

  saveButton: {
    backgroundColor: "#4a6cf7",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  closeButton: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  closeButtonText: { fontSize: 14, fontWeight: "500", color: "#333" },
  cancelConfirmButton: {
    backgroundColor: "#b00020",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  cancelConfirmText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  
  row: {
  flexDirection: "row",
  justifyContent: "space-between",
},
halfInput: {
  flex: 1,
  marginHorizontal: 4,
},
confirmMessage: {
  marginBottom: 12,
  color: "#444",
  fontSize: 14,
  lineHeight: 20,
},

});

// Format renewal date for display
const formatRenewalDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }
    const day = date.getDate();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (error) {
    return "";
  }
};
