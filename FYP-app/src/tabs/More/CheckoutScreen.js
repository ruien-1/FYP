// CheckoutScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedPlan } = route.params || {};

  // Modal state
  const [showCardModal, setShowCardModal] = useState(false);

  // Payment fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={28} color="#000" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.header}>Confirm Your Plan</Text>

      {/* Plan Box */}
      <View style={styles.planBox}>
        <Text style={styles.planTitle}>
          {selectedPlan === "monthly" ? "Monthly Plan" : "Yearly Plan"}
        </Text>
        <Text style={styles.planPrice}>
          {selectedPlan === "monthly" ? "$8.99 / month" : "$92.00 / year"}
        </Text>
        {selectedPlan === "yearly" && (
          <Text style={styles.planDiscount}>15% OFF</Text>
        )}
      </View>

      {/* Payment Method */}
      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment Method</Text>
        <TouchableOpacity
          style={styles.paymentBox}
          onPress={() => setShowCardModal(true)}
        >
          <Ionicons name="card" size={22} color="#445A86" />
          <Text style={styles.paymentText}>Credit / Debit Card</Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Button */}
      <TouchableOpacity style={styles.confirmButton}>
        <Text style={styles.confirmButtonText}>Confirm & Subscribe</Text>
      </TouchableOpacity>

      {/* Card Modal */}
      <Modal
        visible={showCardModal}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowCardModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Enter Payment Details</Text>

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

              {/* City */}
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#777"
                value={city}
                onChangeText={setCity}
                keyboardAppearance="light"
              />

              {/* Zip + Country side by side */}
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Zip Code"
                  placeholderTextColor="#777"
                  value={zip}
                  onChangeText={setZip}
                  keyboardType="numeric"
                  keyboardAppearance="light"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Country"
                  placeholderTextColor="#777"
                  value={country}
                  onChangeText={setCountry}
                  keyboardAppearance="light"
                />
              </View>

              {/* Buttons */}
              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save & Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCardModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9F0FA",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 15,
    zIndex: 1,
  },
  header: {
    marginTop: 100,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  planBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    marginVertical: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    width: "100%",
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  planDiscount: {
    fontSize: 15,
    color: "green",
    marginTop: 6,
  },
  paymentSection: {
    marginTop: 10,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  paymentBox: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentText: {
    fontSize: 16,
    marginLeft: 12,
  },
  confirmButton: {
    alignSelf: "center",
    backgroundColor: "#445A86",
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: "auto",
    marginBottom: 30,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    elevation: 5,
  },
  modalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#222",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f4f6fb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#000",
  },
  saveButton: {
    backgroundColor: "#445A86",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  row: {
  flexDirection: "row",
  justifyContent: "space-between",
},
halfInput: {
  flex: 1,
  marginHorizontal: 4,
},
closeButton: {
  backgroundColor: "#e0e0e0",
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
  marginTop: 6,
},
closeButtonText: {
  fontSize: 14,
  fontWeight: "500",
  color: "#333",
},

});
