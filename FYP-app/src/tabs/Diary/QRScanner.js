import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import API from "../../api/backend";

const QRScanner = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [productInfo, setProductInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [barcode, setBarcode] = useState(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState(null);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLastScannedBarcode(null);

      return () => {
        setScanned(false);
        setProductInfo(null);
        setBarcode(null);
        setLastScannedBarcode(null);
        setLoading(false);
        setShowConfirmModal(false);
        setShowManualAddModal(false);
        setShowIncompleteModal(false);
        setShowPendingModal(false);
      };
    }, [])
  );

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to access the camera
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = async ({ data }) => {
  if (scanned || data === lastScannedBarcode) {
    return;
  }

  setScanned(true);
  setLastScannedBarcode(data);
  setBarcode(data);
  setLoading(true);

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${data}.json`
    );
    const result = await response.json();

    if (result.status === 1) {
      const product = result.product;
      const nutriments = product.nutriments || {};

      const calories =
        nutriments.energy_kcal_100g ??
        (nutriments.energy_100g
          ? Math.round(nutriments.energy_100g / 4.184)
          : "N/A");

      const formatNumber = (value) => {
        if (value === undefined || value === null || isNaN(value)) return "N/A";
        return parseFloat(value).toFixed(2);
      };

      const productData = {
        name: product.product_name || "Unknown",
        brand: product.brands || "",
        image: product.image_front_small_url || null,
        nutriments: {
          calories: formatNumber(calories),
          proteins_100g: formatNumber(nutriments.proteins_100g),
          fat_100g: formatNumber(nutriments.fat_100g),
          carbohydrates_100g: formatNumber(nutriments.carbohydrates_100g),
        },
      };

      const isIncomplete =
        productData.nutriments.calories === "N/A" ||
        productData.nutriments.proteins_100g === "N/A" ||
        productData.nutriments.fat_100g === "N/A" ||
        productData.nutriments.carbohydrates_100g === "N/A";

      setProductInfo(productData);

      if (isIncomplete) {
        setShowIncompleteModal(true);
      } else {
        setShowConfirmModal(true);
      }
    } else {
      setShowManualAddModal(true);
    }
  } catch (error) {
    setScanned(false);
    setLastScannedBarcode(null);
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128"],
        }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />

      {/* Scan Frame */}
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        {barcode && (
          <View style={styles.barcodeDisplay}>
            <Text style={styles.barcodeText}>Barcode: {barcode}</Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.infoContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.infoText}>Fetching product info...</Text>
        </View>
      )}


      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#4caf50" />
            </View>
            
            <Text style={styles.modalTitle}>Product Found</Text>
            
            <View style={styles.productInfoBox}>
              <Text style={styles.modalProductName}>{productInfo?.name}</Text>
            </View>

            <Text style={styles.helperText}>
              Is this the correct product you want to log?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowConfirmModal(false);
                  navigation.navigate("LogMealQR", { productInfo, barcode });
                }}
              >
                <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Yes, Log This</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowConfirmModal(false);
                  resetScanner();
                }}
              >
                <Text style={styles.buttonTextSecondary}>No, Scan Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showIncompleteModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#ff9800" />
            </View>

            <Text style={styles.modalTitle}>Incomplete Information</Text>
            
            <View style={styles.productInfoBox}>
              <Text style={styles.modalProductName}>{productInfo?.name}</Text>
              {productInfo?.brand && (
                <Text style={styles.modalBrand}>{productInfo.brand}</Text>
              )}
            </View>

            <View style={styles.incompleteInfo}>
              <Text style={styles.incompleteText}>Missing Nutritional Data</Text>
              <View style={styles.missingItemsContainer}>
                {productInfo?.nutriments.calories === "N/A" && (
                  <View style={styles.missingItem}>
                    <Ionicons name="close-circle" size={18} color="#d32f2f" />
                    <Text style={styles.missingItemText}>Calories</Text>
                  </View>
                )}
                {productInfo?.nutriments.proteins_100g === "N/A" && (
                  <View style={styles.missingItem}>
                    <Ionicons name="close-circle" size={18} color="#d32f2f" />
                    <Text style={styles.missingItemText}>Protein</Text>
                  </View>
                )}
                {productInfo?.nutriments.fat_100g === "N/A" && (
                  <View style={styles.missingItem}>
                    <Ionicons name="close-circle" size={18} color="#d32f2f" />
                    <Text style={styles.missingItemText}>Fat</Text>
                  </View>
                )}
                {productInfo?.nutriments.carbohydrates_100g === "N/A" && (
                  <View style={styles.missingItem}>
                    <Ionicons name="close-circle" size={18} color="#d32f2f" />
                    <Text style={styles.missingItemText}>Carbohydrates</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.helperText}>
              Help us complete this product's information to make it available for tracking
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowIncompleteModal(false);
                  navigation.navigate("ManualAddFoodQR", {
                    barcode,
                    partialData: productInfo,
                  });
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Complete Info</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowIncompleteModal(false);
                  resetScanner();
                }}
              >
                <Text style={styles.buttonTextSecondary}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPendingModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowPendingModal(false);
                resetScanner();
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Pending Verification</Text>
            <Text style={styles.modalProductName}>
              This product is under review by our nutritionists.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={showManualAddModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.notFoundIconContainer}>
              <Ionicons name="search-outline" size={64} color="#ff5722" />
            </View>

            <Text style={styles.modalTitle}>Product Not Found</Text>
            
            <View style={styles.barcodeInfoBox}>
              <Text style={styles.barcodeLabel}>Scanned Barcode</Text>
              <Text style={styles.barcodeValue}>{barcode}</Text>
            </View>

            <Text style={styles.helperText}>
              This product isn't in our database yet. Would you like to add it manually?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowManualAddModal(false);
                  navigation.navigate("ManualAddFoodQR", { barcode });
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Add Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowManualAddModal(false);
                  resetScanner();
                }}
              >
                <Text style={styles.buttonTextSecondary}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
  },
  barcodeDisplay: {
    position: "absolute",
    bottom: 100,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
  },
  barcodeText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "monospace",
  },
  infoContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  infoText: { color: "#fff", fontSize: 16, textAlign: "center" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    maxWidth: 380,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  warningIconContainer: {
    marginBottom: 16,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  notFoundIconContainer: {
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 16,
    color: "#1a1a1a",
  },
  productInfoBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 10,
    width: "100%",
    marginBottom: 16,
  },
  barcodeInfoBox: {
    backgroundColor: "#fff3e0",
    padding: 12,
    borderRadius: 10,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffe0b2",
  },
  barcodeLabel: {
    fontSize: 12,
    color: "#e65100",
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  barcodeValue: {
    fontSize: 16,
    color: "#bf360c",
    fontFamily: "monospace",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalProductName: { 
    fontSize: 17, 
    color: "#1a1a1a", 
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  modalBrand: { 
    fontSize: 14, 
    color: "#666", 
    fontStyle: "italic",
    textAlign: "center",
  },
  barcodeInfo: { fontSize: 12, color: "#666", marginTop: 5, fontFamily: "monospace" },
  incompleteInfo: {
    backgroundColor: "#ffebee",
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  incompleteText: { 
    fontWeight: "bold", 
    marginBottom: 12, 
    color: "#c62828", 
    fontSize: 15,
  },
  missingItemsContainer: {
    gap: 8,
  },
  missingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  missingItemText: {
    fontSize: 15,
    color: "#424242",
  },
  helperText: { 
    fontSize: 14, 
    color: "#666", 
    textAlign: "center", 
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: { 
    flexDirection: "column", 
    width: "100%",
    gap: 10,
  },
  modalButton: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  modalButtonPrimary: {
    backgroundColor: "#2196f3",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  modalButtonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ddd",
    width: "100%",
  },
  secondaryButton: { backgroundColor: "#666" },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  message: { textAlign: "center", marginTop: 20, color: "#000" },
  permissionButton: {
    marginTop: 10,
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "center",
  },
});

export default QRScanner;
