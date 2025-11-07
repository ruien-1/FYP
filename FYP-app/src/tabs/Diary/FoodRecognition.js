import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// ✅ Use __DEV__ to automatically switch between local & deployed backend
const DEV_API_URL = "http://192.168.1.15:5000"; // 🧠 replace with your PC IP for local testing
const PROD_API_URL = "https://fyp-0rqn.onrender.com"; // 🌐 your hosted backend on Render
const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export default function FoodRecognition() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const pic = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
        });
        setPhoto(pic.uri);
        await sendToBackend(pic.base64);
      } catch (error) {
        console.error("Error taking photo:", error);
        Alert.alert("Error", "Failed to take photo. Please try again.");
      }
    }
  };

  const sendToBackend = async (base64Image) => {
    try {
      setLoading(true);
      console.log("📤 Sending image to backend:", `${API_URL}/recognize-food`);

      const response = await fetch(`${API_URL}/recognize-food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Response from backend:", data);
      const recognizedFood = data.food || "Unknown";
      setResult(recognizedFood);
      
      // Show alert with option to search for the recognized food
      Alert.alert(
        "Food Recognized",
        `Recognized as: ${recognizedFood}\n\nWould you like to go back and search for this food?`,
        [
          { text: "Stay Here", style: "cancel" },
          {
            text: "Go Back & Search",
            onPress: () => {
              navigation.navigate("MealLog", { 
                recognizedFood: recognizedFood,
                searchQuery: recognizedFood 
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Error recognizing food:", error);
      setResult("Error recognizing food");
      Alert.alert("Error", "Failed to recognize food. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>No access to camera</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!photo ? (
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          {/* Camera Capture Button */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={loading}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.center}>
          <TouchableOpacity
            style={styles.backButtonResult}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Image source={{ uri: photo }} style={styles.resultImage} />
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Recognizing food...</Text>
            </View>
          ) : (
            result && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Recognized as:</Text>
                <Text style={styles.resultText}>{result}</Text>
              </View>
            )
          )}
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => {
              setPhoto(null);
              setResult(null);
            }}
          >
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.retakeButtonText}>Take Another</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F0FF",
    padding: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  backButtonResult: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "transparent",
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },
  resultImage: {
    width: 300,
    height: 300,
    borderRadius: 16,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  resultContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 250,
  },
  resultLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
