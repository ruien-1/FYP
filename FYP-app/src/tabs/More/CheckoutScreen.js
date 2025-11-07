// CheckoutScreen.js
import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import * as Crypto from "expo-crypto";

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedPlan, isUpdatingPayment } = route.params || {};

  // Modal state
  const [showCardModal, setShowCardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Payment fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  // Card saved state
  const [cardSaved, setCardSaved] = useState(false);
  const [last4Digits, setLast4Digits] = useState("");
  const previousExpiryRef = useRef("");

  // Load saved card info on mount
  useEffect(() => {
    const loadSavedCard = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Try to load from user document (paymentInfo field)
        const userRef = doc(db, "user", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.paymentInfo && userData.paymentInfo.last4Digits) {
            const paymentData = userData.paymentInfo;
            setLast4Digits(paymentData.last4Digits);
            setCardSaved(true);
            // Load non-sensitive info for editing
            setCardName(paymentData.cardName || "");
            setBillingAddress(paymentData.billingAddress || "");
            setCity(paymentData.city || "");
            setZip(paymentData.zip || "");
            setCountry(paymentData.country || "");
          }
        }
      } catch (error) {
        // Silently handle - no card saved is not an error
        // Only log if it's not a permissions error
        if (error.code !== 'permission-denied') {
          console.error("Error loading saved card:", error);
        }
      }
    };

    loadSavedCard();
  }, []);

  // Format card number with spaces every 4 digits
  const formatCardNumber = (text) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Limit to 16 digits
    const limited = cleaned.slice(0, 16);
    // Add space every 4 digits
    const formatted = limited.replace(/(.{4})/g, "$1 ").trim();
    return formatted;
  };

  // Format expiry date as MM/YY
  const formatExpiry = (text) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    
    // Get previous cleaned value from ref
    const prevCleaned = previousExpiryRef.current.replace(/\D/g, "");
    
    // If user is deleting and we're at exactly 2 digits, don't add the "/"
    // This allows the user to delete past the "/" character
    if (cleaned.length < prevCleaned.length && cleaned.length === 2) {
      // User deleted past the "/", return just the 2 digits without "/"
      previousExpiryRef.current = cleaned;
      return cleaned;
    }
    
    // Limit to 4 digits
    const limited = cleaned.slice(0, 4);
    
    // Add / after 2 digits (only if we have more than 2 digits)
    if (limited.length > 2) {
      const formatted = limited.slice(0, 2) + "/" + limited.slice(2);
      previousExpiryRef.current = formatted;
      return formatted;
    } else if (limited.length === 2 && prevCleaned.length > 2) {
      // User is deleting from "12/34" to "12", allow it
      previousExpiryRef.current = limited;
      return limited;
    }
    
    previousExpiryRef.current = limited;
    return limited;
  };

  const handleCardNumberChange = (text) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text) => {
    const formatted = formatExpiry(text);
    setExpiry(formatted);
  };

  // Hash sensitive data for secure storage
  const hashData = async (data) => {
    try {
      const user = auth.currentUser;
      const salt = user?.uid || "";
      // Use expo-crypto to hash the data with SHA256
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + salt // Add user UID as salt for extra security
      );
      return hash;
    } catch (error) {
      console.error("Error hashing data:", error);
      // Fallback: create a simple hash if crypto fails
      // This is not as secure but better than storing plain text
      const user = auth.currentUser;
      let hash = 0;
      const str = data + (user?.uid || "");
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }
  };

  const handleSaveCard = async () => {
    // Validate all fields
    if (!cardName.trim()) {
      Alert.alert("Error", "Please enter cardholder name");
      return;
    }
    if (!cardNumber.replace(/\s/g, "") || cardNumber.replace(/\s/g, "").length < 16) {
      Alert.alert("Error", "Please enter a valid 16-digit card number");
      return;
    }
    if (!expiry || expiry.length < 5) {
      Alert.alert("Error", "Please enter a valid expiry date (MM/YY)");
      return;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert("Error", "Please enter a valid CVV");
      return;
    }
    if (!billingAddress.trim()) {
      Alert.alert("Error", "Please enter billing address");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Error", "Please enter city");
      return;
    }
    if (!zip.trim()) {
      Alert.alert("Error", "Please enter zip code");
      return;
    }
    if (!country.trim()) {
      Alert.alert("Error", "Please enter country");
      return;
    }

    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated");
        setIsLoading(false);
        return;
      }

      // Extract last 4 digits (safe to store)
      const cleanedCardNumber = cardNumber.replace(/\s/g, "");
      const last4 = cleanedCardNumber.slice(-4);

      // Hash sensitive information (card number, CVV, expiry)
      // Note: In production, consider using a payment processor like Stripe
      // This is a basic security measure for FYP purposes
      const hashedCardNumber = await hashData(cleanedCardNumber);
      const hashedCVV = await hashData(cvv);
      const hashedExpiry = await hashData(expiry);

      // Store card information securely in user document (paymentInfo field)
      // This avoids Firestore permissions issues with separate collection
      const userRef = doc(db, "user", user.uid);
      await updateDoc(userRef, {
        paymentInfo: {
          cardName: cardName.trim(),
          last4Digits: last4,
          hashedCardNumber: hashedCardNumber,
          hashedCVV: hashedCVV,
          hashedExpiry: hashedExpiry,
          billingAddress: billingAddress.trim(),
          city: city.trim(),
          zip: zip.trim(),
          country: country.trim(),
          savedAt: new Date().toISOString(),
        }
      });

      setLast4Digits(last4);
      setCardSaved(true);
      setShowCardModal(false);
      
      // Clear sensitive fields from memory after saving
      setCardNumber("");
      setCvv("");
      setExpiry("");
      
      Alert.alert("Success", "Card information saved securely!");
    } catch (error) {
      console.error("Error saving card:", error);
      Alert.alert("Error", "Failed to save card information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubscribe = async () => {
    // For payment updates, card should already be saved via the modal
    // For new subscriptions, card must be saved first
    if (!isUpdatingPayment && !cardSaved) {
      Alert.alert("Error", "Please add a payment method first");
      return;
    }

    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated");
        setIsLoading(false);
        return;
      }

      // If just updating payment method, just confirm the update
      if (isUpdatingPayment) {
        if (!cardSaved) {
          Alert.alert("Error", "Please add a payment method first");
          setIsLoading(false);
          return;
        }
        Alert.alert(
          "Success",
          "Payment method updated successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Calculate renewal date based on plan type
      const now = new Date();
      const renewalDate = new Date(now);
      if (selectedPlan === "monthly") {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
      } else if (selectedPlan === "yearly") {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      }

      // Update membership status directly in Firestore
      const userRef = doc(db, "user", user.uid);
      await updateDoc(userRef, {
        membership: "premium",
        planType: selectedPlan,
        premiumActivatedAt: now.toISOString(),
        renewalDate: renewalDate.toISOString(),
        subscriptionCancelled: false, // Reset cancellation status if resubscribing
      });

      Alert.alert(
        "Success",
        "You have successfully upgraded to Premium!",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to MoreTab - useFocusEffect will refresh membership status
              navigation.navigate("MoreTab");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error updating membership:", error);
      Alert.alert("Error", "Failed to update membership. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
      <Text style={styles.header}>
        {isUpdatingPayment ? "Update Payment Method" : "Confirm Your Plan"}
      </Text>

      {/* Plan Box - Only show if not updating payment */}
      {!isUpdatingPayment && (
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
      )}

      {/* Payment Method */}
      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment Method</Text>
        {cardSaved ? (
          <View style={styles.cardPreviewBox}>
            <Ionicons name="card" size={22} color="#445A86" />
            <Text style={styles.cardPreviewText}>
              Card ending with *{last4Digits}
            </Text>
            <TouchableOpacity
              onPress={() => setShowCardModal(true)}
              style={styles.editCardButton}
            >
              <Text style={styles.editCardText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.paymentBox}
            onPress={() => setShowCardModal(true)}
          >
            <Ionicons name="card" size={22} color="#445A86" />
            <Text style={styles.paymentText}>Credit / Debit Card</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Confirm Button */}
      <TouchableOpacity
        style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
        onPress={handleConfirmSubscribe}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>
            {isUpdatingPayment ? "Update Payment Method" : "Confirm & Subscribe"}
          </Text>
        )}
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
                onChangeText={handleCardNumberChange}
                keyboardType="numeric"
                returnKeyType="done"
                keyboardAppearance="light"
                maxLength={19}
              />

              {/* Expiry + CVV side by side */}
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="MM/YY"
                  placeholderTextColor="#777"
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="numeric"
                  keyboardAppearance="light"
                  maxLength={5}
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
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSaveCard}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save & Continue</Text>
                )}
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
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cardPreviewBox: {
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
  cardPreviewText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  editCardButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  editCardText: {
    fontSize: 14,
    color: "#445A86",
    fontWeight: "500",
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
  saveButtonDisabled: {
    opacity: 0.6,
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
