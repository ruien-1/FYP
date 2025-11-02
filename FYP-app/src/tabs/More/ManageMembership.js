import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function ManageMembership() {
  const navigation = useNavigation();
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Change Plan
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  // Payment fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

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
                Monthly Plan · $8.99 / month
              </Text>
              <Text style={styles.planRenewal}>
                Renews on 20 September 2025
              </Text>
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
                onPress={() => setShowPaymentModal(true)}
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
                    <Text style={styles.planOptionText}>Yearly - $79.99</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveButton}>
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

          {/* Update Payment Method Modal */}
          <Modal visible={showPaymentModal} animationType="fade" transparent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Update Payment Method</Text>

                  {/* Cardholder Name */}
                  <TextInput
                    style={styles.input}
                    placeholder="Cardholder Name"
                    placeholderTextColor="#777"
                    value={cardName}
                    onChangeText={setCardName}
                    keyboardAppearance="light"
                  />

                  {/* Card Number */}
                  <TextInput
                    style={styles.input}
                    placeholder="Card Number"
                    placeholderTextColor="#777"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="numeric"
                    returnKeyType="done"
                    keyboardAppearance="light"
                  />

                  {/* Expiry + CVV side by side */}
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="MM/YY"
                      placeholderTextColor="#777"
                      value={expiry}
                      onChangeText={setExpiry}
                      keyboardType="numeric"
                      keyboardAppearance="light"
                    />
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="CVV"
                      placeholderTextColor="#777"
                      value={cvv}
                      onChangeText={setCvv}
                      secureTextEntry
                      keyboardType="numeric"
                      returnKeyType="done"
                      keyboardAppearance="light"
                    />
                  </View>

                  {/* Billing Address */}
                  <TextInput
                    style={styles.input}
                    placeholder="Billing Address"
                    placeholderTextColor="#777"
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                    keyboardAppearance="light"
                  />

                  {/* Buttons */}
                  <TouchableOpacity style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save & Continue</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
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
                    Are you sure you want to cancel your subscription? You’ll
                    lose access immediately.
                  </Text>
                  <TouchableOpacity style={styles.cancelConfirmButton}>
                    <Text style={styles.cancelConfirmText}>Yes, Cancel</Text>
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

});
