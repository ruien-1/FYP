import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import admin from "firebase-admin";
import fs from "fs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch"; // for API calls
import vision from "@google-cloud/vision";
import { searchComplex, searchByNutrients, addDetailsRecipeList } from "./spoonacular.js";
import activitiesData from './activitiesData.js';

// Load service account
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccount.json", "utf8")
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // Firestore reference

const app = express();
app.use(cors());
//app.use(express.json());

// Increase JSON body size to handle large base64 images
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true })); 

// Initialize Google Vision client
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // points to your JSON key
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to FYP backend API' });
});

app.get("/meals", async (req, res) => {
  try {
    const snapshot = await db.collection("meals").get();
    const meals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post("/complete-signup", async (req, res) => {
  try {
    const { uid, email, profile } = req.body;

    if (!profile) {
      return res.status(400).json({ success: false, error: "Profile is required" });
    }

    const {
      name,
      gender,
      age,
      height,
      weight,
      postalCode,
      countryofresidence,
      goals = [],
      challenges = [],
      personalizedPref,
      activityLevel,
      targetWeight,
      weightLossGoal,
    } = profile;

    // Save user_info
    await db.collection("user_info").doc(uid).set({
      uid,
      gender,
      age,
      height,
      weight,
      postalCode,
      countryofresidence,
      activityLevel,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save user
    await db.collection("user").doc(uid).set({
      id: uid,
      name,
      email,
      role: "user",
      accountstatus: "active",
      created_on: admin.firestore.FieldValue.serverTimestamp(),
      membership: "free",
    });

    // Save goals
    await db.collection("goals").doc(uid).set({
      uid,
      goals,
      challenges,
      personalizedPref,
      targetWeight,
      weightLossGoal,
    });

    console.log(" User info, user, and goals saved to Firestore");
    res.status(200).json({ success: true, message: "Signup completed successfully" });
  } catch (error) {
    console.error("Firestore error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this endpoint after your /complete-signup endpoint

app.post("/complete-nutritionist-signup", async (req, res) => {
  try {
    const { uid, email, profile } = req.body;

    if (!profile) {
      return res.status(400).json({ success: false, error: "Profile is required" });
    }

    const {
      name,
      age,
      credentials,
      specializations = [],
      yearsOfExperience,
      bio,
      documentType,
      credentialNumber,
      issuingOrganization,
      proofDocument,
      placeOfPractice,
      clinicName,
      offersVirtualConsultation,
      servicesOffered = [],
      availability,
    } = profile;

    // Save nutritionist_info
    await db.collection("nutritionist_info").doc(uid).set({
      uid,
      name,
      age,
      credentials,
      specializations,
      yearsOfExperience,
      bio,
      placeOfPractice,
      clinicName,
      offersVirtualConsultation,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save nutritionist (user account)
    await db.collection("nutritionist").doc(uid).set({
      id: uid,
      name,
      email,
      accountstatus: "pending",
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save credentials
    await db.collection("credentialsNutritionist").doc(uid).set({
      uid,
      documentType,
      credentialNumber,
      issuingOrganization,
      proofDocument,
      verified: false,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save services offered
    await db.collection("servicesNutritionist").doc(uid).set({
      uid,
      servicesOffered,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save availability
    await db.collection("availabilityNutritionist").doc(uid).set({
      uid,
      availability,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Nutritionist info, credentials, services, and availability saved to Firestore");
    res.status(200).json({ success: true, message: "Nutritionist signup completed successfully" });
  } catch (error) {
    console.error("Firestore error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/complete-coach-signup", async (req, res) => {
  try {
    const { uid, email, profile } = req.body;

    if (!profile) {
      return res.status(400).json({ success: false, error: "Profile is required" });
    }

    const {
      name,
      age,
      gender,
      languages,
      credentials,
      specializations = [],
      yearsOfExperience,
      bio,
      documentType,
      credentialNumber,
      issuingOrganization,
      proofDocument,
      placeOfPractice,
      gymName,
      offersVirtualConsultation,
      servicesOffered = [],
      availability,
    } = profile;

    // Save coach_info
    await db.collection("coach_info").doc(uid).set({
      uid,
      name,
      age,
      gender,
      languages,
      credentials,
      specializations,
      yearsOfExperience,
      bio,
      placeOfPractice,
      gymName,
      offersVirtualConsultation,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save coach (user account)
    await db.collection("coach").doc(uid).set({
      id: uid,
      name,
      email,
      accountstatus: "pending",
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save credentials
    await db.collection("credentialsCoach").doc(uid).set({
      uid,
      documentType,
      credentialNumber,
      issuingOrganization,
      proofDocument,
      verified: false,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save services offered
    await db.collection("servicesCoach").doc(uid).set({
      uid,
      servicesOffered,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save availability
    await db.collection("availabilityCoach").doc(uid).set({
      uid,
      availability,
      created_on: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Coach info, credentials, services, and availability saved to Firestore");
    res.status(200).json({ success: true, message: "Coach signup completed successfully" });
  } catch (error) {
    console.error("Firestore error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Add these endpoints to your backend server

// Get all coaches
app.get("/coaches", async (req, res) => {
  try {
    const coachesSnapshot = await db.collection("coach_info").get();
    const coaches = [];

    for (const doc of coachesSnapshot.docs) {
      const coachData = doc.data();
      
      // Get account status
      const coachAccountDoc = await db.collection("coach").doc(doc.id).get();
      const accountStatus = coachAccountDoc.exists ? coachAccountDoc.data().accountstatus : "pending";
      
      // Only include approved coaches
      if (accountStatus === "approved") {
        coaches.push({
          id: doc.id,
          ...coachData,
          accountStatus
        });
      }
    }

    res.status(200).json(coaches);
  } catch (error) {
    console.error("Error fetching coaches:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all nutritionists
app.get("/nutritionists", async (req, res) => {
  try {
    const nutritionistsSnapshot = await db.collection("nutritionist_info").get();
    const nutritionists = [];

    for (const doc of nutritionistsSnapshot.docs) {
      const nutritionistData = doc.data();
      
      // Get account status
      const nutritionistAccountDoc = await db.collection("nutritionist").doc(doc.id).get();
      const accountStatus = nutritionistAccountDoc.exists ? nutritionistAccountDoc.data().accountstatus : "pending";
      
      // Only include approved nutritionists
      if (accountStatus === "approved") {
        nutritionists.push({
          id: doc.id,
          ...nutritionistData,
          accountStatus
        });
      }
    }

    res.status(200).json(nutritionists);
  } catch (error) {
    console.error("Error fetching nutritionists:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific coach by ID
app.get("/coach/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    
    const coachDoc = await db.collection("coach_info").doc(uid).get();
    
    if (!coachDoc.exists) {
      return res.status(404).json({ success: false, error: "Coach not found" });
    }

    const coachData = coachDoc.data();
    
    // Get services
    const servicesDoc = await db.collection("servicesCoach").doc(uid).get();
    const services = servicesDoc.exists ? servicesDoc.data().servicesOffered : [];
    
    // Get availability
    const availabilityDoc = await db.collection("availabilityCoach").doc(uid).get();
    const availability = availabilityDoc.exists ? availabilityDoc.data().availability : {};

    res.status(200).json({
      ...coachData,
      services,
      availability
    });
  } catch (error) {
    console.error("Error fetching coach:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific nutritionist by ID
app.get("/nutritionist/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    
    const nutritionistDoc = await db.collection("nutritionist_info").doc(uid).get();
    
    if (!nutritionistDoc.exists) {
      return res.status(404).json({ success: false, error: "Nutritionist not found" });
    }

    const nutritionistData = nutritionistDoc.data();
    
    // Get services
    const servicesDoc = await db.collection("servicesNutritionist").doc(uid).get();
    const services = servicesDoc.exists ? servicesDoc.data().servicesOffered : [];
    
    // Get availability
    const availabilityDoc = await db.collection("availabilityNutritionist").doc(uid).get();
    const availability = availabilityDoc.exists ? availabilityDoc.data().availability : {};

    res.status(200).json({
      ...nutritionistData,
      services,
      availability
    });
  } catch (error) {
    console.error("Error fetching nutritionist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST rating for coach
app.post("/coach/:uid/rating", async (req, res) => {
  try {
    const { uid } = req.params;
    const { rating, comment, userId } = req.body;

    // Validation
    if (!rating || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating and userId are required" 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating must be between 1 and 5" 
      });
    }

    // Create rating document
    const ratingData = {
      coachId: uid,
      userId,
      rating: Number(rating),
      comment: comment || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add to CoachRating collection
    const ratingRef = await db.collection("CoachRating").add(ratingData);

    // Update coach's average rating
    const ratingsSnapshot = await db
      .collection("CoachRating")
      .where("coachId", "==", uid)
      .get();

    const totalRatings = ratingsSnapshot.size;
    const sumRatings = ratingsSnapshot.docs.reduce(
      (sum, doc) => sum + doc.data().rating,
      0
    );
    const averageRating = sumRatings / totalRatings;

    // Update coach_info with new average
    await db.collection("coach_info").doc(uid).update({
      averageRating: averageRating,
      totalRatings: totalRatings,
    });

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      ratingId: ratingRef.id,
      averageRating,
      totalRatings,
    });
  } catch (error) {
    console.error("Error submitting coach rating:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// POST rating for nutritionist
app.post("/nutritionist/:uid/rating", async (req, res) => {
  try {
    const { uid } = req.params;
    const { rating, comment, userId } = req.body;

    // Validation
    if (!rating || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating and userId are required" 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: "Rating must be between 1 and 5" 
      });
    }

    // Create rating document
    const ratingData = {
      nutritionistId: uid,
      userId,
      rating: Number(rating),
      comment: comment || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add to NutritionistRating collection
    const ratingRef = await db.collection("NutritionistRating").add(ratingData);

    // Update nutritionist's average rating
    const ratingsSnapshot = await db
      .collection("NutritionistRating")
      .where("nutritionistId", "==", uid)
      .get();

    const totalRatings = ratingsSnapshot.size;
    const sumRatings = ratingsSnapshot.docs.reduce(
      (sum, doc) => sum + doc.data().rating,
      0
    );
    const averageRating = sumRatings / totalRatings;

    // Update nutritionist_info with new average
    await db.collection("nutritionist_info").doc(uid).update({
      averageRating: averageRating,
      totalRatings: totalRatings,
    });

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      ratingId: ratingRef.id,
      averageRating,
      totalRatings,
    });
  } catch (error) {
    console.error("Error submitting nutritionist rating:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ratings for a coach - WITH USER NAMES
app.get("/coach/:uid/ratings", async (req, res) => {
  try {
    const { uid } = req.params;
    const { limit = 10 } = req.query;

    const ratingsSnapshot = await db
      .collection("CoachRating")
      .where("coachId", "==", uid)
      .limit(Number(limit))
      .get();

    // Fetch user names for each rating
    const ratingsWithNames = await Promise.all(
      ratingsSnapshot.docs.map(async (doc) => {
        const ratingData = doc.data();
        let userName = "Anonymous";

        // Try to fetch user name from user collection (not users!)
        if (ratingData.userId) {
          try {
            const userDoc = await db.collection("user").doc(ratingData.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              userName = userData.name || "Anonymous";
            }
          } catch (error) {
            console.error("Error fetching user name:", error);
          }
        }

        return {
          id: doc.id,
          ...ratingData,
          userName,
          createdAt: ratingData.createdAt?.toDate(),
        };
      })
    );

    res.status(200).json({ success: true, ratings: ratingsWithNames });
  } catch (error) {
    console.error("Error fetching coach ratings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ratings for a nutritionist - WITH USER NAMES (CORRECTED)
app.get("/nutritionist/:uid/ratings", async (req, res) => {
  try {
    const { uid } = req.params;
    const { limit = 10 } = req.query;

    const ratingsSnapshot = await db
      .collection("NutritionistRating")
      .where("nutritionistId", "==", uid)
      .limit(Number(limit))
      .get();

    // Fetch user names for each rating
    const ratingsWithNames = await Promise.all(
      ratingsSnapshot.docs.map(async (doc) => {
        const ratingData = doc.data();
        let userName = "Anonymous";

        // Try to fetch user name from user collection (not users!)
        if (ratingData.userId) {
          try {
            const userDoc = await db.collection("user").doc(ratingData.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              userName = userData.name || "Anonymous";
            }
          } catch (error) {
            console.error("Error fetching user name:", error);
          }
        }

        return {
          id: doc.id,
          ...ratingData,
          userName,
          createdAt: ratingData.createdAt?.toDate(),
        };
      })
    );

    res.status(200).json({ success: true, ratings: ratingsWithNames });
  } catch (error) {
    console.error("Error fetching nutritionist ratings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Assign coach to user
app.post("/user/:userId/assign-coach", async (req, res) => {
  try {
    const { userId } = req.params;
    const { coachId } = req.body;

    if (!coachId) {
      return res.status(400).json({ 
        success: false, 
        error: "Coach ID is required" 
      });
    }

    // Verify user exists
    const userDoc = await db.collection("user").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    // Verify coach exists and is approved
    const coachDoc = await db.collection("coach").doc(coachId).get();
    if (!coachDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Coach not found" 
      });
    }

    const coachData = coachDoc.data();
    if (coachData.accountstatus !== "approved") {
      return res.status(400).json({ 
        success: false, 
        error: "Coach is not approved" 
      });
    }

    // Update user document with coachId
    await db.collection("user").doc(userId).update({
      coachId: coachId,
      coachAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Coach ${coachId} assigned to user ${userId}`);
    
    res.status(200).json({ 
      success: true, 
      message: "Coach assigned successfully",
      coachId 
    });
  } catch (error) {
    console.error("Error assigning coach:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's assigned coach
app.get("/user/:userId/coach", async (req, res) => {
  try {
    const { userId } = req.params;

    const userDoc = await db.collection("user").doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    const userData = userDoc.data();
    
    if (!userData.coachId) {
      return res.status(200).json({ 
        success: true, 
        hasCoach: false,
        message: "No coach assigned" 
      });
    }

    // Fetch coach details
    const coachInfoDoc = await db.collection("coach_info").doc(userData.coachId).get();
    
    if (!coachInfoDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Assigned coach not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      hasCoach: true,
      coach: {
        id: userData.coachId,
        ...coachInfoDoc.data()
      }
    });
  } catch (error) {
    console.error("Error fetching user's coach:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Assign nutritionist to user
app.post("/user/:userId/assign-nutritionist", async (req, res) => {
  try {
    const { userId } = req.params;
    const { nutritionistId } = req.body;

    if (!nutritionistId) {
      return res.status(400).json({ 
        success: false, 
        error: "Nutritionist ID is required" 
      });
    }

    // Verify user exists
    const userDoc = await db.collection("user").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    // Verify nutritionist exists and is approved
    const nutritionistDoc = await db.collection("nutritionist").doc(nutritionistId).get();
    if (!nutritionistDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Nutritionist not found" 
      });
    }

    const nutritionistData = nutritionistDoc.data();
    if (nutritionistData.accountstatus !== "approved") {
      return res.status(400).json({ 
        success: false, 
        error: "Nutritionist is not approved" 
      });
    }

    // Update user document with nutritionistId
    await db.collection("user").doc(userId).update({
      nutritionistId: nutritionistId,
      nutritionistAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Nutritionist ${nutritionistId} assigned to user ${userId}`);
    
    res.status(200).json({ 
      success: true, 
      message: "Nutritionist assigned successfully",
      nutritionistId 
    });
  } catch (error) {
    console.error("Error assigning nutritionist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's assigned nutritionist
app.get("/user/:userId/nutritionist", async (req, res) => {
  try {
    const { userId } = req.params;

    const userDoc = await db.collection("user").doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    const userData = userDoc.data();
    
    if (!userData.nutritionistId) {
      return res.status(200).json({ 
        success: true, 
        hasNutritionist: false,
        message: "No nutritionist assigned" 
      });
    }

    // Fetch nutritionist details
    const nutritionistInfoDoc = await db.collection("nutritionist_info").doc(userData.nutritionistId).get();
    
    if (!nutritionistInfoDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Assigned nutritionist not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      hasNutritionist: true,
      nutritionist: {
        id: userData.nutritionistId,
        ...nutritionistInfoDoc.data()
      }
    });
  } catch (error) {
    console.error("Error fetching user's nutritionist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================== COACH APPOINTMENTS ====================

// Create Coach Appointment
app.post('/appointments/coach', async (req, res) => {
  try {
    const { userId, userName, expertId, expertName, appointmentDate, status, createdAt } = req.body;

    // Validate required fields
    if (!userId || !expertId || !appointmentDate) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'userId, expertId, and appointmentDate are required' 
      });
    }

    const appointmentData = {
      userId,
      userName,
      coachId: expertId,
      coachName: expertName,
      appointmentDate,
      status: status || 'pending',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('coachAppointments').add(appointmentData);

    res.status(201).json({
      success: true,
      message: 'Coach appointment created successfully',
      appointmentId: docRef.id,
      data: { id: docRef.id, ...appointmentData }
    });
  } catch (error) {
    console.error('Error creating coach appointment:', error);
    res.status(500).json({ 
      error: 'Failed to create appointment',
      message: error.message 
    });
  }
});

// Get Coach Appointments (for a specific user or coach)
app.get('/appointments/coach', async (req, res) => {
  try {
    const { userId, coachId, status } = req.query;

    let query = db.collection('coachAppointments');

    // Filter by userId if provided
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Filter by coachId if provided
    if (coachId) {
      query = query.where('coachId', '==', coachId);
    }

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    // Don't use orderBy to avoid composite index requirement
    const snapshot = await query.get();

    const appointments = [];
    snapshot.forEach(doc => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort in JavaScript instead
    appointments.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching coach appointments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch appointments',
      message: error.message 
    });
  }
});

// Update Coach Appointment (Reschedule or change status)
app.put('/appointments/coach/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { appointmentDate, status, reason } = req.body;

    // Fetch existing appointment
    const docRef = db.collection('coachAppointments').doc(appointmentId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: `No appointment found with ID: ${appointmentId}`,
      });
    }

    const oldData = existingDoc.data();

    // Build update object
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    // If rescheduling
    if (appointmentDate) {
      updateData.oldAppointmentDate = oldData.appointmentDate;
      updateData.appointmentDate = appointmentDate;
      updateData.isRescheduled = true;
      updateData.rescheduledAt = new Date().toISOString();
      updateData.status = status || "pending";
      if (reason) updateData.rescheduleReason = reason;
    } else if (status) {
      // If just changing status (e.g. confirm/cancel)
      updateData.status = status;
    }

    // Update in Firestore
    await docRef.update(updateData);

    // Return updated document
    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Coach appointment updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error updating coach appointment:', error);
    res.status(500).json({
      error: 'Failed to update appointment',
      message: error.message,
    });
  }
});


// Delete Coach Appointment (Cancel)
app.delete('/appointments/coach/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    await db.collection('coachAppointments').doc(appointmentId).delete();

    res.status(200).json({
      success: true,
      message: 'Coach appointment deleted successfully',
      appointmentId
    });
  } catch (error) {
    console.error('Error deleting coach appointment:', error);
    res.status(500).json({ 
      error: 'Failed to delete appointment',
      message: error.message 
    });
  }
});

// ==================== NUTRITIONIST APPOINTMENTS ====================

// Create Nutritionist Appointment
app.post('/appointments/nutritionist', async (req, res) => {
  try {
    const { userId, userName, expertId, expertName, appointmentDate, status, createdAt } = req.body;

    // Validate required fields
    if (!userId || !expertId || !appointmentDate) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'userId, expertId, and appointmentDate are required' 
      });
    }

    // Fetch nutritionist name if not provided or is undefined
    let nutritionistName = expertName;
    if (!nutritionistName || nutritionistName === undefined) {
      try {
        const nutritionistDoc = await db.collection('nutritionist').doc(expertId).get();
        if (nutritionistDoc.exists) {
          nutritionistName = nutritionistDoc.data().name || 'Nutritionist';
        } else {
          // Fallback to nutritionist_info collection
          const nutritionistInfoDoc = await db.collection('nutritionist_info').doc(expertId).get();
          if (nutritionistInfoDoc.exists) {
            nutritionistName = nutritionistInfoDoc.data().name || 'Nutritionist';
          } else {
            nutritionistName = 'Nutritionist'; // Final fallback
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch nutritionist name:', fetchError);
        nutritionistName = 'Nutritionist'; // Fallback if fetch fails
      }
    }

    const appointmentData = {
      userId,
      userName,
      nutritionistId: expertId,
      nutritionistName: nutritionistName,
      appointmentDate,
      status: status || 'pending',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('nutritionistAppointments').add(appointmentData);

    res.status(201).json({
      success: true,
      message: 'Nutritionist appointment created successfully',
      appointmentId: docRef.id,
      data: { id: docRef.id, ...appointmentData }
    });
  } catch (error) {
    console.error('Error creating nutritionist appointment:', error);
    res.status(500).json({ 
      error: 'Failed to create appointment',
      message: error.message 
    });
  }
});

// Get Nutritionist Appointments (for a specific user or nutritionist)
app.get('/appointments/nutritionist', async (req, res) => {
  try {
    const { userId, nutritionistId, status } = req.query;

    let query = db.collection('nutritionistAppointments');

    // Filter by userId if provided
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Filter by nutritionistId if provided
    if (nutritionistId) {
      query = query.where('nutritionistId', '==', nutritionistId);
    }

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    // Don't use orderBy to avoid composite index requirement
    const snapshot = await query.get();

    const appointments = [];
    snapshot.forEach(doc => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort in JavaScript instead
    appointments.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching nutritionist appointments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch appointments',
      message: error.message 
    });
  }
});
// Update Nutritionist Appointment (Reschedule or change status)
app.put('/appointments/nutritionist/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { appointmentDate, status, reason } = req.body;

    // Fetch existing appointment
    const docRef = db.collection('nutritionistAppointments').doc(appointmentId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: `No appointment found with ID: ${appointmentId}`,
      });
    }

    const oldData = existingDoc.data();

    // Build update object
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    // If rescheduling
    if (appointmentDate) {
      updateData.oldAppointmentDate = oldData.appointmentDate;
      updateData.appointmentDate = appointmentDate;
      updateData.isRescheduled = true;
      updateData.rescheduledAt = new Date().toISOString();
      updateData.status = status || 'pending';
      if (reason) updateData.rescheduleReason = reason;
    } else if (status) {
      // If just changing status (e.g. confirm/cancel)
      updateData.status = status;
    }

    // Update in Firestore
    await docRef.update(updateData);

    // Return updated document
    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Nutritionist appointment updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error updating nutritionist appointment:', error);
    res.status(500).json({
      error: 'Failed to update appointment',
      message: error.message,
    });
  }
});

// Delete Nutritionist Appointment (Cancel)
app.delete('/appointments/nutritionist/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    await db.collection('nutritionistAppointments').doc(appointmentId).delete();

    res.status(200).json({
      success: true,
      message: 'Nutritionist appointment deleted successfully',
      appointmentId
    });
  } catch (error) {
    console.error('Error deleting nutritionist appointment:', error);
    res.status(500).json({ 
      error: 'Failed to delete appointment',
      message: error.message 
    });
  }
});

// ==================== NUTRITIONIST MEAL PLAN REQUESTS ====================

// Create Nutritionist Meal Plan Request
app.post('/meal-plans/nutritionist', async (req, res) => {
  try {
    const { userId, userName, expertId, expertName, duration, requestMessage, status, createdAt } = req.body;

    // Validate required fields
    if (!userId || !expertId || !duration) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'userId, expertId, and duration are required' 
      });
    }

    // Fetch nutritionist name if not provided or is undefined
    let nutritionistName = expertName;
    if (!nutritionistName || nutritionistName === undefined) {
      try {
        const nutritionistDoc = await db.collection('nutritionist').doc(expertId).get();
        if (nutritionistDoc.exists) {
          nutritionistName = nutritionistDoc.data().name || 'Nutritionist';
        } else {
          // Fallback to nutritionist_info collection
          const nutritionistInfoDoc = await db.collection('nutritionist_info').doc(expertId).get();
          if (nutritionistInfoDoc.exists) {
            nutritionistName = nutritionistInfoDoc.data().name || 'Nutritionist';
          } else {
            nutritionistName = 'Nutritionist'; // Final fallback
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch nutritionist name:', fetchError);
        nutritionistName = 'Nutritionist'; // Fallback if fetch fails
      }
    }

    const mealPlanData = {
      userId,
      userName,
      nutritionistId: expertId,
      nutritionistName: nutritionistName,
      duration,
      requestMessage: requestMessage || '',
      status: status || 'pending',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('nutritionistMealPlans').add(mealPlanData);

    res.status(201).json({
      success: true,
      message: 'Nutritionist meal plan request created successfully',
      mealPlanId: docRef.id,
      data: { id: docRef.id, ...mealPlanData }
    });
  } catch (error) {
    console.error('Error creating nutritionist meal plan request:', error);
    res.status(500).json({ 
      error: 'Failed to create meal plan request',
      message: error.message 
    });
  }
});

// Get Nutritionist Meal Plan Requests (for a specific user or nutritionist)
app.get('/meal-plans/nutritionist', async (req, res) => {
  try {
    const { userId, nutritionistId, status } = req.query;

    let query = db.collection('nutritionistMealPlans');

    // Filter by userId if provided
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Filter by nutritionistId if provided
    if (nutritionistId) {
      query = query.where('nutritionistId', '==', nutritionistId);
    }

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    // Don't use orderBy to avoid composite index requirement
    const snapshot = await query.get();

    const mealPlans = [];
    snapshot.forEach(doc => {
      mealPlans.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort in JavaScript instead
    mealPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: mealPlans.length,
      data: mealPlans
    });
  } catch (error) {
    console.error('Error fetching nutritionist meal plan requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch meal plan requests',
      message: error.message 
    });
  }
});

// Update Nutritionist Meal Plan Request (Accept/Reject or change status)
app.put('/meal-plans/nutritionist/:mealPlanId', async (req, res) => {
  try {
    const { mealPlanId } = req.params;
    const updateData = req.body;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date().toISOString();

    await db.collection('nutritionistMealPlans').doc(mealPlanId).update(updateData);

    const updatedDoc = await db.collection('nutritionistMealPlans').doc(mealPlanId).get();

    res.status(200).json({
      success: true,
      message: 'Nutritionist meal plan request updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating nutritionist meal plan request:', error);
    res.status(500).json({ 
      error: 'Failed to update meal plan request',
      message: error.message 
    });
  }
});

// Delete Nutritionist Meal Plan Request (Cancel)
app.delete('/meal-plans/nutritionist/:mealPlanId', async (req, res) => {
  try {
    const { mealPlanId } = req.params;

    await db.collection('nutritionistMealPlans').doc(mealPlanId).delete();

    res.status(200).json({
      success: true,
      message: 'Nutritionist meal plan request deleted successfully',
      mealPlanId
    });
  } catch (error) {
    console.error('Error deleting nutritionist meal plan request:', error);
    res.status(500).json({ 
      error: 'Failed to delete meal plan request',
      message: error.message 
    });
  }
});

// ==================== COACH WORKOUT PLAN REQUESTS ====================

// Create Coach Workout Plan Request
app.post('/workout-plans/coach', async (req, res) => {
  try {
    const { userId, userName, expertId, expertName, duration, requestMessage, status, createdAt } = req.body;

    // Validate required fields
    if (!userId || !expertId || !duration) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId, expertId, and duration are required'
      });
    }

    // Fetch coach name if not provided
    let coachName = expertName;
    if (!coachName || coachName === undefined) {
      try {
        const coachDoc = await db.collection('coach').doc(expertId).get();
        if (coachDoc.exists) {
          coachName = coachDoc.data().name || 'Coach';
        } else {
          const coachInfoDoc = await db.collection('coach_info').doc(expertId).get();
          coachName = coachInfoDoc.exists ? (coachInfoDoc.data().name || 'Coach') : 'Coach';
        }
      } catch (fetchError) {
        console.warn('Could not fetch coach name:', fetchError);
        coachName = 'Coach';
      }
    }

    const workoutPlanData = {
      userId,
      userName,
      coachId: expertId,
      coachName,
      duration,
      requestMessage: requestMessage || '',
      status: status || 'pending',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('coachWorkoutPlans').add(workoutPlanData);

    res.status(201).json({
      success: true,
      message: 'Coach workout plan request created successfully',
      workoutPlanId: docRef.id,
      data: { id: docRef.id, ...workoutPlanData }
    });
  } catch (error) {
    console.error('Error creating coach workout plan request:', error);
    res.status(500).json({
      error: 'Failed to create workout plan request',
      message: error.message
    });
  }
});

// Get Coach Workout Plan Requests (for a specific user or coach)
app.get('/workout-plans/coach', async (req, res) => {
  try {
    const { userId, coachId, status } = req.query;

    let query = db.collection('coachWorkoutPlans');

    if (userId) {
      query = query.where('userId', '==', userId);
    }
    if (coachId) {
      query = query.where('coachId', '==', coachId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const workoutPlans = [];
    snapshot.forEach(doc => {
      workoutPlans.push({ id: doc.id, ...doc.data() });
    });

    workoutPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: workoutPlans.length,
      data: workoutPlans,
    });
  } catch (error) {
    console.error('Error fetching coach workout plan requests:', error);
    res.status(500).json({
      error: 'Failed to fetch workout plan requests',
      message: error.message,
    });
  }
});

// Update Coach Workout Plan Request (Accept/Reject or change status)
app.put('/workout-plans/coach/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const updateData = req.body || {};
    updateData.updatedAt = new Date().toISOString();

    await db.collection('coachWorkoutPlans').doc(planId).update(updateData);

    const updatedDoc = await db.collection('coachWorkoutPlans').doc(planId).get();
    res.status(200).json({
      success: true,
      message: 'Coach workout plan request updated successfully',
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('Error updating coach workout plan request:', error);
    res.status(500).json({
      error: 'Failed to update workout plan request',
      message: error.message,
    });
  }
});

// Delete Coach Workout Plan Request (optional cancel)
app.delete('/workout-plans/coach/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    await db.collection('coachWorkoutPlans').doc(planId).delete();
    res.status(200).json({ success: true, message: 'Coach workout plan request deleted', workoutPlanId: planId });
  } catch (error) {
    console.error('Error deleting coach workout plan request:', error);
    res.status(500).json({ error: 'Failed to delete workout plan request', message: error.message });
  }
});

// ==================== GET ALL APPOINTMENTS (Combined) ====================

// Get all appointments for a user (both coach and nutritionist)
app.get('/appointments/all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    // Fetch coach appointments without orderBy to avoid index requirement
    let coachQuery = db.collection('coachAppointments').where('userId', '==', userId);
    if (status) {
      coachQuery = coachQuery.where('status', '==', status);
    }
    const coachSnapshot = await coachQuery.get();

    // Fetch nutritionist appointments without orderBy to avoid index requirement
    let nutritionistQuery = db.collection('nutritionistAppointments').where('userId', '==', userId);
    if (status) {
      nutritionistQuery = nutritionistQuery.where('status', '==', status);
    }
    const nutritionistSnapshot = await nutritionistQuery.get();

    const coachAppointments = [];
    coachSnapshot.forEach(doc => {
      coachAppointments.push({
        id: doc.id,
        type: 'coach',
        ...doc.data()
      });
    });

    const nutritionistAppointments = [];
    nutritionistSnapshot.forEach(doc => {
      nutritionistAppointments.push({
        id: doc.id,
        type: 'nutritionist',
        ...doc.data()
      });
    });

    // Combine and sort by date in JavaScript instead of Firestore
    const allAppointments = [...coachAppointments, ...nutritionistAppointments].sort(
      (a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate)
    );

    res.status(200).json({
      success: true,
      count: allAppointments.length,
      data: allAppointments
    });
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch appointments',
      message: error.message 
    });
  }
});

// New code
dotenv.config();

// // Food recognition endpoint (Google Cloud Vision API)
// app.post("/recognize-food", async (req, res) => {
//   try {
//     const { image } = req.body;
//     if (!image) {
//       return res.status(400).json({ error: "No image provided" });
//     }

//     // Send image to Google Vision API
//     const [result] = await visionClient.labelDetection({
//       image: { content: image }, // base64 image from frontend
//     });

//     const labels = result.labelAnnotations || [];
//     console.log("Vision API labels:", labels.map(l => l.description));

//     // Pick top match
//     const topLabel = labels[0]?.description || "Unknown";

//     res.json({ food: topLabel });
//   } catch (error) {
//     console.error("Vision API error:", error);
//     res.status(500).json({ error: "Food recognition failed" });
//   }
// });

// Food recognition endpoint (Clarifai)
app.post("/recognize-food", async (req, res) => {
  try {
    const { image } = req.body;

    // Call Clarifai Food Model
    const response = await fetch("https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.CLARIFAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [{ data: { image: { base64: image } } }],
      }),
    });

    const data = await response.json();
    const concepts = data.outputs[0].data.concepts;
    const topFood = concepts[0]?.name || "Unknown";

    res.json({ food: topFood });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Food recognition failed" });
  }
});


// Get categories from firestore 
app.get("/categories", async (req, res) => {
  try {
    const snapshot = await db.collection("categories").get();
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Shared intolerance keywords map (use in both endpoints)
const intoleranceMap = {
  gluten: ["wheat", "barley", "rye", "spelt", "malt", "flour"],
  egg: ["egg", "egg yolk", "egg white", "albumen"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "custard"],
  peanut: ["peanut", "groundnut"],
  "tree nut": ["almond", "cashew", "walnut", "pecan", "hazelnut", "macadamia"],
  soy: ["soy", "soya", "tofu", "soybean"],
  fish: ["fish", "salmon", "cod", "tuna", "trout", "anchovy", "mackerel"],
  shellfish: ["shrimp", "prawn", "lobster", "crab", "scallop", "clam", "oyster"],
  corn: ["corn", "maize", "cornstarch", "cornmeal"],
  lupin: ["lupin", "lupine"],
  celery: ["celery"],
  mustard: ["mustard"],
  sesame: ["sesame", "tahini", "sesame seeds"],
  sulfites: ["sulfite", "sulphite"],
  molluscs: ["squid", "octopus", "mussels", "clam", "snail"],
};


// Recipes endpoint
app.get("/recipes", async (req, res) => {
  try {
    const { type, diet, intolerances, category, uid } = req.query;

    // Build Firestore query
    let query = db.collection("recipes");
    if (diet) {
      query = query.where("diets", "array-contains", diet);
    } else if (category) {
      query = query.where("categories", "array-contains", category);
    } else if (intolerances) {
      const intoleranceList = intolerances.split(",").map(i => i.trim());
      query = query.where("intolerances", "array-contains-any", intoleranceList);
    }

    // Check if recipes is in firestore
    const snapshot = await query.limit(44).get();
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} recipes in Firestore for`, { type, diet, intolerances, category });
      return res.json(snapshot.docs.map(doc => doc.data()));
    }

    // If dont have fetch from spoonacular
    console.log("Not found in Firestore → fetching from Spoonacular");
    const excludeIngredients = intolerances || "";
    let data;

    if (["breakfast", "lunch", "dinner", "snack"].includes(type)) {
      data = (await searchComplex({ type, diet, intolerances, excludeIngredients, number: 44 })).results || [];
    } else if (category === "high-protein") {
      data = await searchByNutrients({ minProtein: 25, maxCalories: 500, diet, intolerances, type, excludeIngredients });
    } else if (category === "low-carb") {
      data = await searchByNutrients({ maxCarbs: 15, maxCalories: 550, diet, intolerances, type, excludeIngredients });
    } else if (category === "low-calorie") {
      data = await searchByNutrients({ maxCalories: 400, diet, intolerances, type, excludeIngredients });
    } else {
      data = (await searchComplex({
        type, diet, intolerances, excludeIngredients, number: 44, maxCalories: 600, minProtein: 10
      })).results || [];
    }

    let details = await addDetailsRecipeList(data, intolerances);

    // Extra strict intolerance filtering
    if (intolerances) {
      const requestedIntolerances = intolerances.split(",").map(i => i.trim().toLowerCase());

      details = details.filter(recipe => {
        if (!recipe.ingredients) return true;
        const ing = recipe.ingredients.map(i => i.toLowerCase());
        return !requestedIntolerances.some(intol =>
          (intoleranceMap[intol] || [intol]).some(k =>
            ing.some(i => i.includes(k))
          )
        );
      });
    }

    // ensure no duplicate recies with same ID are saved to firestore
    const seen = new Set();
    details = details.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Save to Firestore 
    const batch = db.batch();
    details.forEach(recipe => {
      const ref = db.collection("recipes").doc(recipe.id.toString());

      //recipeData collection
      const recipeData = {
        uid: uid || null,
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        calories: recipe.calories || 0,
        type: type || "all",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      //ensure recipes can belong to one or more diets, one or more intolerances, one or more cateogires.
      if (diet) {
        recipeData.diets = admin.firestore.FieldValue.arrayUnion(diet);
      }

      if (intolerances) {
        recipeData.intolerances = admin.firestore.FieldValue.arrayUnion(
          ...intolerances.split(",").map(i => i.trim())
        );
      }

      if (category) {
        recipeData.categories = admin.firestore.FieldValue.arrayUnion(category);
      }

      batch.set(ref, recipeData, { merge: true });

      // recipeDetails
      const detailsRef = db.collection("recipeDetails").doc(recipe.id.toString());
      batch.set(detailsRef, {
        uid: uid || null,
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        calories: recipe.calories || 0,
        protein: recipe.protein || 0,
        carbs: recipe.carbs || 0,
        fat: recipe.fat || 0,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    console.log(`Saved ${details.length} recipes into Firestore`);

    res.json(details);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: error.message });
  }
});




// filters endpoint
app.get("/recipes/filter", async (req, res) => {
  try {
    const {
      diets,
      intolerances,
      categories,
      minCalories,
      maxCalories,
      minReadyTime,
      maxReadyTime,
    } = req.query;

    let query = db.collection("recipes");

    // allow user to filter recipes by diets, whether its one diet or multiple
    if (diets) {
      const dietList = diets.split(",").map(d => d.trim());
      if (dietList.length === 1) {
        query = query.where("diets", "array-contains", dietList[0]);
      } else {
        query = query.where("diets", "array-contains-any", dietList);
      }
    }

    // Fetch recipes from Firestore
    const snapshot = await query.get();
    let results = snapshot.empty ? [] : snapshot.docs.map(doc => doc.data());

    // Category filter (AND logic)
    if (categories) {
      const categoryList = categories.split(",").map(c => c.trim());
      results = results.filter(r =>
        categoryList.every(c => r.categories?.includes(c))
      );
    }

    // Intolerance filter
    if (intolerances) {
      const intoleranceList = intolerances.split(",").map(i => i.trim().toLowerCase());

    // First, filter on metadata (quick check) - include recipes that are safe for this intolerance
    let metadataFiltered = results.filter(r =>
      intoleranceList.every(intol => 
        r.intolerances?.some(i => i.toLowerCase() === intol)
      )
    );

    // If metadata found → use them
    if (metadataFiltered.length > 0) {
      results = metadataFiltered;
    } else {
      // No metadata match → fallback to ingredients
      console.log("No recipes matched intolerance in metadata → checking ingredients");

      const detailsSnapshot = await db.collection("recipeDetails").get();
      let details = detailsSnapshot.docs.map(d => d.data());

      const requestedIntolerances = intoleranceList.map(i => i.toLowerCase());

      const unsafeIds = details
        .filter(recipe => {
          if (!recipe.ingredients) return false;
          const ing = recipe.ingredients.map(i => i.toLowerCase());

          return requestedIntolerances.some(intol =>
            (intoleranceMap[intol] || [intol]).some(keyword =>
              ing.some(i => i.includes(keyword))
            )
          );
        })
        .map(r => r.id);

      // Exclude unsafe one
      results = results.filter(r => !unsafeIds.includes(r.id));
    }
  }

    // Calories filter
    if (minCalories || maxCalories) {
      results = results.filter((r) => {
        const cals = r.calories || 0;
        return (!minCalories || cals >= parseInt(minCalories)) &&
               (!maxCalories || cals <= parseInt(maxCalories));
      });
    }

    // Ready time filter
    if (minReadyTime || maxReadyTime) {
      results = results.filter((r) => {
        const mins = r.readyInMinutes || 0;
        return (!minReadyTime || mins >= parseInt(minReadyTime)) &&
               (!maxReadyTime || mins <= parseInt(maxReadyTime));
      });
    }

    // remove duplicate recipe
    const seen = new Set();
      results = results.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

    console.log(` Found ${results.length} recipes with filters`, req.query);
    res.json(results);
  } catch (error) {
    console.error(" Error filtering recipes:", error);
    res.status(500).json({ error: error.message });
  }
});




app.get("/recipeDetails/:id", async (req, res) => {
  try {
    const id = req.params.id.toString();
    console.log(" Fetching recipeDetails with id:", id);

    const doc = await db.collection("recipeDetails").doc(id).get();

    if (!doc.exists) {
      console.log("Recipe not found in Firestore:", id);
      return res.status(404).json({ error: "Recipe not found in Firestore" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    res.status(500).json({ error: error.message });
  }
});


//  categories (only Spoonacular-supported ones) (for saving to firestore, so can just fetch instead of hardcoded)
const categories = [
  // Popular (meal types)
  { id: "breakfast", label: "Breakfast", section: "Popular", filterType: "type", filterValue: "breakfast", icon: "☀️" },
  { id: "lunch", label: "Lunch", section: "Popular", filterType: "type", filterValue: "lunch", icon: "🍲" },
  { id: "dinner", label: "Dinner", section: "Popular", filterType: "type", filterValue: "dinner", icon: "🍽️" },
  { id: "snack", label: "Quick Snacks", section: "Popular", filterType: "type", filterValue: "snack", icon: "🍪" },

  // Healthy (nutrient-based)
  { id: "high-protein", label: "High Protein", section: "Healthy", filterType: "nutrients", filterValue: "high-protein", icon: "💪" },
  { id: "low-carb", label: "Low Carb", section: "Healthy", filterType: "diet", filterValue: "low-carb", icon: "🥗" },
  { id: "low-calorie", label: "Low Calorie", section: "Healthy", filterType: "nutrients", filterValue: "low-calorie", icon: "🔥" },

  // Diet (API diet filters)
  { id: "vegetarian", label: "Vegetarian", section: "Diet", filterType: "diet", filterValue: "vegetarian", icon: "🥦" },
  { id: "vegan", label: "Vegan", section: "Diet", filterType: "diet", filterValue: "vegan", icon: "🌱" },
  { id: "pescetarian", label: "Pescetarian", section: "Diet", filterType: "diet", filterValue: "pescetarian", icon: "🐟" },
  { id: "ketogenic", label: "Ketogenic", section: "Diet", filterType: "diet", filterValue: "ketogenic", icon: "🥩" },
  { id: "paleo", label: "Paleo", section: "Diet", filterType: "diet", filterValue: "paleo", icon: "🍖" },
  { id: "primal", label: "Primal", section: "Diet", filterType: "diet", filterValue: "primal", icon: "🦴" },
  { id: "whole30", label: "Whole30", section: "Diet", filterType: "diet", filterValue: "whole30", icon: "🧘" },

  // Allergy (API intolerances)
  { id: "dairy-free", label: "Dairy-Free", section: "Allergy", filterType: "intolerances", filterValue: "dairy", icon: "🥛" },
  { id: "gluten-free", label: "Gluten-Free", section: "Allergy", filterType: "intolerances", filterValue: "gluten", icon: "🍞" },
  { id: "nut-free", label: "Nut-Free", section: "Allergy", filterType: "intolerances", filterValue: "peanut,tree nut", icon: "🥜" },
  { id: "soy-free", label: "Soy-Free", section: "Allergy", filterType: "intolerances", filterValue: "soy", icon: "🌱" },
  { id: "egg-free", label: "Egg-Free", section: "Allergy", filterType: "intolerances", filterValue: "egg", icon: "🥚" },
];


// filter options (for saving to firestore, so can just fetch instead of hardcoded)
async function seedFilterOptions() {
  const filterOptions = {
    popular: [
      { name: "Breakfast", value: "breakfast" },
      { name: "Lunch", value: "lunch" },
      { name: "Dinner", value: "dinner" },
      { name: "Snacks", value: "snack" },
      { name: "Low Carb", value: "low-carb" },
    ],
    diets: [
      { name: "Vegetarian", value: "vegetarian" },
      { name: "Vegan", value: "vegan" },
      { name: "Keto", value: "ketogenic" },
      { name: "Pescetarian", value: "pescetarian" },
      { name: "Paleo", value: "paleo" },
    ],
    intolerances: [
      { name: "Peanut", value: "peanut" },
      { name: "Tree Nut", value: "tree nut" },
      { name: "Sesame", value: "sesame" },
      { name: "Gluten", value: "gluten" },
      { name: "Fish", value: "fish" },
      { name: "Wheat", value: "wheat" },
      { name: "Dairy", value: "dairy" },
      { name: "Mustard", value: "mustard" },
      { name: "Lupin", value: "lupin" },
      { name: "Egg", value: "egg" },
      { name: "Celery", value: "celery" },
      { name: "Sulfites", value: "sulfites" },
      { name: "Shellfish", value: "shellfish" },
      { name: "Soy", value: "soy" },
      { name: "Corn", value: "corn" },
      { name: "Molluscs", value: "molluscs" },
    ],
  };

  for (const [group, items] of Object.entries(filterOptions)) {
    const colRef = db.collection("filterOptions").doc(group).collection("items");
    const batch = db.batch();
    items.forEach((item) => {
      const ref = colRef.doc(item.value);
      batch.set(ref, item, { merge: true });
    });
    await batch.commit();
    console.log(`Added filter options for ${group}`);
  }
}

// Get all filter options from firestore
app.get("/filteroptions", async (req, res) => {
  try {
    const collections = ["popular", "diets", "intolerances"];
    const result = {};

    for (const col of collections) {
      const snapshot = await db.collection("filterOptions").doc(col).collection("items").get();
      result[col] = snapshot.docs.map((doc) => doc.data());
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ error: error.message });
  }
});
  
seedFilterOptions().catch(err => console.error("Failed to add filter options:", err));



// Ensure categories exist in Firestore
async function ensureCategoriesAdded() {
  try {
    const snapshot = await db.collection("categories").get();
    if (snapshot.empty) {
      for (const c of categories) {
        await db.collection("categories").add({
          ...c,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      console.log("✅ Categories added to Firestore");
    } else {
      console.log("✅ Categories already exist in Firestore");
    }
  } catch (err) {
    console.error("Error ensuring categories:", err);
  }
}
ensureCategoriesAdded();



// Add to meal log to firestore (meals_log collection)
app.post("/meals_log/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const meal = req.body;

    if (!meal.id) meal.id = Date.now().toString(); // unique meal id

    await db.collection("meals_log")
      .doc(uid)
      .collection("meals")
      .doc(meal.id)
      .set({
        mealType: meal.mealType,
        date: meal.date,
        food: meal.food,
        servingSize: meal.servingSize,
        servings: meal.servings,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(200).json({ success: true, meal });
  } catch (error) {
    console.error("Error saving meal log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all meal logs for a user
app.get("/meals_log/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db.collection("meals_log")
      .doc(uid)
      .collection("meals") //
      .orderBy("createdAt", "desc")
      .get();

    const meals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(meals);
  } catch (error) {
    console.error("Error fetching meals:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a meal log (HAVENT IMPLEMENT -> FOR MEAL TAB)
app.delete("/meals_log/:uid/:mealId", async (req, res) => {
  try {
    const { uid, mealId } = req.params;

    await db.collection("meals_log")
      .doc(uid)
      .collection("meals")
      .doc(mealId)
      .delete();

    res.json({ success: true, mealId });
  } catch (error) {
    console.error("Error deleting meal log:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get single meal by ID
app.get("/meals_log/:uid/:mealId", async (req, res) => {
  try {
    const { uid, mealId } = req.params;

    const doc = await db.collection("meals_log")
      .doc(uid)
      .collection("meals")
      .doc(mealId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Meal not found" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching meal:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update a meal
app.put("/meals_log/:uid/:mealId", async (req, res) => {
  try {
    const { uid, mealId } = req.params;
    const updates = req.body;

    await db.collection("meals_log")
      .doc(uid)
      .collection("meals")
      .doc(mealId)
      .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({ success: true, mealId, updates });
  } catch (error) {
    console.error("Error updating meal:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Add a custom plan to firestore (CustomIFPlan collection) (PREMIUM USER)
app.post("/CustomIFPlan/:uid/customPlans", async (req, res) => {
  try {
    const { uid } = req.params;
    const plan = req.body;

    if (!plan.id) plan.id = Date.now();

    await db.collection("CustomIFPlan").doc(uid).collection("customPlans").doc(plan.id.toString()).set({
      ...plan,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error("Error saving custom plan:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all custom plans
app.get("/CustomIFPlan/:uid/customPlans", async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection("CustomIFPlan").doc(uid).collection("customPlans").get();

    const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(plans);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a custom plan
app.delete("/CustomIFPlan/:uid/customPlans/:planId", async (req, res) => {
  try {
    const { uid, planId } = req.params;
    await db.collection("CustomIFPlan").doc(uid).collection("customPlans").doc(planId).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});





// Add favorite recipes to firestore (favorites collection)
app.post("/favorites/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const recipe = req.body;

    await db.collection("favorites")
      .doc(uid)
      .collection("recipes")
      .doc(recipe.id.toString())
      .set(recipe);

    res.json({ success: true });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove favorite
app.delete("/favorites/:uid/:recipeId", async (req, res) => {
  try {
    const { uid, recipeId } = req.params;

    await db.collection("favorites")
      .doc(uid)
      .collection("recipes")
      .doc(recipeId)
      .delete();

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get favorites
app.get("/favorites/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection("favorites")
      .doc(uid)
      .collection("recipes")
      .get();

    const favorites = snapshot.docs.map(doc => doc.data());
    res.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: error.message });
  }
});




// Add custom recipe to firestore (CustomRecipe collection) (PREMIUM USER)
app.post("/CustomRecipe/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const {
      recipename,
      ingredients,
      instructions,
      calories,
      proteins,
      fats,
      carbs,
      servings,
    } = req.body;

    const recipeId = Date.now().toString(); // simple unique ID
    const newRecipe = {
      recipeid: recipeId,
      uid,
      recipename,
      ingredients,
      instructions,
      calories,
      proteins,
      fats,
      carbs,
      servings: servings || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .collection("CustomRecipe")
      .doc(uid)
      .collection("recipes")
      .doc(recipeId)
      .set(newRecipe);

    res.json({ success: true, recipe: newRecipe });
  } catch (error) {
    console.error("❌ Error adding custom recipe:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all custom recipes for a user
app.get("/CustomRecipe/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection("CustomRecipe")
      .doc(uid)
      .collection("recipes")
      .get();

    const recipes = snapshot.docs.map((doc) => doc.data());
    res.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update custom recipe
app.put("/CustomRecipe/:uid/:recipeid", async (req, res) => {
  try {
    const { uid, recipeid } = req.params;
    const updatedData = {
      ...req.body,
      updatedAt: new Date(),
    };

    await db
      .collection("CustomRecipe")
      .doc(uid)
      .collection("recipes")
      .doc(recipeid)
      .update(updatedData);

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete custom recipe
app.delete("/CustomRecipe/:uid/:recipeid", async (req, res) => {
  try {
    const { uid, recipeid } = req.params;

    await db
      .collection("CustomRecipe")
      .doc(uid)
      .collection("recipes")
      .doc(recipeid)
      .delete();

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: error.message });
  }
});



// Add water to firestore
app.post("/water_log/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const waterEntry = req.body;

    const formattedDate = waterEntry.date || new Date().toISOString().split("T")[0];
    const docId = formattedDate;

    await db.collection("water_log")
      .doc(uid)
      .collection("entries")
      .doc(docId) // overwrite by date
      .set({
        id: docId,
        water: waterEntry.water,
        uid,
        date: formattedDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(200).json({
      success: true,
      entry: { ...waterEntry, id: docId, date: formattedDate },
    });
  } catch (error) {
    console.error("Error saving water log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get water log for a user
app.get("/water_log/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { date } = req.query;

    let query = db.collection("water_log")
      .doc(uid)
      .collection("entries");

    if (date) {
      // fetch only that date
      const docSnap = await query.doc(date).get();
      if (docSnap.exists) {
        return res.json([{ id: docSnap.id, ...docSnap.data() }]);
      } else {
        return res.json([]);
      }
    }

    const snapshot = await query.orderBy("date", "desc").get();
    const waterEntries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(waterEntries);
  } catch (error) {
    console.error("Error fetching water logs:", error);
    res.status(500).json({ error: error.message });
  }
});


// Save activity log
// POST - Save activity log
app.post("/activity_log/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const activityEntry = req.body;
    
    const formattedDate = activityEntry.date || new Date().toISOString().split("T")[0];
    
    // Create a new activity log entry with auto-generated ID
    const activityRef = await db.collection("activity_log")
      .doc(uid)
      .collection("entries")
      .add({
        name: activityEntry.name,
        duration: activityEntry.duration,
        calories: activityEntry.calories,
        uid,
        date: formattedDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(200).json({
      success: true,
      entry: {
        id: activityRef.id,
        name: activityEntry.name,
        duration: activityEntry.duration,
        calories: activityEntry.calories,
        date: formattedDate,
      },
    });
  } catch (error) {
    console.error("Error saving activity log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Fetch activity logs for a user
app.get("/activity_log/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { date } = req.query;

    let query = db.collection("activity_log")
      .doc(uid)
      .collection("entries");

    if (date) {
      // Fetch activities for a specific date
      const snapshot = await query.where("date", "==", date).get();
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json(activities);
    }

    // Fetch all activities, ordered by date
    const snapshot = await query.orderBy("date", "desc").limit(50).get();
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(activities);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Remove activity log entry
app.delete("/activity_log/:uid/:entryId", async (req, res) => {
  try {
    const { uid, entryId } = req.params;

    await db.collection("activity_log")
      .doc(uid)
      .collection("entries")
      .doc(entryId)
      .delete();

    res.status(200).json({ success: true, message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// POST - Add new custom activity
app.post("/CustomActivity/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, duration, calories } = req.body;

    const activityRef = await db.collection("CustomActivity")
      .doc(uid)
      .collection("entries")
      .add({
        name,
        duration,
        calories,
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(200).json({
      success: true,
      entry: {
        id: activityRef.id,
        name,
        duration,
        calories,
      },
    });
  } catch (error) {
    console.error("Error saving custom activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Fetch all custom activities for a user
app.get("/CustomActivity/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db.collection("CustomActivity")
      .doc(uid)
      .collection("entries")
      .orderBy("createdAt", "desc")
      .get();

    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(activities);
  } catch (error) {
    console.error("Error fetching custom activities:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update custom activity
app.put("/CustomActivity/:uid/:entryId", async (req, res) => {
  try {
    const { uid, entryId } = req.params;
    const { name, duration, calories } = req.body;

    const entryRef = db.collection("CustomActivity")
      .doc(uid)
      .collection("entries")
      .doc(entryId);

    await entryRef.update({
      name,
      duration,
      calories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true, message: "Custom activity updated" });
  } catch (error) {
    console.error("Error updating custom activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Remove custom activity
app.delete("/CustomActivity/:uid/:entryId", async (req, res) => {
  try {
    const { uid, entryId } = req.params;

    await db.collection("CustomActivity")
      .doc(uid)
      .collection("entries")
      .doc(entryId)
      .delete();

    res.status(200).json({ success: true, message: "Custom activity deleted" });
  } catch (error) {
    console.error("Error deleting custom activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// POST - Add custom food
app.post("/CustomFood/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, serving, numOfServings, calories, protein, fat, carbs, mealType } = req.body;

    const foodRef = await db.collection("CustomFood")
      .doc(uid)
      .collection("entries")
      .add({
        name,
        serving,
        numOfServings,
        calories,
        protein,
        fat,
        carbs,
        mealType,
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(200).json({
      success: true,
      entry: {
        id: foodRef.id,
        name,
        serving,
        numOfServings,
        calories,
        protein,
        fat,
        carbs,
        mealType,
      },
    });
  } catch (error) {
    console.error("Error saving custom food:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Fetch all custom foods for a user
app.get("/CustomFood/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db.collection("CustomFood")
      .doc(uid)
      .collection("entries")
      .orderBy("createdAt", "desc")
      .get();

    const foods = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(foods);
  } catch (error) {
    console.error("Error fetching custom foods:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update custom food
app.put("/CustomFood/:uid/:entryId", async (req, res) => {
  try {
    const { uid, entryId } = req.params;
    const { name, serving, numOfServings, calories, protein, fat, carbs, mealType } = req.body;

    const entryRef = db.collection("CustomFood")
      .doc(uid)
      .collection("entries")
      .doc(entryId);

    await entryRef.update({
      name,
      serving,
      numOfServings,
      calories,
      protein,
      fat,
      carbs,
      mealType,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true, message: "Custom food updated" });
  } catch (error) {
    console.error("Error updating custom food:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Remove custom food
app.delete("/CustomFood/:uid/:entryId", async (req, res) => {
  try {
    const { uid, entryId } = req.params;

    await db.collection("CustomFood")
      .doc(uid)
      .collection("entries")
      .doc(entryId)
      .delete();

    res.status(200).json({ success: true, message: "Custom food deleted" });
  } catch (error) {
    console.error("Error deleting custom food:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


async function seedActivities() {
  try {
    const snapshot = await db.collection("Activities").get();

    if (snapshot.size === 0) {
      console.log("⚡ Seeding default activities...");
      const batch = db.batch();

      activitiesData.forEach((activity) => {
        const docRef = db.collection("Activities").doc();
        batch.set(docRef, {
          name: activity.name,
          met: activity.met,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      console.log("✅ Default activities loaded into Firestore");
    } else {
      console.log(`ℹ️ Activities already exist (${snapshot.size} docs), skipping seeding`);
    }
  } catch (error) {
    console.error("❌ Error seeding activities:", error);
  }
}

// ⚡ Call seeding on server start
seedActivities();


// ✅ GET - Fetch all activities
app.get("/activities", async (req, res) => {
  try {
    const snapshot = await db.collection("Activities").orderBy("name").get();

    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST - Add a single activity manually (admin feature)
app.post("/activities", async (req, res) => {
  try {
    const { name, duration, calories } = req.body;

    if (!name || !duration || !calories) {
      return res
        .status(400)
        .json({ error: "Name, duration, and calories are required" });
    }

    const newActivity = await db.collection("Activities").add({
      name,
      duration,
      calories,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      id: newActivity.id,
      name,
      duration,
      calories,
    });
  } catch (error) {
    console.error("Error adding activity:", error);
    res.status(500).json({ error: error.message });
  }
});


app.get("/user_info/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "UID is required" });

    const userDoc = await db.collection("user_info").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(userDoc.data());
  } catch (error) {
    console.error("❌ Error fetching user info:", error);
    res.status(500).json({ error: error.message });
  }
});


// Add this to your backend routes file

app.get("/goals/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    // Get the user's goals document
    const goalsDoc = await db.collection("goals").doc(uid).get();
    
    if (!goalsDoc.exists) {
      return res.status(404).json({ error: "Goals not found" });
    }

    const goalsData = goalsDoc.data();
    
    // Format the response
    const formattedGoals = {
      challenges: goalsData.challenges || [],
      goals: goalsData.goals || [],
      personalizedPref: goalsData.personalizedPref || null,
      targetWeight: goalsData.targetWeight || null,
      weightLossGoal: goalsData.weightLossGoal || null,
      uid: goalsData.uid || uid
    };

    res.json(formattedGoals);
  } catch (error) {
    console.error("❌ Error fetching user goals:", error);
    res.status(500).json({ error: error.message });
  }
});

// Optional: Get challenges list mapping
app.get("/challenges-list", async (req, res) => {
  try {
    const challengesMap = {
      0: "Lack of Perseverance",
      1: "Lack of Time",
      2: "Food Cravings"
    };
    res.json(challengesMap);
  } catch (error) {
    console.error("❌ Error fetching challenges list:", error);
    res.status(500).json({ error: error.message });
  }
});

// Optional: Get goals list mapping
app.get("/goals-list", async (req, res) => {
  try {
    const goalsMap = {
      0: "Lose Weight",
      1: "Improve Health"
    };
    res.json(goalsMap);
  } catch (error) {
    console.error("❌ Error fetching goals list:", error);
    res.status(500).json({ error: error.message });
  }
});


// =======================
// ✅ POST - Add new QRFood entry
app.post("/QRFood", async (req, res) => {
  try {
    const {
      barcode,
      productName,
      calories,
      protein,
      fat,
      carbs,
      uid,
      servingAmount,
      servingUnit,
      status,
    } = req.body;

    // Validation
    if (!barcode || !productName || !uid) {
      return res.status(400).json({
        success: false,
        error: "Barcode, product name, and user ID are required",
      });
    }

    // Use barcode as document ID
    const docRef = db.collection("QRFood").doc(barcode);

    // Save to Firestore
    await docRef.set({
      barcode,
      productName,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      carbs: parseFloat(carbs) || 0,
      uid,
      servingAmount: parseFloat(servingAmount) || 100, // fallback to 100 if empty
      servingUnit: servingUnit || "g", // fallback to grams if empty
      status: status || "pending_verification",
      createdAt: new Date(),
    });

    // Return success response with ID
    res.status(201).json({
      success: true,
      id: docRef.id,
      message: "Food submitted successfully for verification",
    });
  } catch (error) {
    console.error("Error adding QRFood:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// ✅ GET - Fetch all QRFood entries for a specific user
app.get("/QRFood/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: "User ID (uid) is required" });
    }

    const snapshot = await db
      .collection("QRFood")
      .where("uid", "==", uid)
      .get();

    const foods = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    res.status(200).json(foods);
  } catch (error) {
    console.error("Error fetching QRFood:", error);
    res.status(500).json({ error: error.message });
  }
});


// GET single product by barcode (NEW - ADD THIS)
app.get("/QRFood/barcode/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;
    
    if (!barcode) {
      return res.status(400).json({ 
        success: false,
        error: "Barcode is required" 
      });
    }

    const docRef = db.collection("QRFood").doc(barcode);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }

    res.status(200).json({
      success: true,
      ...doc.data()
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ✅ Get daily summary for a user for a specific date
app.get("/daily_summary/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { date } = req.query;

    if (!uid || !date) {
      return res.status(400).json({ success: false, message: "Missing uid or date" });
    }

    const docRef = db.collection("daily_summary").doc(`${uid}_${date}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(200).json({}); // no summary yet, return empty object
    }

    res.json(doc.data());
  } catch (err) {
    console.error("Error fetching daily summary:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// ✅ Update daily calorie summary for a user
app.post("/daily_summary/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    let { date, caloriesEaten, caloriesBurned, remainingCalories, weight } = req.body;

    if (!uid || !date) {
      return res.status(400).json({ success: false, message: "Missing uid or date" });
    }

    // Default numeric fields if undefined
    caloriesEaten = caloriesEaten ?? 0;
    caloriesBurned = caloriesBurned ?? 0;
    remainingCalories = remainingCalories ?? 0;
    const summaryRef = db.collection("daily_summary").doc(`${uid}_${date}`);

    await summaryRef.set(
      {
        uid,
        date,
        caloriesEaten,
        caloriesBurned,
        remainingCalories,
        ...(weight !== undefined && { weight }),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.json({ success: true, message: "Daily summary updated" });
  } catch (err) {
    console.error("❌ Error updating daily summary:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get all weight entries for a user (for progress chart)
// ✅ Fetch weight progress from daily_summary
app.get("/weight_progress/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "Missing UID" });

    const snapshot = await db
      .collection("daily_summary")
      .where("uid", "==", uid)
      .orderBy("date", "asc")
      .get();

    if (snapshot.empty) {
      return res.json([]); // No records yet
    }

    const data = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return d.weight
          ? { date: d.date, weight: d.weight }
          : null;
      })
      .filter(Boolean); // Remove nulls (entries without weight)

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching weight progress:",err.toString(), err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// ✅ Get user's target weight goal
app.get("/goals/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const doc = await db.collection("goals").doc(uid).get();
    console.log("🎯 Goals fetched for", uid, "=>", doc.data());

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Goals not found" });
    }

    const data = doc.data();
    res.json({
      success: true,
      targetWeight: data.targetWeight || 0,
      weightLossGoal: data.weightLossGoal || "Not specified", // ✅ Added
      goals: data.goals || [],
      challenges: data.challenges || [],
      personalizedPref: data.personalizedPref || "",
    });
  } catch (err) {
    console.error("Error fetching goals:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// ==================== FOR PROFILE TAB BOTH EXPERTS ====================
// Get nutritionist info by UID
app.get("/nutritionist-info/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching nutritionist info for:", uid);
    
    // Fetch name from nutritionist collection
    const nutritionistDoc = await db.collection("nutritionist").doc(uid).get();
    
    if (!nutritionistDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Nutritionist not found"
      });
    }
    
    const nutritionistData = nutritionistDoc.data();
    
    // Fetch additional info from nutritionist_info collection
    const nutritionistInfoDoc = await db.collection("nutritionist_info").doc(uid).get();
    const nutritionistInfoData = nutritionistInfoDoc.exists ? nutritionistInfoDoc.data() : {};
    
    res.status(200).json({
      success: true,
      nutritionist: {
        ...nutritionistInfoData,
        ...nutritionistData, // name from nutritionist collection takes priority
      },
    });
  } catch (error) {
    console.error("Error fetching nutritionist info:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get nutritionist services by UID
app.get("/servicesNutritionist/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching services for nutritionist:", uid);
   
    // Fetch from the servicesNutritionist collection
    const servicesDoc = await db.collection("servicesNutritionist").doc(uid).get();
   
    if (!servicesDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Services not found for this nutritionist"
      });
    }
   
    const servicesData = servicesDoc.data();
   
    res.status(200).json({
      success: true,
      services: servicesData,
    });
  } catch (error) {
    console.error("Error fetching nutritionist services:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get nutritionist availability by UID
app.get("/availabilityNutritionist/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching availability for nutritionist:", uid);

    // Fetch from the availabilityNutritionist collection
    const availabilityDoc = await db.collection("availabilityNutritionist").doc(uid).get();

    if (!availabilityDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Availability not found for this nutritionist"
      });
    }

    const availabilityData = availabilityDoc.data();

    res.status(200).json({
      success: true,
      availability: availabilityData,
    });
  } catch (error) {
    console.error("Error fetching nutritionist availability:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT endpoint to update nutritionist info
app.put("/nutritionist-info/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    console.log("Updating nutritionist info for:", uid);
    console.log("Updates:", updates);

    // Validate that the document exists in main collection
    const nutritionistDoc = await db.collection("nutritionist").doc(uid).get();
    
    if (!nutritionistDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Nutritionist not found"
      });
    }

    // If name is being updated, update it in the nutritionist collection
    if (updates.name) {
      await db.collection("nutritionist").doc(uid).update({
        name: updates.name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Remove name from updates object before updating nutritionist_info
    const { name, ...updatesWithoutName } = updates;

    // Check if nutritionist_info exists
    const nutritionistInfoDoc = await db.collection("nutritionist_info").doc(uid).get();
    
    if (!nutritionistInfoDoc.exists && Object.keys(updatesWithoutName).length > 0) {
      // Create new document if it doesn't exist
      await db.collection("nutritionist_info").doc(uid).set({
        ...updatesWithoutName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else if (Object.keys(updatesWithoutName).length > 0) {
      // Update the nutritionist_info document (without name)
      await db.collection("nutritionist_info").doc(uid).update({
        ...updatesWithoutName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Fetch the updated documents
    const updatedInfoDoc = await db.collection("nutritionist_info").doc(uid).get();
    const updatedNameDoc = await db.collection("nutritionist").doc(uid).get();
    
    res.status(200).json({
      success: true,
      nutritionist: {
        ...(updatedInfoDoc.exists ? updatedInfoDoc.data() : {}),
        name: updatedNameDoc.data().name
      },
      message: "Nutritionist info updated successfully"
    });
  } catch (error) {
    console.error("Error updating nutritionist info:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT endpoint to update nutritionist services
app.put("/servicesNutritionist/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    console.log("Updating services for nutritionist:", uid);
    console.log("Updates:", updates);

    // Check if document exists
    const servicesDoc = await db.collection("servicesNutritionist").doc(uid).get();
    
    if (!servicesDoc.exists) {
      // Create new document if it doesn't exist
      await db.collection("servicesNutritionist").doc(uid).set({
        ...updates,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing document
      await db.collection("servicesNutritionist").doc(uid).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Fetch the updated document
    const updatedDoc = await db.collection("servicesNutritionist").doc(uid).get();
    
    res.status(200).json({
      success: true,
      services: updatedDoc.data(),
      message: "Services updated successfully"
    });
  } catch (error) {
    console.error("Error updating nutritionist services:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT endpoint to update nutritionist availability
app.put("/availabilityNutritionist/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    console.log("Updating availability for nutritionist:", uid);
    console.log("Updates:", updates);

    // Check if document exists
    const availabilityDoc = await db.collection("availabilityNutritionist").doc(uid).get();
    
    if (!availabilityDoc.exists) {
      // Create new document if it doesn't exist
      await db.collection("availabilityNutritionist").doc(uid).set({
        ...updates,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing document
      await db.collection("availabilityNutritionist").doc(uid).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Fetch the updated document
    const updatedDoc = await db.collection("availabilityNutritionist").doc(uid).get();
    
    res.status(200).json({
      success: true,
      availability: updatedDoc.data(),
      message: "Availability updated successfully"
    });
  } catch (error) {
    console.error("Error updating nutritionist availability:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get coach info by UID
app.get("/coach-info/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching coach info for:", uid);
    
    // Fetch name from coach collection
    const coachDoc = await db.collection("coach").doc(uid).get();
    
    if (!coachDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Coach not found"
      });
    }
    
    const coachData = coachDoc.data();
    
    // Fetch additional info from coach_info collection
    const coachInfoDoc = await db.collection("coach_info").doc(uid).get();
    const coachInfoData = coachInfoDoc.exists ? coachInfoDoc.data() : {};
    
    res.status(200).json({
      success: true,
      coach: {
        ...coachInfoData,
        ...coachData, // name from coach collection takes priority
      },
    });
  } catch (error) {
    console.error("Error fetching coach info:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get coach services by UID
app.get("/servicesCoach/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching services for coach:", uid);
   
    // Fetch from the servicesCoach collection
    const servicesDoc = await db.collection("servicesCoach").doc(uid).get();
   
    if (!servicesDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Services not found for this coach"
      });
    }
   
    const servicesData = servicesDoc.data();
   
    res.status(200).json({
      success: true,
      services: servicesData,
    });
  } catch (error) {
    console.error("Error fetching coach services:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get coach availability by UID
app.get("/availabilityCoach/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching availability for coach:", uid);

    // Fetch from the availabilityCoach collection
    const availabilityDoc = await db.collection("availabilityCoach").doc(uid).get();

    if (!availabilityDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Availability not found for this coach"
      });
    }

    const availabilityData = availabilityDoc.data();

    res.status(200).json({
      success: true,
      availability: availabilityData,
    });
  } catch (error) {
    console.error("Error fetching coach availability:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT endpoint to update coach info
app.put("/coach-info/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    console.log("Updating coach info for:", uid);
    console.log("Updates:", updates);

    // Validate that the document exists in main collection
    const coachDoc = await db.collection("coach").doc(uid).get();
    
    if (!coachDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Coach not found"
      });
    }

    // If name is being updated, update it in the coach collection
    if (updates.name) {
      await db.collection("coach").doc(uid).update({
        name: updates.name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Remove name from updates object before updating coach_info
    const { name, ...updatesWithoutName } = updates;

    // Check if coach_info exists
    const coachInfoDoc = await db.collection("coach_info").doc(uid).get();
    
    if (!coachInfoDoc.exists && Object.keys(updatesWithoutName).length > 0) {
      // Create new document if it doesn't exist
      await db.collection("coach_info").doc(uid).set({
        ...updatesWithoutName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else if (Object.keys(updatesWithoutName).length > 0) {
      // Update the coach_info document (without name)
      await db.collection("coach_info").doc(uid).update({
        ...updatesWithoutName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Fetch the updated documents
    const updatedInfoDoc = await db.collection("coach_info").doc(uid).get();
    const updatedNameDoc = await db.collection("coach").doc(uid).get();
    
    res.status(200).json({
      success: true,
      coach: {
        ...(updatedInfoDoc.exists ? updatedInfoDoc.data() : {}),
        name: updatedNameDoc.data().name
      },
      message: "Coach info updated successfully"
    });
  } catch (error) {
    console.error("Error updating coach info:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT endpoint to update coach services
app.put("/servicesCoach/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    console.log("Updating services for coach:", uid);
    console.log("Updates:", updates);

    // Check if document exists
    const servicesDoc = await db.collection("servicesCoach").doc(uid).get();
    
    if (!servicesDoc.exists) {
      // Create new document if it doesn't exist
      await db.collection("servicesCoach").doc(uid).set({
        ...updates,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing document
      await db.collection("servicesCoach").doc(uid).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Fetch the updated document
    const updatedDoc = await db.collection("servicesCoach").doc(uid).get();
    
    res.status(200).json({
      success: true,
      services: updatedDoc.data(),
      message: "Services updated successfully"
    });
  } catch (error) {
    console.error("Error updating coach services:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT endpoint to update coach availability
app.put("/availabilityCoach/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    console.log("Updating availability for coach:", uid);
    console.log("Updates:", updates);

    // Check if document exists
    const availabilityDoc = await db.collection("availabilityCoach").doc(uid).get();
    
    if (!availabilityDoc.exists) {
      // Create new document if it doesn't exist
      await db.collection("availabilityCoach").doc(uid).set({
        ...updates,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing document
      await db.collection("availabilityCoach").doc(uid).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Fetch the updated document
    const updatedDoc = await db.collection("availabilityCoach").doc(uid).get();
    
    res.status(200).json({
      success: true,
      availability: updatedDoc.data(),
      message: "Availability updated successfully"
    });
  } catch (error) {
    console.error("Error updating coach availability:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Create Nutritionist Article
app.post('/nutritionist_article', async (req, res) => {
  try {
    const {
      nutritionistId,
      nutritionistName,
      title,
      keywords,
      description,
      articleLink,
      photos,
      createdAt,
    } = req.body;

    // Validate required fields
    if (!nutritionistId || !title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'nutritionistId, title, and description are required',
      });
    }

    // Validate article link if provided
    if (articleLink) {
      try {
        new URL(articleLink);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid article link',
          message: 'Please provide a valid URL for the article link',
        });
      }
    }

    // Fetch nutritionist name if not provided or is undefined
    let finalNutritionistName = nutritionistName;
    if (!finalNutritionistName || finalNutritionistName === undefined) {
      try {
        const nutritionistDoc = await db.collection('nutritionist').doc(nutritionistId).get();
        if (nutritionistDoc.exists) {
          finalNutritionistName = nutritionistDoc.data().name || 'Nutritionist';
        } else {
          // Fallback to nutritionist_info collection
          const nutritionistInfoDoc = await db.collection('nutritionist_info').doc(nutritionistId).get();
          if (nutritionistInfoDoc.exists) {
            finalNutritionistName = nutritionistInfoDoc.data().name || 'Nutritionist';
          } else {
            finalNutritionistName = 'Nutritionist'; // Final fallback
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch nutritionist name:', fetchError);
        finalNutritionistName = 'Nutritionist'; // Fallback if fetch fails
      }
    }

    // Create article document
    const articleData = {
      nutritionistId,
      nutritionistName: finalNutritionistName,
      title,
      keywords: keywords || [],
      description,
      articleLink: articleLink || null,
      photos: photos || [],
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('nutritionist_articles').add(articleData);

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      articleId: docRef.id,
      data: { id: docRef.id, ...articleData },
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      error: 'Failed to create article',
      message: error.message,
    });
  }
});

// Get Articles by Nutritionist
app.get('/nutritionist_article', async (req, res) => {
  try {
    const { nutritionistId } = req.query;

    if (!nutritionistId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'nutritionistId is required',
      });
    }

    let query = db.collection('nutritionist_articles');

    // Filter by nutritionistId
    query = query.where('nutritionistId', '==', nutritionistId);

    const articlesSnapshot = await query.get();

    const articles = [];
    articlesSnapshot.forEach((doc) => {
      articles.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort articles by createdAt in JavaScript (newest first)
    articles.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      error: 'Failed to fetch articles',
      message: error.message,
    });
  }
});

// Get All Nutritionist Articles (optional, for public feed)
app.get('/nutritionist_article/all', async (req, res) => {
  try {
    const { limit = 20, startAfter } = req.query;

    let query = db.collection('nutritionist_articles').orderBy('createdAt', 'desc').limit(parseInt(limit));

    if (startAfter) {
      const startAfterDoc = await db.collection('nutritionist_articles').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const articlesSnapshot = await query.get();

    const articles = [];
    articlesSnapshot.forEach((doc) => {
      articles.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      error: 'Failed to fetch articles',
      message: error.message,
    });
  }
});

// Get Single Nutritionist Article by ID
app.get('/nutritionist_article/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const articleDoc = await db.collection('nutritionist_articles').doc(id).get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        error: 'Article not found',
        message: `No article found with ID: ${id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: articleDoc.id,
        ...articleDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      error: 'Failed to fetch article',
      message: error.message,
    });
  }
});

// Update Nutritionist Article
app.put('/nutritionist_article/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, keywords, description, articleLink, photos } = req.body;

    const articleRef = db.collection('nutritionist_articles').doc(id);
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        error: 'Article not found',
        message: `No article found with ID: ${id}`,
      });
    }

    // Validate article link if provided
    if (articleLink) {
      try {
        new URL(articleLink);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid article link',
          message: 'Please provide a valid URL for the article link',
        });
      }
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (keywords) updateData.keywords = keywords;
    if (description) updateData.description = description;
    if (articleLink !== undefined) updateData.articleLink = articleLink;
    if (photos !== undefined) updateData.photos = photos;

    await articleRef.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      error: 'Failed to update article',
      message: error.message,
    });
  }
});

// Delete Nutritionist Article
app.delete('/nutritionist_article/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const articleRef = db.collection('nutritionist_articles').doc(id);
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        error: 'Article not found',
        message: `No article found with ID: ${id}`,
      });
    }

    await articleRef.delete();

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      error: 'Failed to delete article',
      message: error.message,
    });
  }
});



// Create Coach Article
app.post('/coacharticle', async (req, res) => {
  try {
    const {
      coachId,
      coachName,
      title,
      keywords,
      description,
      articleLink,
      photos,
      createdAt,
    } = req.body;

    // Validate required fields
    if (!coachId || !title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'coachId, title, and description are required',
      });
    }

    // Validate article link if provided
    if (articleLink) {
      try {
        new URL(articleLink);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid article link',
          message: 'Please provide a valid URL for the article link',
        });
      }
    }

    // Fetch coach name if not provided or is undefined
    let finalCoachName = coachName;
    if (!finalCoachName || finalCoachName === undefined) {
      try {
        const coachDoc = await db.collection('coach').doc(coachId).get();
        if (coachDoc.exists) {
          finalCoachName = coachDoc.data().name || 'Coach';
        } else {
          // Fallback to coach_info collection
          const coachInfoDoc = await db.collection('coach_info').doc(coachId).get();
          if (coachInfoDoc.exists) {
            finalCoachName = coachInfoDoc.data().name || 'Coach';
          } else {
            finalCoachName = 'Coach'; // Final fallback
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch coach name:', fetchError);
        finalCoachName = 'Coach'; // Fallback if fetch fails
      }
    }

    // Create article document
    const articleData = {
      coachId,
      coachName: finalCoachName,
      title,
      keywords: keywords || [],
      description,
      articleLink: articleLink || null,
      photos: photos || [],
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('coach_articles').add(articleData);

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      articleId: docRef.id,
      data: { id: docRef.id, ...articleData },
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      error: 'Failed to create article',
      message: error.message,
    });
  }
});

// Get Articles by Coach
app.get('/coacharticle', async (req, res) => {
  try {
    const { coachId } = req.query;

    if (!coachId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'coachId is required',
      });
    }

    let query = db.collection('coach_articles');

    // Filter by coachId
    query = query.where('coachId', '==', coachId);

    const articlesSnapshot = await query.get();

    const articles = [];
    articlesSnapshot.forEach((doc) => {
      articles.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort articles by createdAt in JavaScript (newest first)
    articles.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      error: 'Failed to fetch articles',
      message: error.message,
    });
  }
});

// Get All Coach Articles (optional, for public feed)
app.get('/coacharticle/all', async (req, res) => {
  try {
    const { limit = 20, startAfter } = req.query;

    let query = db.collection('coach_articles').orderBy('createdAt', 'desc').limit(parseInt(limit));

    if (startAfter) {
      const startAfterDoc = await db.collection('coach_articles').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const articlesSnapshot = await query.get();

    const articles = [];
    articlesSnapshot.forEach((doc) => {
      articles.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      error: 'Failed to fetch articles',
      message: error.message,
    });
  }
});

// Get Single Coach Article by ID
app.get('/coacharticle/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const articleDoc = await db.collection('coach_articles').doc(id).get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        error: 'Article not found',
        message: `No article found with ID: ${id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: articleDoc.id,
        ...articleDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      error: 'Failed to fetch article',
      message: error.message,
    });
  }
});

// Update Coach Article
app.put('/coacharticle/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, keywords, description, articleLink, photos } = req.body;

    const articleRef = db.collection('coach_articles').doc(id);
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        error: 'Article not found',
        message: `No article found with ID: ${id}`,
      });
    }

    // Validate article link if provided
    if (articleLink) {
      try {
        new URL(articleLink);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid article link',
          message: 'Please provide a valid URL for the article link',
        });
      }
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (keywords) updateData.keywords = keywords;
    if (description) updateData.description = description;
    if (articleLink !== undefined) updateData.articleLink = articleLink;
    if (photos !== undefined) updateData.photos = photos;

    await articleRef.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      error: 'Failed to update article',
      message: error.message,
    });
  }
});

// Delete Coach Article
app.delete('/coacharticle/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const articleRef = db.collection('coach_articles').doc(id);
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        error: 'Article not found',
        message: `No article found with ID: ${id}`,
      });
    }

    await articleRef.delete();

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      error: 'Failed to delete article',
      message: error.message,
    });
  }
});

// GET endpoint to fetch all articles from both coaches and nutritionists for HomeTab
app.get("/articles/all", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    console.log("Fetching all articles from coaches and nutritionists for HomeTab");

    const articles = [];

    // Fetch articles from coaches
    const coachArticlesSnapshot = await db.collection("coach_articles")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .get();
    
    coachArticlesSnapshot.forEach((doc) => {
      const articleData = doc.data();
      articles.push({
        id: doc.id,
        ...articleData,
        authorType: 'coach',
        authorName: articleData.coachName || 'Coach',
        authorId: articleData.coachId,
        title: articleData.title,
        description: articleData.description,
        content: articleData.description, // Using description as content
        imageUrl: articleData.photos && articleData.photos.length > 0 ? articleData.photos[0] : null,
        articleLink: articleData.articleLink || null,
        keywords: articleData.keywords || [],
        createdAt: articleData.createdAt
      });
    });

    // Fetch articles from nutritionists
    const nutritionistArticlesSnapshot = await db.collection("nutritionist_articles")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .get();
    
    nutritionistArticlesSnapshot.forEach((doc) => {
      const articleData = doc.data();
      articles.push({
        id: doc.id,
        ...articleData,
        authorType: 'nutritionist',
        authorName: articleData.nutritionistName || 'Nutritionist',
        authorId: articleData.nutritionistId,
        title: articleData.title,
        description: articleData.description,
        content: articleData.description, // Using description as content
        imageUrl: articleData.photos && articleData.photos.length > 0 ? articleData.photos[0] : null,
        articleLink: articleData.articleLink || null,
        keywords: articleData.keywords || [],
        createdAt: articleData.createdAt
      });
    });

    // Sort all articles by creation date (newest first)
    articles.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    // Limit the combined results
    const limitedArticles = articles.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      articles: limitedArticles,
      count: limitedArticles.length
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// submit user review
app.post("/submit-review", async (req, res) => {
  try {
    const { userId, userEmail, rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Invalid rating. Must be between 1 and 5.",
      });
    }

    if (!review || review.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Review text is required.",
      });
    }

    const reviewData = {
      userId: userId || "anonymous",
      userEmail: userEmail || "anonymous@example.com",
      rating: parseInt(rating),
      review: review.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("users_review").add(reviewData);

    res.status(200).json({
      success: true,
      message: "Review submitted successfully",
      reviewId: docRef.id,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: error.message,
    });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
