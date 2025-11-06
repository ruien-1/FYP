import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

export default function FoodRecognition() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  // Extract host (e.g. "192.168.1.42:19000") → split to get just IP
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  const API_URL = `http://${host}:5000`;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const takePhoto = async () => {
    if (cameraRef.current) {
      const pic = await cameraRef.current.takePictureAsync({ base64: true , quality: 0.5 });
      setPhoto(pic.uri);
      sendToBackend(pic.base64);
    }
  };

    // Pick photo from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setPhoto(asset.uri);
      sendToBackend(asset.base64);
    }
  };

  const sendToBackend = async (base64Image) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/recognize-food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      const data = await response.json();
      setResult(data.food || "Unknown");
    } catch (error) {
      console.error(error);
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
          {/* Bottom controls: Gallery (left) + Snap (right) */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Text style={{ fontSize: 20 }}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.snapButton} onPress={takePhoto}>
              <Text style={{ fontSize: 20 }}>📷</Text>
            </TouchableOpacity>
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
          <Button title="Take Another" onPress={() => { setPhoto(null); setResult(null); }} />
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
  controls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 20,
    backgroundColor: "transparent",
  },
  galleryButton: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 10,
    borderRadius: 30,
  },
  snapButton: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 10,
    borderRadius: 30,
  },
});




