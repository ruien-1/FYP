import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";
import * as ImagePicker from "expo-image-picker";
import * as FileSystemLegacy from "expo-file-system/legacy";

export default function NutritionistHomeTab() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingActions, setPendingActions] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [articles, setArticles] = useState([]);

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editArticleLink, setEditArticleLink] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [updating, setUpdating] = useState(false);

  const currentUser = auth.currentUser;

  // CLOUDINARY CONFIGURATION
  const CLOUDINARY_CLOUD_NAME = 'djmgxrebz';
  const CLOUDINARY_UPLOAD_PRESET = 'coach_articles';

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        pendingAppointmentsRes,
        confirmedAppointmentsRes,
        pendingMealPlansRes,
        confirmedMealPlansRes,
        articlesRes,
      ] = await Promise.all([
        API.get("/appointments/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "pending" },
        }),
        API.get("/appointments/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "confirmed" },
        }),
        API.get("/meal-plans/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "pending" },
        }),
        API.get("/meal-plans/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "confirmed" },
        }),
        API.get("/nutritionist_article", {
          params: { nutritionistId: currentUser.uid },
        }),
      ]);

      const pendingAppointments = pendingAppointmentsRes.data?.data || [];
      const confirmedAppointments = confirmedAppointmentsRes.data?.data || [];
      const pendingMealPlans = pendingMealPlansRes.data?.data || [];
      const confirmedMealPlans = confirmedMealPlansRes.data?.data || [];
      const fetchedArticles = articlesRes.data?.data || [];

      const totalPendingRequests =
        pendingAppointments.length + pendingMealPlans.length;
      const pendingActionsCount = confirmedMealPlans.length;

      setPendingRequests(totalPendingRequests);
      setPendingActions(pendingActionsCount);
      setUpcomingAppointments(confirmedAppointments);
      setArticles(fetchedArticles);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePendingRequestPress = () => {
    navigation.navigate("NutritionistPendingRequest");
  };

  const handlePendingActionPress = () => {
    navigation.navigate("NutritionistPendingAction");
  };

  const handleAppointmentPress = (appointment) => {
    navigation.navigate("NutriUpcomingAppointment", {
      userId: appointment.userId,
      appointmentDate: appointment.appointmentDate,
      userName: appointment.userName,
    });
  };

  const handleAddArticle = () => {
    navigation.navigate("NutriArticleManagement");
  };

  const handleArticlePress = async (article) => {
    if (article.articleLink) {
      const supported = await Linking.canOpenURL(article.articleLink);
      if (supported) {
        await Linking.openURL(article.articleLink);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } else {
      Alert.alert("No Link", "This article doesn't have a link attached.");
    }
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditKeywords(article.keywords?.join(", ") || "");
    setEditDescription(article.description);
    setEditArticleLink(article.articleLink || "");
    setEditPhotos(article.photos || []);
    setNewPhotos([]);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingArticle(null);
    setEditTitle("");
    setEditKeywords("");
    setEditDescription("");
    setEditArticleLink("");
    setEditPhotos([]);
    setNewPhotos([]);
  };

  const pickNewImage = async () => {
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
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const photos = result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
        setNewPhotos([...newPhotos, ...photos]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const removeExistingPhoto = (index) => {
    const updated = editPhotos.filter((_, i) => i !== index);
    setEditPhotos(updated);
  };

  const removeNewPhoto = (index) => {
    const updated = newPhotos.filter((_, i) => i !== index);
    setNewPhotos(updated);
  };

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
      formData.append('folder', `nutritionist_articles/${userId}`);

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
      console.error("Upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleUpdateArticle = async () => {
    if (!editTitle.trim()) {
      Alert.alert("Validation Error", "Please enter an article title.");
      return;
    }

    if (!editDescription.trim()) {
      Alert.alert("Validation Error", "Please enter an article description.");
      return;
    }

    if (!editArticleLink.trim()) {
      Alert.alert("Validation Error", "Please enter an article link.");
      return;
    }

    if (!isValidUrl(editArticleLink.trim())) {
      Alert.alert("Validation Error", "Please enter a valid URL for the article link.");
      return;
    }

    try {
      setUpdating(true);

      let uploadedPhotoUrls = [];
      
      // Upload new photos
      if (newPhotos.length > 0) {
        console.log(`Uploading ${newPhotos.length} new photos...`);
        
        for (let i = 0; i < newPhotos.length; i++) {
          const photo = newPhotos[i];
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

      // Combine existing and new photos
      const allPhotos = [...editPhotos, ...uploadedPhotoUrls];

      const updateData = {
        title: editTitle.trim(),
        keywords: editKeywords.trim().split(",").map(k => k.trim()).filter(k => k),
        description: editDescription.trim(),
        articleLink: editArticleLink.trim(),
        photos: allPhotos,
      };

      console.log("Updating article ID:", editingArticle.id);
      const response = await API.put(`/nutritionist_article/${editingArticle.id}`, updateData);

      if (response.data.success) {
        // Update local state
        setArticles(articles.map(article => 
          article.id === editingArticle.id 
            ? { ...article, ...updateData } 
            : article
        ));

        Alert.alert("Success", "Article updated successfully!");
        closeEditModal();
      } else {
        throw new Error(response.data.message || "Failed to update article");
      }
    } catch (error) {
      console.error("Error updating article:", error);
      Alert.alert("Error", error.message || "Failed to update article. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteArticle = (articleId) => {
    Alert.alert(
      "Delete Article?",
      "Are you sure you want to delete this article?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await API.delete(`/nutritionist_article/${articleId}`);
              
              if (response.data.success) {
                setArticles(articles.filter(article => article.id !== articleId));
                Alert.alert("Success", "Article deleted successfully");
              }
            } catch (error) {
              console.error("Error deleting article:", error);
              Alert.alert("Error", "Failed to delete article. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatArticleDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Home</Text>
        </View>

        {/* Request & Action Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request & Action</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.statCard}
                onPress={handlePendingRequestPress}
                activeOpacity={0.8}
              >
                <Text style={styles.statNumber}>{pendingRequests}</Text>
                <Text style={styles.statLabel}>Pending Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                onPress={handlePendingActionPress}
                activeOpacity={0.8}
              >
                <Text style={styles.statNumber}>{pendingActions}</Text>
                <Text style={styles.statLabel}>Pending Action</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upcoming Appointments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : upcomingAppointments.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming appointments.</Text>
          ) : (
            upcomingAppointments.map((appt) => (
              <TouchableOpacity
                key={appt.id}
                style={styles.appointmentCard}
                onPress={() => handleAppointmentPress(appt)}
                activeOpacity={0.7}
              >
                <View style={styles.appointmentContent}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#007AFF"
                      />
                      <Text style={styles.appointmentDate}>
                        {" "}
                        {formatDate(appt.appointmentDate)} at{" "}
                        {formatTime(appt.appointmentDate)}
                      </Text>
                    </View>
                    <View style={styles.appointmentUserRow}>
                      <Ionicons
                        name="person-circle-outline"
                        size={22}
                        color="#000"
                      />
                      <Text style={styles.appointmentUser}>{appt.userName}</Text>
                      <View style={styles.sessionTag}>
                        <Text style={styles.sessionTagText}>
                          Virtual Consultation
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#007AFF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Articles Section */}
        <View style={styles.section}>
          <View style={styles.articleHeader}>
            <Text style={styles.sectionTitle}>Articles</Text>
            <TouchableOpacity onPress={handleAddArticle} style={styles.addButton}>
              <Ionicons name="add-circle" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : articles.length === 0 ? (
            <Text style={styles.emptyText}>No articles yet. Tap + to add one!</Text>
          ) : (
            articles.map((article) => (
              <View key={article.id} style={styles.articleCard}>
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditArticle(article)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteArticle(article.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {/* Images */}
                {article.photos && article.photos.length > 0 && (
                  <View style={styles.imagesContainer}>
                    {article.photos.slice(0, 2).map((photo, index) => (
                      <Image
                        key={index}
                        source={{ uri: photo }}
                        style={[
                          styles.articleImage,
                          article.photos.length === 1 && styles.singleImage,
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.articleContent}
                  onPress={() => handleArticlePress(article)}
                  activeOpacity={0.7}
                >
                  <View style={styles.articleTitleRow}>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    <Ionicons name="link-outline" size={20} color="#007AFF" />
                  </View>
                  
                  {/* Keywords */}
                  {article.keywords && article.keywords.length > 0 && (
                    <View style={styles.keywordsContainer}>
                      {article.keywords.slice(0, 3).map((keyword, idx) => (
                        <View key={idx} style={styles.keywordTag}>
                          <Text style={styles.keywordText}>#{keyword}</Text>
                        </View>
                      ))}
                      {article.keywords.length > 3 && (
                        <Text style={styles.moreKeywords}>+{article.keywords.length - 3}</Text>
                      )}
                    </View>
                  )}
                  
                  <Text style={styles.articleDescription} numberOfLines={2}>
                    {article.description}
                  </Text>

                  {article.articleLink && (
                    <View style={styles.linkContainer}>
                      <Ionicons name="open-outline" size={14} color="#007AFF" />
                      <Text style={styles.linkText} numberOfLines={1}>
                        {article.articleLink}
                      </Text>
                    </View>
                  )}
                  
                  <Text style={styles.articleDate}>
                    {formatArticleDate(article.createdAt)}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Article</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Article Title:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Article title"
                  placeholderTextColor="#999"
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
              </View>

              {/* Keywords Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Keywords:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="weight loss, nutrition, health"
                  placeholderTextColor="#999"
                  value={editKeywords}
                  onChangeText={setEditKeywords}
                />
                <Text style={styles.helperText}>Separate keywords with commas</Text>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Article Description:</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add a description..."
                  placeholderTextColor="#999"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Article Link Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Article Link:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/article"
                  placeholderTextColor="#999"
                  value={editArticleLink}
                  onChangeText={setEditArticleLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Text style={styles.helperText}>Enter the full URL to your article</Text>
              </View>

              {/* Current Photos */}
              {editPhotos.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Photos:</Text>
                  <View style={styles.photoPreviewContainer}>
                    {editPhotos.map((photo, index) => (
                      <View key={`existing-${index}`} style={styles.photoPreview}>
                        <Image source={{ uri: photo }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removeExistingPhoto(index)}
                          disabled={updating}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* New Photos */}
              {newPhotos.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Photos:</Text>
                  <View style={styles.photoPreviewContainer}>
                    {newPhotos.map((photo, index) => (
                      <View key={`new-${index}`} style={styles.photoPreview}>
                        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removeNewPhoto(index)}
                          disabled={updating}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Add Photos Button */}
              <TouchableOpacity 
                style={styles.addPhotoButton} 
                onPress={pickNewImage}
                disabled={updating}
              >
                <Ionicons name="camera-outline" size={20} color="#007AFF" />
                <Text style={styles.addPhotoText}>Add More Photos</Text>
              </TouchableOpacity>

              {/* Update Button */}
              <TouchableOpacity
                style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                onPress={handleUpdateArticle}
                disabled={updating}
                activeOpacity={0.8}
              >
                {updating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.updateButtonText}>Update Article</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#000",
  },
  section: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#CFE7FF",
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "700",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  appointmentCard: {
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderColor: "#D6E6FF",
    borderWidth: 1,
  },
  appointmentContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appointmentDate: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  appointmentUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  appointmentUser: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginHorizontal: 8,
  },
  sessionTag: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sessionTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    fontSize: 14,
  },
  articleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  articleCard: {
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    marginTop: 10,
    borderColor: "#D6E6FF",
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  actionButtons: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imagesContainer: {
    flexDirection: "row",
    width: "100%",
    height: 160,
  },
  articleImage: {
    width: "50%",
    height: 160,
    backgroundColor: "#E0E0E0",
  },
  singleImage: {
    width: "100%",
  },
  articleContent: {
    padding: 14,
  },
  articleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingRight: 60,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  keywordTag: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 11,
    color: "#0369A1",
    fontWeight: "600",
  },
  moreKeywords: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  articleDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 12,
    color: "#007AFF",
    marginLeft: 6,
    flex: 1,
  },
  articleDate: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#EAF3FF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  modalContent: {
    flex: 1,
    padding: 16,
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
    backgroundColor: "#FFFFFF",
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
  photoPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
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
    marginBottom: 20,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});