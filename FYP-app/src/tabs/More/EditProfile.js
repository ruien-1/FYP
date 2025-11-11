import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as FileSystemLegacy from "expo-file-system/legacy";

const CLOUDINARY_CLOUD_NAME = 'djmgxrebz';
const CLOUDINARY_UPLOAD_PRESET = 'coach_articles'; 

export default function EditProfile() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [wallpaperImage, setWallpaperImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "user", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setName(data.name || "");
        setProfileImage(data.profileImage || null);
        setWallpaperImage(data.wallpaperImage || null);
      }
    } catch (error) {
    }
  };

  const uploadImageToCloudinary = async (imageUri, folder) => {
    try {
      const fileContent = await FileSystemLegacy.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const fileExtension = imageUri.toLowerCase().split('.').pop();
      let mimeType = 'image/jpeg';
      
      if (fileExtension === 'png') {
        mimeType = 'image/png';
      } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
        mimeType = 'image/jpeg';
      }

      const formData = new FormData();
      formData.append('file', `data:${mimeType};base64,${fileContent}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `user_profiles/${folder}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const pickWallpaperImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setWallpaperImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated");
        setSaving(false);
        return;
      }

      const updateData = {
        name: name.trim(),
      };

      // Upload profile image if changed
      if (profileImage && !profileImage.startsWith('http')) {
        const uploadResult = await uploadImageToCloudinary(profileImage, user.uid);
        if (uploadResult.success) {
          updateData.profileImage = uploadResult.url;
        } else {
          Alert.alert("Error", "Failed to upload profile image. Please try again.");
          setSaving(false);
          return;
        }
      } else if (profileImage && profileImage.startsWith('http')) {
        // Keep existing URL if it's already a URL
        updateData.profileImage = profileImage;
      }

      // Upload wallpaper image if changed
      if (wallpaperImage && !wallpaperImage.startsWith('http')) {
        const uploadResult = await uploadImageToCloudinary(wallpaperImage, user.uid);
        if (uploadResult.success) {
          updateData.wallpaperImage = uploadResult.url;
        } else {
          Alert.alert("Error", "Failed to upload wallpaper image. Please try again.");
          setSaving(false);
          return;
        }
      } else if (wallpaperImage && wallpaperImage.startsWith('http')) {
        // Keep existing URL if it's already a URL
        updateData.wallpaperImage = wallpaperImage;
      }

      // Update Firestore
      const userRef = doc(db, "user", user.uid);
      await updateDoc(userRef, updateData);

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={26} color="#000" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={{ width: 26 }} />
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Wallpaper Section */}
              <View style={styles.wallpaperSection}>
                <Text style={styles.sectionLabel}>Background Wallpaper</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickWallpaperImage}
                >
                  {wallpaperImage ? (
                    <Image
                      source={{ uri: wallpaperImage }}
                      style={styles.wallpaperPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#999" />
                      <Text style={styles.placeholderText}>Tap to select wallpaper</Text>
                    </View>
                  )}
                  <View style={styles.editOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Profile Picture Section */}
              <View style={styles.profilePictureSection}>
                <Text style={styles.sectionLabel}>Profile Picture</Text>
                <View style={styles.profilePictureWrapper}>
                  <TouchableOpacity
                    style={styles.profilePictureButton}
                    onPress={pickProfileImage}
                  >
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.profilePicturePreview}
                      />
                    ) : (
                      <View style={styles.profilePicturePlaceholder}>
                        <Ionicons name="person" size={50} color="#999" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.profileEditOverlay}
                    onPress={pickProfileImage}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name Section */}
              <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9F0FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40, 
  },
  wallpaperSection: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  imagePickerButton: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    position: "relative",
  },
  wallpaperPreview: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  editOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  profilePictureSection: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 10,
    alignItems: "center",
  },
  profilePictureWrapper: {
    width: 120,
    height: 120,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePictureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePicturePreview: {
    width: "100%",
    height: "100%",
  },
  profilePicturePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ddd",
  },
  profileEditOverlay: {
    position: "absolute",
    bottom: -4, 
    right: -4, 
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, 
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  form: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  saveButtonContainer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#4a6cf7",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
