import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../api/backend";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice || Platform.OS === "web") return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("⚠️ Notifications permission not granted!");
  }
}

// 🟢 Generic scheduler
export async function scheduleNotification({ title, body, delayMs }) {
  const triggerTime = new Date(Date.now() + delayMs);
  console.log("⏰ Notification scheduled for:", triggerTime.toString());
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: "default"},
    trigger: triggerTime,  // ✅ Just pass the Date object directly
  });
}


// ❌ Cancel notifications for streaks
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

// 🍽️ Check if user has logged a meal today
export async function hasLoggedMealToday(uid) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const mealsRef = collection(db, "meals_log", uid, "meals");
    const q = query(mealsRef, where("date", "==", today));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    // If permission denied or user doesn't exist, return false (no meal logged)
    if (error.code === "permission-denied" || error.message?.includes("permission")) {
      console.log("⚠️ No permission to check meal log (user may not be verified yet)");
      return false;
    }
    console.error("Error checking meal log:", error);
    return false;
  }
}

// 🍽️ Schedule meal reminder notification if user hasn't logged a meal today
export async function scheduleMealReminderIfNeeded() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user logged in, skipping meal reminder");
      return;
    }

    // Check if user has logged a meal today
    const hasLogged = await hasLoggedMealToday(user.uid);
    if (hasLogged) {
      console.log("User has already logged a meal today, skipping reminder");
      // Cancel any existing meal reminder notifications
      await cancelMealReminderNotifications();
      return;
    }

    // Check if we've already scheduled a reminder for today
    const today = new Date().toISOString().split("T")[0];
    const reminderKey = `mealReminder_${user.uid}_${today}`;
    const existingReminder = await AsyncStorage.getItem(reminderKey);
    if (existingReminder) {
      console.log("Meal reminder already scheduled for today");
      return;
    }

    // Calculate time until end of day (11:59 PM) or schedule for 9 PM (21:00)
    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(21, 0, 0, 0); // 9 PM

    // If it's already past 9 PM, schedule for 11:30 PM instead
    if (now.getHours() >= 21) {
      reminderTime.setHours(23, 30, 0, 0); // 11:30 PM
    }

    // If it's past 11:30 PM, schedule for tomorrow at 9 PM
    if (now.getHours() >= 23 && now.getMinutes() >= 30) {
      reminderTime.setDate(reminderTime.getDate() + 1);
      reminderTime.setHours(21, 0, 0, 0);
    }

    const delayMs = reminderTime.getTime() - now.getTime();

    // Only schedule if the reminder time is in the future and within 24 hours
    if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
      // Use a custom identifier for the notification
      const notificationIdentifier = `mealReminder_${user.uid}_${Date.now()}`;
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: notificationIdentifier,
        content: {
          title: "🍽️ Don't forget to log your meal!",
          body: "Log any meal (breakfast, lunch, dinner, or snack) to keep your streak going!",
          sound: "default",
          data: {
            type: "mealReminder",
            userId: user.uid,
          },
        },
        trigger: {
          type: "date",
          date: reminderTime,
        },
      });

      // Store reminder identifier to track it
      await AsyncStorage.setItem(reminderKey, notificationIdentifier);
      console.log(`Meal reminder scheduled for ${reminderTime.toString()}, notification ID: ${notificationId}, identifier: ${notificationIdentifier}`);
    }
  } catch (error) {
    console.error("Error scheduling meal reminder:", error);
  }
}

// 🍽️ Cancel meal reminder notifications
export async function cancelMealReminderNotifications() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const today = new Date().toISOString().split("T")[0];
    
    // Get all reminder keys for this user
    const keys = await AsyncStorage.getAllKeys();
    const reminderKeys = keys.filter(key => key.startsWith(`mealReminder_${user.uid}_`));
    
    // Cancel all meal reminder notifications
    for (const reminderKey of reminderKeys) {
      const storedIdentifier = await AsyncStorage.getItem(reminderKey);
      if (storedIdentifier) {
        // Try to cancel by identifier
        try {
          await Notifications.cancelScheduledNotificationAsync(storedIdentifier);
          console.log(`Cancelled meal reminder notification: ${storedIdentifier}`);
        } catch (err) {
          // Notification might not exist or already cancelled
          console.log(`Notification ${storedIdentifier} not found or already cancelled`);
        }
        await AsyncStorage.removeItem(reminderKey);
      }
    }

    // Also cancel any meal reminder notifications by checking their identifiers
    for (const notification of scheduledNotifications) {
      if (notification.identifier && notification.identifier.startsWith(`mealReminder_${user.uid}_`)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`Cancelled meal reminder notification by identifier: ${notification.identifier}`);
        } catch (err) {
          console.log(`Could not cancel notification ${notification.identifier}`);
        }
      }
    }
  } catch (error) {
    console.error("Error cancelling meal reminder notifications:", error);
  }
}

// 🍽️ Initialize meal reminder check (call this on app startup/login)
export async function initializeMealReminder() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // First, validate and update streak (reset if user hasn't logged meal today)
    try {
      const response = await API.post(`/streak/validate/${user.uid}`);
      if (response.data?.success) {
        // Check if user exists in database
        if (response.data.message && response.data.message.includes("not found")) {
          // User doesn't exist yet (new signup, not verified), skip notification scheduling
          console.log("⚠️ User not verified yet, skipping meal reminder setup");
          return;
        }
        console.log("✅ Streak validated:", response.data.streak);
      }
    } catch (error) {
      // Silently fail if endpoint doesn't exist yet (backend needs restart)
      if (error.response?.status === 404) {
        console.log("⚠️ Streak validation endpoint not available (backend may need restart)");
        return; // Don't proceed with notifications if validation fails
      } else {
        console.error("Error validating streak:", error);
        // If it's a user not found error, don't proceed
        if (error.response?.status === 404 || error.response?.data?.message?.includes("not found")) {
          console.log("⚠️ User not found in database, skipping meal reminder setup");
          return;
        }
      }
    }

    // Check if user has logged a meal today (only if user exists in database)
    try {
      const hasLogged = await hasLoggedMealToday(user.uid);
      
      if (!hasLogged) {
        // Schedule reminder if no meal logged today
        await scheduleMealReminderIfNeeded();
      } else {
        // Cancel any existing reminders if meal already logged
        await cancelMealReminderNotifications();
      }
    } catch (error) {
      // If checking meal log fails (e.g., user doesn't exist), don't schedule notifications
      if (error.message?.includes("permission") || error.code === "permission-denied") {
        console.log("⚠️ User not verified yet or no permission, skipping meal reminder setup");
      } else {
        console.error("Error checking meal log:", error);
      }
    }
  } catch (error) {
    console.error("Error initializing meal reminder:", error);
  }
}
