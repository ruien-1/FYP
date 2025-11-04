import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import API from '../../api/backend';
import { signOut } from 'firebase/auth'
import { useNavigation } from '@react-navigation/native';

const NutriProfileTab = () => {
  const navigation = useNavigation();
  const [nutritionistData, setNutritionistData] = useState(null);
  const [servicesData, setServicesData] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit modals state
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editServicesModal, setEditServicesModal] = useState(false);
  const [editAvailabilityModal, setEditAvailabilityModal] = useState(false);
  const [editSpecializationsModal, setEditSpecializationsModal] = useState(false);
  const [editLanguagesModal, setEditLanguagesModal] = useState(false);
  const [editBioModal, setEditBioModal] = useState(false);
  const [editClinicModal, setEditClinicModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form states
  const [editedProfile, setEditedProfile] = useState({});
  const [editedServices, setEditedServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [editedAvailability, setEditedAvailability] = useState({});
  const [editedSpecializations, setEditedSpecializations] = useState([]);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [editedLanguages, setEditedLanguages] = useState([]);
  const [newLanguage, setNewLanguage] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedClinicName, setEditedClinicName] = useState('');
  const [message, setMessage] = useState(null);


  useEffect(() => {
    fetchNutritionistData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchNutritionistData = async () => {
    try {
      setLoading(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('No authenticated user');
        setNutritionistData(null);
        return;
      }

      const uid = currentUser.uid;
      console.log("Fetching nutritionist data for UID:", uid);
      
      const nutritionistResponse = await API.get(`/nutritionist-info/${uid}`);
      
      if (nutritionistResponse.data.success && nutritionistResponse.data.nutritionist) {
        setNutritionistData(nutritionistResponse.data.nutritionist);
      } else {
        setNutritionistData(null);
      }

      try {
        const servicesResponse = await API.get(`/servicesNutritionist/${uid}`);
        if (servicesResponse.data.success && servicesResponse.data.services) {
          setServicesData(servicesResponse.data.services);
        }
      } catch (servicesError) {
        console.log('No services found or error fetching services:', servicesError.response?.data);
        setServicesData(null);
      }

      try {
        const availabilityResponse = await API.get(`/availabilityNutritionist/${uid}`);
        if (availabilityResponse.data.success && availabilityResponse.data.availability) {
          setAvailabilityData(availabilityResponse.data.availability);
        }
      } catch (availabilityError) {
        console.log('No availability found or error fetching availability:', availabilityError.response?.data);
        setAvailabilityData(null);
      }

    } catch (error) {
      console.error('Error fetching nutritionist:', error);
      console.error('Error details:', error.response?.data);
      setNutritionistData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNutritionistData();
  };

  // Edit Profile Functions
  const openEditProfile = () => {
    setEditedProfile({
      name: nutritionistData?.name || '',
      credentials: nutritionistData?.credentials || '',
      placeOfPractice: nutritionistData?.placeOfPractice || '',
      yearsOfExperience: nutritionistData?.yearsOfExperience?.toString() || '',
      offersVirtualConsultation: nutritionistData?.offersVirtualConsultation || 'No',
      gender: nutritionistData?.gender || 'M'
    });
    setEditProfileModal(true);
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const updates = {
        ...editedProfile,
        yearsOfExperience: parseInt(editedProfile.yearsOfExperience) || 0
      };

      const response = await API.put(`/nutritionist-info/${uid}`, updates);
      
      if (response.data.success) {
        setMessage({ text: 'Profile updated successfully', type: 'success' });
        setEditProfileModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Services Functions
  const openEditServices = () => {
    const servicesSource = servicesData?.servicesOffered || nutritionistData?.servicesOffered || [];
    const servicesArray = Array.isArray(servicesSource) ? servicesSource : [servicesSource];
    setEditedServices(servicesArray);
    setEditServicesModal(true);
  };

  const addService = () => {
    if (newService.trim()) {
      setEditedServices([...editedServices, newService.trim()]);
      setNewService('');
    }
  };

  const removeService = (index) => {
    setEditedServices(editedServices.filter((_, i) => i !== index));
  };

  const saveServices = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const response = await API.put(`/servicesNutritionist/${uid}`, {
        servicesOffered: editedServices
      });
      
      if (response.data.success) {
        setMessage({ text: 'Services updated successfully', type: 'success' });
        setEditServicesModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating services:', error);
      setMessage({ text: 'Failed to update services', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Specializations Functions
  const openEditSpecializations = () => {
    const specializationsSource = nutritionistData?.specializations || [];
    let specializationsArray = [];
    
    if (typeof specializationsSource === 'string') {
      specializationsArray = [specializationsSource];
    } else if (Array.isArray(specializationsSource)) {
      specializationsArray = specializationsSource;
    }
    
    setEditedSpecializations(specializationsArray);
    setEditSpecializationsModal(true);
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setEditedSpecializations([...editedSpecializations, newSpecialization.trim()]);
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (index) => {
    setEditedSpecializations(editedSpecializations.filter((_, i) => i !== index));
  };

  const saveSpecializations = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const response = await API.put(`/nutritionist-info/${uid}`, {
        specializations: editedSpecializations
      });
      
      if (response.data.success) {
        setMessage({ text: 'Specializations updated successfully', type: 'success' });
        setEditSpecializationsModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating specializations:', error);
      setMessage({ text: 'Failed to update specializations', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Languages Functions
  const openEditLanguages = () => {
    const languagesSource = nutritionistData?.languages || [];
    let languagesArray = [];
    
    if (typeof languagesSource === 'string') {
      languagesArray = languagesSource.split(',').map(lang => lang.trim()).filter(Boolean);
    } else if (Array.isArray(languagesSource)) {
      languagesArray = languagesSource;
    }
    
    setEditedLanguages(languagesArray);
    setEditLanguagesModal(true);
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setEditedLanguages([...editedLanguages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (index) => {
    setEditedLanguages(editedLanguages.filter((_, i) => i !== index));
  };

  const saveLanguages = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const payload = {
        languages: editedLanguages
      };
      
      console.log('Updating languages with payload:', JSON.stringify(payload, null, 2));
      
      const response = await API.put(`/nutritionist-info/${uid}`, payload);
      
      console.log('Update response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        setMessage({ text: 'Languages updated successfully', type: 'success' });
        setEditLanguagesModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating languages:', error);
      console.error('Error details:', error.response?.data);
      setMessage({ text: 'Failed to update languages', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Bio Functions
  const openEditBio = () => {
    setEditedBio(nutritionistData?.bio || '');
    setEditBioModal(true);
  };

  const saveBio = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const response = await API.put(`/nutritionist-info/${uid}`, {
        bio: editedBio
      });
      
      if (response.data.success) {
        setMessage({ text: 'Bio updated successfully', type: 'success' });
        setEditBioModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating bio:', error);
      setMessage({ text: 'Failed to update bio', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Clinic Name Functions
  const openEditClinicName = () => {
    setEditedClinicName(nutritionistData?.clinicName || '');
    setEditClinicModal(true);
  };

  const saveClinicName = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const response = await API.put(`/nutritionist-info/${uid}`, {
        clinicName: editedClinicName
      });
      
      if (response.data.success) {
        setMessage({ text: 'Clinic name updated successfully', type: 'success' });
        setEditClinicModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating clinic name:', error);
      setMessage({ text: 'Failed to update clinic name', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Availability Functions
  const openEditAvailability = () => {
    const defaultAvailability = {
      Monday: { available: false, startTime: '09:00', endTime: '17:00' },
      Tuesday: { available: false, startTime: '09:00', endTime: '17:00' },
      Wednesday: { available: false, startTime: '09:00', endTime: '17:00' },
      Thursday: { available: false, startTime: '09:00', endTime: '17:00' },
      Friday: { available: false, startTime: '09:00', endTime: '17:00' },
      Saturday: { available: false, startTime: '09:00', endTime: '17:00' },
      Sunday: { available: false, startTime: '09:00', endTime: '17:00' }
    };
    
    setEditedAvailability(availabilityData?.availability || defaultAvailability);
    setEditAvailabilityModal(true);
  };

  const toggleDayAvailability = (day) => {
    setEditedAvailability({
      ...editedAvailability,
      [day]: {
        ...editedAvailability[day],
        available: !editedAvailability[day].available
      }
    });
  };

  const updateDayTime = (day, field, value) => {
    setEditedAvailability({
      ...editedAvailability,
      [day]: {
        ...editedAvailability[day],
        [field]: value
      }
    });
  };

  const saveAvailability = async () => {
    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      
      const response = await API.put(`/availabilityNutritionist/${uid}`, {
        availability: editedAvailability
      });
      
      if (response.data.success) {
        setMessage({ text: 'Availability updated successfully', type: 'success' });
        setEditAvailabilityModal(false);
        fetchNutritionistData();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      setMessage({ text: 'Failed to update availability', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderStatCard = (icon, label, value, color = '#007AFF', bgColor = '#E3F2FD') => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderServices = () => {
    let servicesSource = servicesData?.servicesOffered || nutritionistData?.servicesOffered;

    if (!servicesSource) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="briefcase-outline" size={56} color="#B0D4FF" />
          </View>
          <Text style={styles.emptyStateText}>No services listed yet</Text>
          <Text style={styles.emptyStateSubtext}>Add your services to help clients find you</Text>
        </View>
      );
    }

    const servicesArray = Array.isArray(servicesSource)
      ? servicesSource
      : typeof servicesSource === 'string'
      ? [servicesSource]
      : [];

    if (servicesArray.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="briefcase-outline" size={56} color="#B0D4FF" />
          </View>
          <Text style={styles.emptyStateText}>No services listed yet</Text>
          <Text style={styles.emptyStateSubtext}>Add your services to help clients find you</Text>
        </View>
      );
    }

    return (
      <View style={styles.serviceGrid}>
        {servicesArray.map((service, index) => (
          <View key={index} style={styles.serviceChip}>
            <View style={styles.serviceIconWrapper}>
              <Ionicons name="medkit" size={16} color="#007AFF" />
            </View>
            <Text style={styles.serviceText}>{service}</Text>
          </View>
        ))}
      </View>
    );
  };

const handleLogout = async () => {
  try {
    await signOut(auth);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  } catch (error) {
    console.error('Error signing out:', error);
    setMessage({ text: 'Failed to logout', type: 'error' });
  }
};

  const renderSpecializations = () => {
    const specializationsData = nutritionistData?.specializations;
    
    if (!specializationsData) {
      return <Text style={styles.noDataText}>No specializations listed</Text>;
    }

    let specializationsArray = [];
    if (typeof specializationsData === 'string') {
      specializationsArray = [specializationsData];
    } else if (Array.isArray(specializationsData)) {
      specializationsArray = specializationsData;
    }

    if (specializationsArray.length === 0) {
      return <Text style={styles.noDataText}>No specializations listed</Text>;
    }

    return (
      <View style={styles.chipsContainer}>
        {specializationsArray.map((spec, index) => (
          <View key={index} style={styles.chip}>
            <View style={styles.chipIconWrapper}>
              <Ionicons name="checkmark-circle" size={14} color="#007AFF" />
            </View>
            <Text style={styles.chipText}>{spec}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderLanguages = () => {
    const languagesData = nutritionistData?.languages;
    
    if (!languagesData) return null;

    let languagesArray = [];
    if (typeof languagesData === 'string') {
      languagesArray = languagesData.split(',').map(lang => lang.trim()).filter(Boolean);
    } else if (Array.isArray(languagesData)) {
      languagesArray = languagesData;
    }

    if (languagesArray.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderWithEdit}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrapper}>
              <Ionicons name="language" size={20} color="#007AFF" />
            </View>
            <Text style={styles.sectionTitle}>Languages</Text>
          </View>
          <TouchableOpacity style={styles.editIconButton} onPress={openEditLanguages}>
            <Ionicons name="create" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.languagesContainer}>
            {languagesArray.map((language, index) => (
              <View key={index} style={styles.languageChip}>
                <Ionicons name="globe-outline" size={16} color="#5C6BC0" />
                <Text style={styles.languageText}>{language}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderAvailability = () => {
    if (!availabilityData || !availabilityData.availability) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={56} color="#B0D4FF" />
          </View>
          <Text style={styles.emptyStateText}>No availability set yet</Text>
          <Text style={styles.emptyStateSubtext}>Set your schedule to receive bookings</Text>
        </View>
      );
    }

    const days = Object.entries(availabilityData.availability);

    return (
      <View style={styles.availabilityCard}>
        {days.map(([day, info], index) => (
          <View key={index} style={[styles.availabilityRow, index === days.length - 1 && styles.availabilityRowLast]}>
            <View style={styles.availabilityDaySection}>
              <View style={[styles.dayIndicator, info.available && styles.dayIndicatorActive]} />
              <Text style={styles.availabilityDay}>{day}</Text>
            </View>
            {info.available ? (
              <View style={styles.availabilityTimeChip}>
                <Ionicons name="time-outline" size={14} color="#007AFF" />
                <Text style={styles.availabilityTime}>
                  {info.startTime} – {info.endTime}
                </Text>
              </View>
            ) : (
              <Text style={styles.unavailableText}>Unavailable</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!nutritionistData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrapper}>
            <Ionicons name="alert-circle-outline" size={72} color="#FF3B30" />
          </View>
          <Text style={styles.errorText}>Profile Not Found</Text>
          <Text style={styles.errorSubtext}>
            Unable to load your nutritionist profile. Please ensure you're logged in.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNutritionistData}>
            <Ionicons name="refresh-outline" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {message && (
        <View
          style={[
            styles.messageBox,
            message.type === 'success' ? styles.successBox : styles.errorBox,
          ]}
        >
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileBackground}>
              <View style={styles.profileGradientOverlay} />
            </View>
            <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfile}>
              <Ionicons name="create" size={18} color="#007AFF" />
            </TouchableOpacity>
            <View style={styles.profileContent}>
              {nutritionistData.profileImage ? (
                <Image 
                  source={{ uri: nutritionistData.profileImage }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.placeholderText}>
                    {nutritionistData.name?.charAt(0).toUpperCase() || 'N'}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{nutritionistData.name || 'Nutritionist'}</Text>
              <View style={styles.credentialsBadge}>
                <Ionicons name="ribbon" size={14} color="#007AFF" />
                <Text style={styles.credentials}>{nutritionistData.credentials || 'RD'}</Text>
              </View>
              {nutritionistData.placeOfPractice && (
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={14} color="#5C6BC0" />
                  <Text style={styles.locationText}>{nutritionistData.placeOfPractice}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {renderStatCard('briefcase', 'Experience', `${nutritionistData.yearsOfExperience || 0} years`, '#007AFF', '#E3F2FD')}
          {renderStatCard('videocam', 'Consultation', nutritionistData.offersVirtualConsultation === 'Yes' ? 'Virtual' : 'In-person', '#26A69A', '#E0F2F1')}
          {renderStatCard(nutritionistData.gender === 'M' ? 'male' : 'female', 'Gender', nutritionistData.gender === 'M' ? 'Male' : 'Female', '#AB47BC', '#F3E5F5')}
        </View>

        {/* Bio Section */}
        {nutritionistData.bio && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithEdit}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="document-text" size={20} color="#007AFF" />
                </View>
                <Text style={styles.sectionTitle}>About Me</Text>
              </View>
              <TouchableOpacity style={styles.editIconButton} onPress={openEditBio}>
                <Ionicons name="create" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.bioText}>{nutritionistData.bio}</Text>
            </View>
          </View>
        )}

        {/* Clinic Name Section */}
        {nutritionistData.clinicName && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithEdit}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="medical" size={20} color="#007AFF" />
                </View>
                <Text style={styles.sectionTitle}>Clinic Name</Text>
              </View>
              <TouchableOpacity style={styles.editIconButton} onPress={openEditClinicName}>
                <Ionicons name="create" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <View style={styles.clinicInfoContainer}>
                <View style={styles.clinicIconWrapper}>
                  <Ionicons name="business" size={24} color="#007AFF" />
                </View>
                <Text style={styles.clinicNameText}>{nutritionistData.clinicName}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Specializations */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithEdit}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name="star" size={20} color="#007AFF" />
              </View>
              <Text style={styles.sectionTitle}>Specializations</Text>
            </View>
            <TouchableOpacity style={styles.editIconButton} onPress={openEditSpecializations}>
              <Ionicons name="create" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {renderSpecializations()}
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithEdit}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name="medkit" size={20} color="#007AFF" />
              </View>
              <Text style={styles.sectionTitle}>Services Offered</Text>
            </View>
            <TouchableOpacity style={styles.editIconButton} onPress={openEditServices}>
              <Ionicons name="create" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          {renderServices()}
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithEdit}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name="calendar" size={20} color="#007AFF" />
              </View>
              <Text style={styles.sectionTitle}>Weekly Schedule</Text>
            </View>
            <TouchableOpacity style={styles.editIconButton} onPress={openEditAvailability}>
              <Ionicons name="create" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          {renderAvailability()}
        </View>

        {/* Languages */}
        {renderLanguages()}

        {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditProfileModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile.name}
                    onChangeText={(text) => setEditedProfile({...editedProfile, name: text})}
                    placeholder="Your name"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Credentials</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="ribbon-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile.credentials}
                    onChangeText={(text) => setEditedProfile({...editedProfile, credentials: text})}
                    placeholder="e.g., RD, RDN, CDN"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Place of Practice</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile.placeOfPractice}
                    onChangeText={(text) => setEditedProfile({...editedProfile, placeOfPractice: text})}
                    placeholder="Your clinic/hospital location"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Years of Experience</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile.yearsOfExperience}
                    onChangeText={(text) => setEditedProfile({...editedProfile, yearsOfExperience: text})}
                    placeholder="Years"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Virtual Consultation</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity 
                    style={[styles.radioButton, editedProfile.offersVirtualConsultation === 'Yes' && styles.radioButtonActive]}
                    onPress={() => setEditedProfile({...editedProfile, offersVirtualConsultation: 'Yes'})}
                  >
                    <Ionicons 
                      name={editedProfile.offersVirtualConsultation === 'Yes' ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={20} 
                      color={editedProfile.offersVirtualConsultation === 'Yes' ? '#007AFF' : '#999'} 
                    />
                    <Text style={[styles.radioText, editedProfile.offersVirtualConsultation === 'Yes' && styles.radioTextActive]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.radioButton, editedProfile.offersVirtualConsultation === 'No' && styles.radioButtonActive]}
                    onPress={() => setEditedProfile({...editedProfile, offersVirtualConsultation: 'No'})}
                  >
                    <Ionicons 
                      name={editedProfile.offersVirtualConsultation === 'No' ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={20} 
                      color={editedProfile.offersVirtualConsultation === 'No' ? '#007AFF' : '#999'} 
                    />
                    <Text style={[styles.radioText, editedProfile.offersVirtualConsultation === 'No' && styles.radioTextActive]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity 
                    style={[styles.radioButton, editedProfile.gender === 'M' && styles.radioButtonActive]}
                    onPress={() => setEditedProfile({...editedProfile, gender: 'M'})}
                  >
                    <Ionicons 
                      name={editedProfile.gender === 'M' ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={20} 
                      color={editedProfile.gender === 'M' ? '#007AFF' : '#999'} 
                    />
                    <Text style={[styles.radioText, editedProfile.gender === 'M' && styles.radioTextActive]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.radioButton, editedProfile.gender === 'F' && styles.radioButtonActive]}
                    onPress={() => setEditedProfile({...editedProfile, gender: 'F'})}
                  >
                    <Ionicons 
                      name={editedProfile.gender === 'F' ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={20} 
                      color={editedProfile.gender === 'F' ? '#007AFF' : '#999'} 
                    />
                    <Text style={[styles.radioText, editedProfile.gender === 'F' && styles.radioTextActive]}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Specializations Modal */}
      <Modal visible={editSpecializationsModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Specializations</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditSpecializationsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.addServiceContainer}>
                <View style={styles.serviceInputWrapper}>
                  <Ionicons name="star-outline" size={20} color="#999" />
                  <TextInput
                    style={styles.serviceInput}
                    value={newSpecialization}
                    onChangeText={setNewSpecialization}
                    placeholder="Add a specialization"
                    placeholderTextColor="#999"
                    onSubmitEditing={addSpecialization}
                  />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={addSpecialization}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.servicesListContainer}>
                {editedSpecializations.map((specialization, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <View style={styles.serviceItemContent}>
                      <View style={styles.serviceItemIcon}>
                        <Ionicons name="star" size={16} color="#007AFF" />
                      </View>
                      <Text style={styles.serviceItemText}>{specialization}</Text>
                    </View>
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeSpecialization(index)}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={saveSpecializations}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Specializations</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Languages Modal */}
      <Modal visible={editLanguagesModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Languages</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditLanguagesModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
             
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.addServiceContainer}>
                  <View style={styles.serviceInputWrapper}>
                    <Ionicons name="language-outline" size={20} color="#999" />
                    <TextInput
                      style={styles.serviceInput}
                      value={newLanguage}
                      onChangeText={setNewLanguage}
                      placeholder="Add a language"
                      placeholderTextColor="#999"
                      onSubmitEditing={addLanguage}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity style={styles.addButton} onPress={addLanguage}>
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.servicesListContainer}>
                  {editedLanguages.map((language, index) => (
                    <View key={index} style={styles.serviceItem}>
                      <View style={styles.serviceItemContent}>
                        <View style={[styles.serviceItemIcon, { backgroundColor: '#F3E5F5' }]}>
                          <Ionicons name="globe-outline" size={16} color="#5C6BC0" />
                        </View>
                        <Text style={styles.serviceItemText}>{language}</Text>
                      </View>
                      <TouchableOpacity style={styles.removeButton} onPress={() => removeLanguage(index)}>
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveLanguages}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Languages</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Services Modal */}
      <Modal visible={editServicesModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Services</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditServicesModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.addServiceContainer}>
                <View style={styles.serviceInputWrapper}>
                  <Ionicons name="add-circle-outline" size={20} color="#999" />
                  <TextInput
                    style={styles.serviceInput}
                    value={newService}
                    onChangeText={setNewService}
                    placeholder="Add a new service"
                    placeholderTextColor="#999"
                    onSubmitEditing={addService}
                  />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={addService}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.servicesListContainer}>
                {editedServices.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <View style={styles.serviceItemContent}>
                      <View style={styles.serviceItemIcon}>
                        <Ionicons name="medkit" size={16} color="#007AFF" />
                      </View>
                      <Text style={styles.serviceItemText}>{service}</Text>
                    </View>
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeService(index)}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={saveServices}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Services</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Availability Modal */}
      <Modal visible={editAvailabilityModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Availability</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditAvailabilityModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(editedAvailability).map(([day, info]) => (
                <View key={day} style={styles.dayContainer}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <View style={[styles.dayDot, info.available && styles.dayDotActive]} />
                      <Text style={styles.dayName}>{day}</Text>
                    </View>
                    <Switch
                      value={info.available}
                      onValueChange={() => toggleDayAvailability(day)}
                      trackColor={{ false: '#E0E0E0', true: '#B3D4FF' }}
                      thumbColor={info.available ? '#007AFF' : '#f4f3f4'}
                      ios_backgroundColor="#E0E0E0"
                    />
                  </View>
                  {info.available && (
                    <View style={styles.timeInputs}>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>Start Time</Text>
                        <View style={styles.timeInputWrapper}>
                          <Ionicons name="time-outline" size={16} color="#999" />
                          <TextInput
                            style={styles.timeInput}
                            value={info.startTime}
                            onChangeText={(text) => updateDayTime(day, 'startTime', text)}
                            placeholder="09:00"
                            placeholderTextColor="#999"
                          />
                        </View>
                      </View>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>End Time</Text>
                        <View style={styles.timeInputWrapper}>
                          <Ionicons name="time-outline" size={16} color="#999" />
                          <TextInput
                            style={styles.timeInput}
                            value={info.endTime}
                            onChangeText={(text) => updateDayTime(day, 'endTime', text)}
                            placeholder="17:00"
                            placeholderTextColor="#999"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={saveAvailability}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Availability</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Bio Modal */}
      <Modal visible={editBioModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Bio</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditBioModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>About You</Text>
                  <View style={styles.bioInputWrapper}>
                    <TextInput
                      style={styles.bioInput}
                      value={editedBio}
                      onChangeText={setEditedBio}
                      placeholder="Tell clients about your nutrition philosophy, experience, and what makes you unique..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={8}
                      textAlignVertical="top"
                    />
                  </View>
                  <Text style={styles.charCount}>{editedBio.length} / 500 characters</Text>
                </View>
              </ScrollView>

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={saveBio}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Bio</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Clinic Name Modal */}
      <Modal visible={editClinicModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Clinic Name</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditClinicModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Clinic / Practice Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editedClinicName}
                      onChangeText={setEditedClinicName}
                      placeholder="e.g., Health Nutrition Clinic, Wellness Center"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={saveClinicName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Clinic Name</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E8F0FF' 
  },
  scrollView: { 
    flex: 1 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#666', 
    fontWeight: '500' 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 32 
  },
  errorIconWrapper: {
    marginBottom: 24,
  },
  errorText: { 
    fontSize: 22, 
    color: '#1A1A1A', 
    fontWeight: '700', 
    marginBottom: 8 
  },
  errorSubtext: { 
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 24 
  },
  retryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 28, 
    paddingVertical: 14, 
    borderRadius: 14, 
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  
  // Message Banner
  messageBox: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  successBox: { backgroundColor: '#DFF2BF' },
  errorBox: { backgroundColor: '#FFD2D2' },
  messageText: { fontSize: 14, fontWeight: '600', color: '#333' },
  
  // Profile Section
  profileSection: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    marginBottom: 24 
  },
  profileCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4 
  },
  profileBackground: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 140, 
    backgroundColor: '#007AFF',
  },
  profileGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editProfileButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  profileContent: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: '#F0F0F0',
  },
  profileImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 14,
    textAlign: 'center',
  },
  credentialsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 8,
    gap: 5,
  },
  credentials: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    marginTop: 8,
    gap: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '500',
  },
  
  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Section Styles
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderWithEdit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  
  // Chips and Tags
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 6,
  },
  chipIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Services
  serviceGrid: {
    gap: 10,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E3F2FD',
  },
  serviceIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  
  // Languages
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 6,
  },
  languageText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '600',
  },
  
  // Availability
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  availabilityRowLast: {
    borderBottomWidth: 0,
  },
  availabilityDaySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dayIndicatorActive: {
    backgroundColor: '#4CAF50',
  },
  availabilityDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  availabilityTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  availabilityTime: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  unavailableText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  
  // Empty States
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 6,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontWeight: '400',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  clinicInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clinicIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicNameText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },
  bioInputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
    padding: 16,
  },
  bioInput: {
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },
  footer: {
    height: 40,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    maxHeight: '70%',
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  
  // Radio Buttons
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  radioButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  radioText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  radioTextActive: {
    color: '#007AFF',
  },
  
  // Save Button
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    marginHorizontal: 24,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#B3D4FF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Service Input
  addServiceContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  serviceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
  },
  serviceInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  servicesListContainer: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
  },
  serviceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  serviceItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceItemText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  
  // Day Container (Availability Modal)
  dayContainer: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  dayDotActive: {
    backgroundColor: '#4CAF50',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  timeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
  },
  timeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },

  logoutContainer: {
  paddingHorizontal: 16,
  marginBottom: 24,
},
logoutButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFF5F5',
  paddingVertical: 14,
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: '#FFE0E0',
  gap: 8,
},
logoutButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FF3B30',
},
});

export default NutriProfileTab;