import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Image, ActivityIndicator, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

// ✅ Use __DEV__ to automatically switch between local & deployed backend
const DEV_API_URL = "http://192.168.1.15:5000"; // 🧠 replace with your PC IP for local testing
const PROD_API_URL = "https://fyp-0rqn.onrender.com"; // 🌐 your hosted backend on Render
const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export default function FoodRecognition() {
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
      const pic = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });
      setPhoto(pic.uri);
      sendToBackend(pic.base64);
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
      setResult(data.food || "Unknown");
    } catch (error) {
      console.error("❌ Error recognizing food:", error);
      setResult("Error recognizing food");
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
          <View style={styles.snapButton}>
            <Button title="Snap" onPress={takePhoto} />
          </View>
        </CameraView>
      ) : (
        <View style={styles.center}>
          <Image source={{ uri: photo }} style={{ width: 300, height: 300 }} />
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <Text style={{ marginTop: 20, fontSize: 18 }}>Result: {result}</Text>
          )}
          <Button
            title="Take Another"
            onPress={() => {
              setPhoto(null);
              setResult(null);
            }}
          />
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
  },
  snapButton: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 20,
  },
});
