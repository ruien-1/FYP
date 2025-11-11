import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import { db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import API from "../../api/backend";

export default function CoachArticleManagement() {
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [articleLink, setArticleLink] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coachName, setCoachName] = useState("Coach");

  const currentUser = auth.currentUser;

  // CLOUDINARY CONFIGURATION
  const CLOUDINARY_CLOUD_NAME = 'djmgxrebz';
  const CLOUDINARY_UPLOAD_PRESET = 'coach_articles';

  // Fetch coach name on component mount
  useEffect(() => {
    fetchCoachName();
  }, []);

  const fetchCoachName = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Fetch directly from Firestore 'coach' collection
      const coachDocRef = doc(db, "coach", uid);
      const coachDoc = await getDoc(coachDocRef);

      if (coachDoc.exists()) {
        const coachData = coachDoc.data();
        const name = coachData.name || "Coach";
        setCoachName(name);
      } else {
        setCoachName(currentUser.displayName || "Coach");
      }
    } catch (error) {
      setCoachName(currentUser.displayName || "Coach");
    }
  };

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async (imageUri, userId) => {
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
      formData.append('folder', `coach_articles/${userId}`);


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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to add images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const removePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter an article title.");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Validation Error", "Please enter an article description.");
      return;
    }

    if (articleLink.trim() && !isValidUrl(articleLink.trim())) {
      Alert.alert("Validation Error", "Please enter a valid URL for the article link.");
      return;
    }

    try {
      setLoading(true);

      let uploadedPhotoUrls = [];
      
      if (photos.length > 0) {
        
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const uploadResult = await uploadImageToCloudinary(
            photo.uri,
            currentUser.uid
          );

          if (!uploadResult.success) {
            throw new Error(`Failed to upload photo ${i + 1}: ${uploadResult.error}`);
          }

          uploadedPhotoUrls.push(uploadResult.url);
        }

      }

      // Use the fetched coach name
      const articleData = {
        coachId: currentUser.uid,
        coachName: coachName,
        title: title.trim(),
        keywords: keywords.trim().split(",").map(k => k.trim()).filter(k => k),
        description: description.trim(),
        articleLink: articleLink.trim() || null,
        photos: uploadedPhotoUrls,
        createdAt: new Date().toISOString(),
      };

      const response = await API.post("/coacharticle", articleData);

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Article published successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        
        setTitle("");
        setKeywords("");
        setDescription("");
        setArticleLink("");
        setPhotos([]);
      } else {
        throw new Error(response.data.message || "Failed to publish article");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Failed to publish article. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Article Management</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Add Article</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Article Title:</Text>
            <TextInput
              style={styles.input}
              placeholder="Effective Workout Routine"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Keywords:</Text>
            <TextInput
              style={styles.input}
              placeholder="workout, fitness, training"
              placeholderTextColor="#999"
              value={keywords}
              onChangeText={setKeywords}
            />
            <Text style={styles.helperText}>Separate keywords with commas</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Article Description:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add a description..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Article Link (Optional):</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/article"
              placeholderTextColor="#999"
              value={articleLink}
              onChangeText={setArticleLink}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.helperText}>Enter the full URL to your article</Text>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity 
              style={styles.addPhotoButton} 
              onPress={pickImage}
              disabled={loading}
            >
              <Ionicons name="camera-outline" size={20} color="#007AFF" />
              <Text style={styles.addPhotoText}>Add Photos</Text>
            </TouchableOpacity>

            {photos.length > 0 && (
              <View style={styles.photoPreviewContainer}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                      disabled={loading}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {loading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.uploadingText}>
                Uploading photos and publishing article...
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF3FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },
  photoPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  photoPreview: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadingText: {
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});