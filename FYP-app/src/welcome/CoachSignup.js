import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { 
  signupCoach, 
  checkCoachEmailVerified 
} from "../coachauth";
import API from "../api/backend";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { SafeAreaView } from 'react-native-safe-area-context';


const CoachSignup = ({ navigation, onBack }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeSelection, setCurrentTimeSelection] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    credentials: "",
    specializations: [],
    yearsOfExperience: "",
    bio: "",
    documentType: "",
    credentialNumber: "",
    issuingOrganization: "",
    proofDocument: null,
    placeOfPractice: "",
    gymName: "",
    offersVirtualConsultation: null,
    servicesOffered: [],
    availability: {
      Monday: { available: false, startTime: "", endTime: "" },
      Tuesday: { available: false, startTime: "", endTime: "" },
      Wednesday: { available: false, startTime: "", endTime: "" },
      Thursday: { available: false, startTime: "", endTime: "" },
      Friday: { available: false, startTime: "", endTime: "" },
      Saturday: { available: false, startTime: "", endTime: "" },
      Sunday: { available: false, startTime: "", endTime: "" },
    },
  });

  const timeSlots = [
    "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM",
    "3:00 AM", "3:30 AM", "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM",
    "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
    "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
  ];

  // CLOUDINARY CONFIGURATION
  const CLOUDINARY_CLOUD_NAME = 'djmgxrebz';
  const CLOUDINARY_UPLOAD_PRESET = 'coach_docs';

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (fileUri, userId) => {
    try {
      console.log("Starting file upload to Cloudinary for user:", userId);
      console.log("File URI:", fileUri);

      // Read file as base64
      const fileContent = await FileSystemLegacy.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // Determine file type
      const fileExtension = fileUri.toLowerCase().split('.').pop();
      let resourceType = 'auto';
      let mimeType = 'application/octet-stream';
      
      if (fileExtension === 'pdf') {
        resourceType = 'raw';
        mimeType = 'application/pdf';
      } else if (fileExtension === 'png') {
        resourceType = 'image';
        mimeType = 'image/png';
      } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
        resourceType = 'image';
        mimeType = 'image/jpeg';
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', `data:${mimeType};base64,${fileContent}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `coach_credentials/${userId}`);

      console.log("Uploading to Cloudinary...");

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      console.log("Upload successful! URL:", data.secure_url);

      return {
        success: true,
        downloadURL: data.secure_url,
        fileName: data.original_filename,
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

  // STEP 1: Coach signs up
  const handleCoachSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (
      password.length < 6 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters long and include uppercase, lowercase, and a special character"
      );
      return;
    }

    try {
      const result = await signupCoach(email, password);
      if (!result.success) {
        if (result.error.includes("auth/email-already-in-use")) {
          Alert.alert(
            "Error",
            "This email is already registered. Please log in instead."
          );
          return;
        }
        throw new Error(result.error);
      }

      Alert.alert(
        "Verify Your Email",
        "A verification link has been sent to your email. Please click the link and then press 'Continue' below.",
        [{ text: "Continue", onPress: handleContinueAfterVerification }]
      );
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Signup Error", error.message);
    }
  };

  // STEP 2: Continue after verification
  const handleContinueAfterVerification = async () => {
    if (isUploading) {
      Alert.alert("Please wait", "File upload in progress...");
      return;
    }

    try {
      const verified = await checkCoachEmailVerified(email, password);

      if (!verified) {
        Alert.alert(
          "Email Not Verified",
          "Please click the verification link in your email first, then press 'Check Again'.",
          [{ text: "Check Again", onPress: handleContinueAfterVerification }]
        );
        return;
      }

      setIsUploading(true);

      // Sign in to get the user object
      const { auth } = require("../firebaseConfig");
      const { signInWithEmailAndPassword } = require("firebase/auth");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Upload file to Cloudinary if document exists
      let uploadedFileData = null;
      if (profile.proofDocument && profile.proofDocument.uri) {
        console.log("Uploading document to Cloudinary...");

        const uploadResult = await uploadFileToCloudinary(
          profile.proofDocument.uri,
          user.uid
        );

        if (!uploadResult.success) {
          throw new Error("Failed to upload document: " + uploadResult.error);
        }

        uploadedFileData = {
          name: profile.proofDocument.name,
          size: profile.proofDocument.size,
          type: profile.proofDocument.type,
          downloadURL: uploadResult.downloadURL,
          fileName: uploadResult.fileName,
          publicId: uploadResult.publicId,
          uploadedAt: new Date().toISOString(),
        };

        console.log("Document uploaded successfully!");
      }

      // Convert numeric values before sending to backend
      const convertedProfile = {
        ...profile,
        age: Number(profile.age),
        yearsOfExperience: Number(profile.yearsOfExperience),
        proofDocument: uploadedFileData,
      };

      // Save profile to backend
      console.log("Saving profile to backend...");
      const response = await API.post("/complete-coach-signup", {
        uid: user.uid,
        email,
        profile: convertedProfile,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to save profile");
      }

      setIsUploading(false);

      Alert.alert(
        "Success!",
        "Your coach account has been created! Your account will be reviewed and activated shortly.",
        [{ text: "Continue", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      setIsUploading(false);
      console.error("Verification flow error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const openTimePicker = (day, type) => {
    setCurrentTimeSelection({ day, type });
    setShowTimePicker(true);
  };

  const selectTime = (time) => {
    if (currentTimeSelection) {
      const { day, type } = currentTimeSelection;
      setProfile((prev) => ({
        ...prev,
        availability: {
          ...prev.availability,
          [day]: {
            ...prev.availability[day],
            [type]: time,
          },
        },
      }));
    }
    setShowTimePicker(false);
    setCurrentTimeSelection(null);
  };

  const Checkbox = ({ label, group }) => {
    const isSelected = profile[group].includes(label);
    return (
      <TouchableOpacity
        style={[
          styles.checkboxRow,
          { backgroundColor: isSelected ? "#3498db" : "#34495e" },
        ]}
        onPress={() => {
          setProfile((prev) => ({
            ...prev,
            [group]: isSelected
              ? prev[group].filter((x) => x !== label)
              : [...prev[group], label],
          }));
        }}
      >
        <Text style={{ color: "white" }}>{label}</Text>
        {isSelected && <Ionicons name="checkmark" size={20} color="white" />}
      </TouchableOpacity>
    );
  };

  const Radio = ({ label, group }) => {
    const isSelected = profile[group] === label;
    return (
      <TouchableOpacity
        style={[styles.radioRow, { backgroundColor: isSelected ? "#3498db" : "#34495e" }]}
        onPress={() => setProfile((prev) => ({ ...prev, [group]: label }))}
      >
        <Text style={styles.radioLabel}>{label}</Text>
        {isSelected && <Ionicons name="radio-button-on" size={20} color="white" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 1) {
                onBack();
              } else {
                setStep(step - 1);
              }
            }}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Select {currentTimeSelection?.type === "startTime" ? "Start" : "End"} Time
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Ionicons name="close" size={28} color="#2c3e50" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.timeList}>
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={styles.timeOption}
                    onPress={() => selectTime(time)}
                  >
                    <Text style={styles.timeOptionText}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Step 1: Name */}
        {step === 1 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Welcome, Coach!</Text>
            <Text style={styles.subtitle}>Let's set up your professional profile</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(t) => setProfile({ ...profile, name: t })}
              />
            </View>
            <TouchableOpacity
              style={[styles.buttonPrimary, { opacity: profile.name.trim() ? 1 : 0.5 }]}
              onPress={() => profile.name.trim() && setStep(2)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Age & Credentials */}
        {step === 2 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Basic Information</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.age}
                onChangeText={(t) => setProfile({ ...profile, age: t })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                style={styles.input}
                value={profile.gender}
                onChangeText={(t) => setProfile({ ...profile, gender: t })}
              />
              <Text style={styles.helperText}>Enter M or F</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Spoken Language</Text>
              <TextInput
                style={styles.input}
                value={profile.languages}
                onChangeText={(t) => setProfile({ ...profile, languages: t })}
              />
              <Text style={styles.helperText}>e.g., English, Chinese</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Credentials</Text>
              <TextInput
                style={styles.input}
                value={profile.credentials}
                onChangeText={(t) => setProfile({ ...profile, credentials: t })}
              />
              <Text style={styles.helperText}>e.g., CPT, CSCS, NASM, ACE</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                { opacity: profile.age && profile.credentials ? 1 : 0.5 },
              ]}
              disabled={!(profile.age && profile.credentials)}
              onPress={() => setStep(3)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Specializations */}
        {step === 3 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Specializations</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>
            {[
              "Weight Loss",
              "Muscle Building",
              "Strength Training",
              "Cardio Fitness",
              "HIIT Training",
              "Yoga & Flexibility",
              "Sports Performance",
              "Injury Rehabilitation",
              "Senior Fitness",
              "Youth Training",
              "Functional Training",
              "CrossFit",
            ].map((spec) => (
              <Checkbox key={spec} label={spec} group="specializations" />
            ))}
            <TouchableOpacity
              style={[styles.buttonPrimary, { opacity: profile.specializations.length > 0 ? 1 : 0.5 }]}
              onPress={() => profile.specializations.length > 0 && setStep(4)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Experience & Bio */}
        {step === 4 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Professional Experience</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.yearsOfExperience}
                onChangeText={(t) => setProfile({ ...profile, yearsOfExperience: t })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Professional Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={6}
                value={profile.bio}
                onChangeText={(t) => setProfile({ ...profile, bio: t })}
              />
              <Text style={styles.helperText}>Tell us about your coaching philosophy and expertise</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                { opacity: profile.yearsOfExperience && profile.bio ? 1 : 0.5 },
              ]}
              disabled={!(profile.yearsOfExperience && profile.bio)}
              onPress={() => setStep(5)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 5: Document Upload */}
        {step === 5 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Proof of Credentials</Text>
            <Text style={styles.subtitle}>Please upload documentation to verify your professional credentials</Text>
            
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3498db" />
              <Text style={styles.infoText}>
                Accepted documents: Coaching certification, license, or diploma (PDF, PNG, JPG)
              </Text>
            </View>

            <Text style={styles.documentTypeLabel}>Document Type *</Text>
            <View style={styles.documentTypeContainer}>
              {[
                { value: "certification", label: "Coaching Certification", desc: "CPT, NASM, ACE, or similar" },
                { value: "license", label: "Professional License", desc: "State/National coaching license" },
                { value: "diploma", label: "Degree/Diploma", desc: "Exercise Science or Kinesiology degree" },
                { value: "other", label: "Other", desc: "Other proof of qualification" },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.documentTypeOption,
                    profile.documentType === type.value && styles.documentTypeSelected,
                  ]}
                  onPress={() => setProfile({ ...profile, documentType: type.value })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.documentTypeOptionLabel}>{type.label}</Text>
                    <Text style={styles.documentTypeDesc}>{type.desc}</Text>
                  </View>
                  {profile.documentType === type.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Certificate/License Number</Text>
              <TextInput
                style={styles.input}
                value={profile.credentialNumber}
                onChangeText={(t) => setProfile({ ...profile, credentialNumber: t })}
              />
              <Text style={styles.helperText}>If applicable</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Issuing Organization/Institution</Text>
              <TextInput
                style={styles.input}
                value={profile.issuingOrganization}
                onChangeText={(t) => setProfile({ ...profile, issuingOrganization: t })}
              />
            </View>
            
            {profile.proofDocument && (
              <View style={styles.uploadedFileBox}>
                <Ionicons 
                  name={profile.proofDocument.type === 'application/pdf' ? "document-text" : "image"} 
                  size={24} 
                  color="#3498db" 
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.uploadedFileName}>{profile.proofDocument.name}</Text>
                  <Text style={styles.uploadedFileSize}>
                    {(profile.proofDocument.size / 1024).toFixed(2)} KB
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setProfile({ ...profile, proofDocument: null })}>
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={async () => {
                try {
                  const DocumentPicker = require('expo-document-picker');
                  const result = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
                    copyToCacheDirectory: true,
                  });

                  if (result.type === 'success' || !result.canceled) {
                    const file = result.assets ? result.assets[0] : result;
                    
                    if (file.size > 5 * 1024 * 1024) {
                      Alert.alert("File Too Large", "Please upload a file smaller than 5MB");
                      return;
                    }

                    const fileName = file.name.toLowerCase();
                    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
                    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

                    if (!hasValidExtension) {
                      Alert.alert("Invalid File Type", "Please upload a PDF, PNG, or JPG file");
                      return;
                    }

                    setProfile({
                      ...profile,
                      proofDocument: {
                        name: file.name,
                        uri: file.uri,
                        type: file.mimeType || file.type || 'application/octet-stream',
                        size: file.size,
                      }
                    });
                  }
                } catch (error) {
                  console.log('Document picker error:', error);
                  Alert.alert("Error", "Failed to pick document. Please try again.");
                }
              }}
            >
              <Ionicons name="cloud-upload" size={24} color="white" />
              <Text style={styles.uploadButtonText}>
                {profile.proofDocument ? "Change Document" : "Upload Document"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.uploadNote}>
              Maximum file size: 5MB • Supported formats: PDF, PNG, JPG
            </Text>

            <View style={styles.spacer} />

            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                { opacity: profile.documentType && profile.issuingOrganization && profile.proofDocument ? 1 : 0.5 },
              ]}
              disabled={!(profile.documentType && profile.issuingOrganization && profile.proofDocument)}
              onPress={() => setStep(6)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 6: Practice Location */}
        {step === 6 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Training Location</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Place of Practice</Text>
              <TextInput
                style={styles.input}
                value={profile.placeOfPractice}
                onChangeText={(t) => setProfile({ ...profile, placeOfPractice: t })}
              />
              <Text style={styles.helperText}>City, State/Country</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gym/Facility Name</Text>
              <TextInput
                style={styles.input}
                value={profile.gymName}
                onChangeText={(t) => setProfile({ ...profile, gymName: t })}
              />
              <Text style={styles.helperText}>Optional</Text>
            </View>
            
            <Text style={[styles.subtitle, { marginTop: 20 }]}>Do you offer virtual consultations?</Text>
            {["Yes", "No"].map((option) => (
              <Radio key={option} label={option} group="offersVirtualConsultation" />
            ))}

            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                { opacity: profile.placeOfPractice && profile.offersVirtualConsultation ? 1 : 0.5 },
              ]}
              disabled={!(profile.placeOfPractice && profile.offersVirtualConsultation)}
              onPress={() => setStep(7)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 7: Services Offered */}
        {step === 7 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Services Offered</Text>
            <Text style={styles.subtitle}>Select all services you provide</Text>
            {[
              "1-on-1 Personal Training",
              "Group Training",
              "Online Coaching",
              "Workout Programming",
              "Nutrition Coaching",
              "Form Check & Analysis",
              "Fitness Assessments",
              "Goal Setting & Tracking",
              "Corporate Wellness",
              "Athletic Performance",
            ].map((service) => (
              <Checkbox key={service} label={service} group="servicesOffered" />
            ))}
            <TouchableOpacity
              style={[styles.buttonPrimary, { opacity: profile.servicesOffered.length > 0 ? 1 : 0.5 }]}
              onPress={() => profile.servicesOffered.length > 0 && setStep(8)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 8: Availability */}
        {step === 8 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Availability</Text>
            <Text style={styles.subtitle}>Select your working days and hours</Text>
            
            {Object.keys(profile.availability).map((day) => (
              <View key={day} style={styles.availabilityCard}>
                <View style={styles.dayHeader}>
                  <TouchableOpacity
                    style={styles.dayCheckbox}
                    onPress={() => {
                      setProfile((prev) => ({
                        ...prev,
                        availability: {
                          ...prev.availability,
                          [day]: {
                            ...prev.availability[day],
                            available: !prev.availability[day].available,
                            startTime: "",
                            endTime: "",
                          },
                        },
                      }));
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        profile.availability[day].available && styles.checkboxChecked,
                      ]}
                    >
                      {profile.availability[day].available && (
                        <Ionicons name="checkmark" size={18} color="white" />
                      )}
                    </View>
                    <Text style={styles.dayText}>{day}</Text>
                  </TouchableOpacity>
                </View>

                {profile.availability[day].available && (
                  <View style={styles.timeInputContainer}>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>Start Time:</Text>
                      <TouchableOpacity
                        style={styles.timePicker}
                        onPress={() => openTimePicker(day, "startTime")}
                      >
                        <Text style={styles.timePickerText}>
                          {profile.availability[day].startTime || "Select"}
                        </Text>
                        <Ionicons name="time-outline" size={20} color="#3498db" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>End Time:</Text>
                      <TouchableOpacity
                        style={styles.timePicker}
                        onPress={() => openTimePicker(day, "endTime")}
                      >
                        <Text style={styles.timePickerText}>
                          {profile.availability[day].endTime || "Select"}
                        </Text>
                        <Ionicons name="time-outline" size={20} color="#3498db" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                {
                  opacity: Object.values(profile.availability).some(
                    (day) => day.available && day.startTime && day.endTime
                  )
                    ? 1
                    : 0.5,
                },
              ]}
              disabled={
                !Object.values(profile.availability).some(
                  (day) => day.available && day.startTime && day.endTime
                )
              }
              onPress={() => setStep(9)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 9: Review Summary */}
        {step === 9 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Review Your Information</Text>
            <Text style={styles.subtitle}>Please verify all details before proceeding</Text>
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Personal Information</Text>
              <Text style={styles.summaryText}>Name: {profile.name}</Text>
              <Text style={styles.summaryText}>Age: {profile.age}</Text>
              <Text style={styles.summaryText}>Credentials: {profile.credentials}</Text>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Specializations</Text>
              <Text style={styles.summaryText}>{profile.specializations.join(", ")}</Text>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Experience</Text>
              <Text style={styles.summaryText}>Years: {profile.yearsOfExperience}</Text>
              <Text style={styles.summaryText}>Bio: {profile.bio}</Text>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Training Details</Text>
              <Text style={styles.summaryText}>Location: {profile.placeOfPractice}</Text>
              {profile.gymName && (
                <Text style={styles.summaryText}>Gym/Facility: {profile.gymName}</Text>
              )}
              <Text style={styles.summaryText}>
                Virtual Training: {profile.offersVirtualConsultation}
              </Text>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Services Offered</Text>
              <Text style={styles.summaryText}>{profile.servicesOffered.join(", ")}</Text>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Availability</Text>
              {Object.entries(profile.availability).map(([day, data]) => 
                data.available ? (
                  <Text key={day} style={styles.summaryText}>
                    {day}: {data.startTime} - {data.endTime}
                  </Text>
                ) : null
              )}
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Credentials & Documentation</Text>
              <Text style={styles.summaryText}>Document Type: {
                profile.documentType === 'certification' ? 'Coaching Certification' :
                profile.documentType === 'license' ? 'Professional License' :
                profile.documentType === 'diploma' ? 'Degree/Diploma' : 'Other'
              }</Text>
              {profile.credentialNumber && (
                <Text style={styles.summaryText}>Credential Number: {profile.credentialNumber}</Text>
              )}
              <Text style={styles.summaryText}>Issuing Organization: {profile.issuingOrganization}</Text>
              <Text style={styles.summaryText}>
                Document: {profile.proofDocument ? profile.proofDocument.name : "No document"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.buttonSecondary, { marginTop: 10 }]}
              onPress={() => setStep(1)}
            >
              <Text style={styles.buttonText}>Edit Information</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => setStep(10)}
            >
              <Text style={styles.buttonText}>Confirm & Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 10: Email & Password */}
        {step === 10 && (
          <View style={styles.inner}>
            <Text style={styles.header}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Almost done! Set up your login credentials
            </Text>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.accountInput]}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, styles.accountPasswordContainer]}>
                <TextInput
                  style={[styles.passwordInput, styles.accountPasswordInput]}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={24}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Minimum 6 characters with uppercase, lowercase, and special character
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.buttonPrimary, { opacity: email && password ? 1 : 0.5 }]}
              disabled={!(email && password)}
              onPress={handleCoachSignUp}
            >
              <Text style={styles.buttonText}>Create Account</Text>
    </TouchableOpacity>
  </View>
)}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#2c3e50" 
  },
  backButton: { 
    marginTop: 10, 
    marginLeft: 20,
    paddingVertical: 10
  },
  inner: { 
    alignItems: "center", 
    padding: 20, 
    paddingBottom: 60 
  },
  header: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "white", 
    marginBottom: 10, 
    textAlign: "center" 
  },
  subtitle: { 
    fontSize: 14, 
    color: "white", 
    marginBottom: 15, 
    textAlign: "center" 
  },
  inputContainer: { 
    width: "90%", 
    marginVertical: 10 
  },
  label: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "600", 
    marginBottom: 8 
  },
  input: { 
    width: "100%", 
    backgroundColor: "white", 
    padding: 12, 
    borderRadius: 8
  },
  helperText: { 
    color: "#bbb", 
    fontSize: 12, 
    marginTop: 4 
  },
  textArea: { 
    height: 120, 
    textAlignVertical: "top" 
  },
  buttonPrimary: { 
    backgroundColor: "#3498db", 
    padding: 15, 
    borderRadius: 8, 
    marginTop: 15, 
    width: "90%", 
    alignItems: "center" 
  },
  buttonSecondary: {
    backgroundColor: "#95a5a6",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    width: "90%",
    alignItems: "center",
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  checkboxRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 12, 
    marginVertical: 5, 
    width: "90%", 
    borderRadius: 8 
  },
  radioRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: 12, 
    marginVertical: 5, 
    width: "90%", 
    borderRadius: 8 
  },
  radioLabel: { 
    color: "white", 
    fontSize: 14 
  },
  uploadButton: {
    backgroundColor: "#27ae60",
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    width: "90%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 10,
  },
  uploadedFileBox: {
    backgroundColor: "#34495e",
    padding: 15,
    borderRadius: 8,
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  uploadedFileName: {
    color: "white",
    marginLeft: 10,
    flex: 1,
  },
  uploadedFileSize: {
    color: "#95a5a6",
    fontSize: 12,
    marginTop: 2,
  },
  summaryContainer: {
    backgroundColor: "#34495e",
    padding: 15,
    borderRadius: 8,
    width: "90%",
    marginVertical: 10,
  },
  summaryTitle: {
    color: "#3498db",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryText: {
    color: "white",
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  availabilityCard: {
    backgroundColor: "#34495e",
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    width: "90%",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#3498db",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3498db",
  },
  dayText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  timeInputContainer: {
    marginTop: 10,
    paddingLeft: 36,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  timeLabel: {
    color: "#bbb",
    fontSize: 14,
    flex: 1,
  },
  timePicker: {
    backgroundColor: "#2c3e50",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 2,
    borderWidth: 1,
    borderColor: "#3498db",
  },
  timePickerText: {
    color: "white",
    fontSize: 14,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  timeList: {
    maxHeight: 400,
  },
  timeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  timeOptionText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  uploadNote: {
    color: "#95a5a6",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: "#e8f4f8",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    marginVertical: 10,
  },
  infoText: {
    color: "#2c3e50",
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  documentTypeLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 8,
    alignSelf: "flex-start",
    marginLeft: "5%",
  },
  documentTypeContainer: {
    width: "90%",
    marginBottom: 10,
  },
  documentTypeOption: {
    backgroundColor: "#34495e",
    padding: 14,
    borderRadius: 8,
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#34495e",
  },
  documentTypeSelected: {
    borderColor: "#3498db",
    backgroundColor: "#2c3e50",
  },
  documentTypeOptionLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  documentTypeDesc: {
    color: "#95a5a6",
    fontSize: 12,
    marginTop: 2,
  },
  spacer: {
    height: 20,
  },
    passwordContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#34495e",
  borderRadius: 8,
  paddingRight: 10,
},
passwordInput: {
  flex: 1,
  padding: 12,
  color: "black",
},
eyeIcon: {
  paddingHorizontal: 5,
},
accountInput: {
  backgroundColor: "#7699b1ff",
  color: "white",
},
accountPasswordContainer: {
  backgroundColor: "#7699b1ff",
},
accountPasswordInput: {
  color: "white",
},
});

export default CoachSignup;