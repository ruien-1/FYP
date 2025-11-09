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

// 🟢 Cancel fasting timer notification by identifier
export async function cancelFastingNotification(identifier) {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    // Notification might not exist, that's okay
  }
}

// 🟢 Cancel ALL fasting timer notifications (cleanup function)
export async function cancelAllFastingNotifications() {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    let cancelledCount = 0;
    
    for (const notif of allNotifications) {
      // Cancel fasting timer notifications and expired notifications
      if (notif.identifier && notif.identifier.startsWith('fastingTimer_')) {
        try {
          // Also check if notification is expired
          if (notif.trigger && notif.trigger.type === 'date') {
            const triggerDate = new Date(notif.trigger.date);
            if (triggerDate < new Date()) {
              // Notification is expired, cancel it
              await Notifications.cancelScheduledNotificationAsync(notif.identifier);
              cancelledCount++;
              continue;
            }
          }
          // Cancel all fasting timer notifications regardless
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          cancelledCount++;
        } catch (err) {
          // Notification might not exist, that's okay
        }
      }
    }
    
    if (cancelledCount > 0) {
      console.log(`🧹 Cleaned up ${cancelledCount} fasting timer notification(s)`);
    }
  } catch (error) {
    console.error("Error cancelling all fasting notifications:", error);
  }
}

// 🟢 Generic scheduler for fasting timer notifications
export async function scheduleNotification({ title, body, delayMs, identifier }) {
  try {
    // Cancel ALL existing fasting timer notifications first to prevent accumulation
    await cancelAllFastingNotifications();

    const triggerTime = new Date(Date.now() + delayMs);
    
    // Only schedule if the time is in the future and valid
    if (delayMs <= 0 || !title || !body) {
      if (delayMs <= 0) {
        console.log("⏰ Notification time is in the past, skipping");
      }
      return;
    }

    // Use the new API format with identifier
    const notificationId = identifier || `fastingTimer_${Date.now()}`;
    
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: { 
        title, 
        body, 
        sound: "default",
        data: {
          type: "fastingTimer",
        }
      },
      trigger: {
        type: "date",
        date: triggerTime,
      },
    });
    
    // Only log once to reduce spam
    console.log("⏰ Fasting timer notification scheduled for:", triggerTime.toLocaleString());
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }
}


// ❌ Cancel ALL notifications (including fasting timer and meal reminders)
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
    console.log("✅ All notifications cancelled");
  } catch (error) {
    console.error("Error cancelling all notifications:", error);
  }
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
    console.log("🔄 [STREAK REMINDER] Starting scheduleMealReminderIfNeeded()");
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ [STREAK REMINDER] No user logged in, skipping meal reminder");
      return;
    }
    console.log("✅ [STREAK REMINDER] User found:", user.uid);

    // Check if user has logged a meal today
    const hasLogged = await hasLoggedMealToday(user.uid);
    console.log("📝 [STREAK REMINDER] Has logged meal today:", hasLogged);
    if (hasLogged) {
      console.log("✅ [STREAK REMINDER] User has already logged a meal today, skipping reminder");
      // Cancel any existing meal reminder notifications
      await cancelMealReminderNotifications();
      return;
    }

    // Check if we've already scheduled a reminder for today
    const today = new Date().toISOString().split("T")[0];
    const reminderKey = `mealReminder_${user.uid}_${today}`;
    const existingReminder = await AsyncStorage.getItem(reminderKey);
    console.log("🔍 [STREAK REMINDER] Checking for existing reminder. Key:", reminderKey, "Exists:", !!existingReminder);
    if (existingReminder) {
      console.log("⚠️ [STREAK REMINDER] Meal reminder already scheduled for today with identifier:", existingReminder);
      // Verify the notification still exists in the system
      let notificationFound = false;
      try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log("🔍 [STREAK REMINDER] Checking", allNotifications.length, "scheduled notifications in system");
        const foundNotification = allNotifications.find(n => n.identifier === existingReminder);
        if (foundNotification) {
          notificationFound = true;
          console.log("✅ [STREAK REMINDER] Existing notification found in system:");
          console.log("   - Identifier:", foundNotification.identifier);
          console.log("   - Trigger type:", foundNotification.trigger?.type);
          console.log("   - Trigger object:", JSON.stringify(foundNotification.trigger, null, 2));
          
          if (foundNotification.trigger?.type === 'date') {
            try {
              // Handle different date formats that Expo might return
              // Expo notifications use 'value' (timestamp) for date triggers, not 'date'
              let scheduledDate;
              const triggerDate = foundNotification.trigger.date || foundNotification.trigger.value;
              
              console.log("   - Raw trigger.date value:", foundNotification.trigger.date);
              console.log("   - Raw trigger.value (timestamp):", foundNotification.trigger.value);
              console.log("   - Using value:", triggerDate);
              console.log("   - Value type:", typeof triggerDate);
              
              // Try parsing as Date object, timestamp, or string
              if (triggerDate instanceof Date) {
                scheduledDate = triggerDate;
              } else if (typeof triggerDate === 'number') {
                scheduledDate = new Date(triggerDate);
              } else if (typeof triggerDate === 'string') {
                scheduledDate = new Date(triggerDate);
              } else {
                console.log("   - ⚠️ Unknown date format, cannot parse");
                scheduledDate = null;
              }
              
              if (scheduledDate && !isNaN(scheduledDate.getTime())) {
                console.log("   - Scheduled for:", scheduledDate.toLocaleString());
                console.log("   - Scheduled time (ISO):", scheduledDate.toISOString());
                const timeUntil = scheduledDate.getTime() - Date.now();
                console.log("   - Time until notification:", Math.floor(timeUntil / 1000 / 60), "minutes");
                console.log("   - Time until notification (hours):", (timeUntil / 1000 / 60 / 60).toFixed(2));
                
                if (timeUntil < 0) {
                  console.log("   - ⚠️ WARNING: Notification time is in the past!");
                  console.log("   - Current time:", new Date().toLocaleString());
                  console.log("   - Scheduled time:", scheduledDate.toLocaleString());
                  console.log("   - Will reschedule a new notification");
                  notificationFound = false; // Treat as not found if time has passed
                } else {
                  console.log("   - ✅ Notification is scheduled for the future");
                }
              } else {
                console.log("   - ⚠️ Could not parse scheduled date");
                console.log("   - Treating as valid notification (might be a parsing issue)");
              }
            } catch (dateParseError) {
              console.error("   - ❌ Error parsing date:", dateParseError.message);
              console.log("   - Treating notification as valid (parsing error, not scheduling error)");
            }
          } else {
            console.log("   - ⚠️ Trigger type is not 'date':", foundNotification.trigger?.type);
          }
        } else {
          console.log("❌ [STREAK REMINDER] Existing notification NOT found in system");
          console.log("   - Stored identifier:", existingReminder);
          console.log("   - Will reschedule a new notification");
        }
      } catch (err) {
        console.error("❌ [STREAK REMINDER] Error checking existing notification:", err);
      }
      
      if (notificationFound) {
        console.log("✅ [STREAK REMINDER] Valid existing notification found, skipping reschedule");
        return; // Only return if we found a valid existing reminder
      } else {
        console.log("🔄 [STREAK REMINDER] Removing invalid/stale reminder from AsyncStorage and rescheduling");
        await AsyncStorage.removeItem(reminderKey);
        // Continue to schedule a new one
      }
    }

    // Schedule for 9 PM (21:00) - if it's already past 9 PM, schedule for tomorrow at 9 PM
    const now = new Date();
    console.log("⏰ [STREAK REMINDER] Current time:", now.toLocaleString());
    console.log("⏰ [STREAK REMINDER] Current time (ISO):", now.toISOString());
    console.log("⏰ [STREAK REMINDER] Current hours:", now.getHours(), "Current minutes:", now.getMinutes());
    
    const reminderTime = new Date(now);
    reminderTime.setHours(21, 0, 0, 0); // 9 PM
    console.log("🕘 [STREAK REMINDER] Initial reminder time set to 9 PM:", reminderTime.toLocaleString());

    // If it's already past 9 PM today, schedule for tomorrow at 9 PM
    if (now.getHours() >= 21) {
      console.log("⏰ [STREAK REMINDER] It's past 9 PM, scheduling for tomorrow at 9 PM");
      reminderTime.setDate(reminderTime.getDate() + 1);
      reminderTime.setHours(21, 0, 0, 0); // 9 PM tomorrow
      console.log("📅 [STREAK REMINDER] Reminder time updated to tomorrow 9 PM:", reminderTime.toLocaleString());
    } else {
      console.log("🕘 [STREAK REMINDER] Scheduling for today at 9 PM");
    }

    const delayMs = reminderTime.getTime() - now.getTime();
    console.log("⏱️ [STREAK REMINDER] Delay in milliseconds:", delayMs);
    console.log("⏱️ [STREAK REMINDER] Delay in minutes:", Math.floor(delayMs / 1000 / 60));
    console.log("⏱️ [STREAK REMINDER] Delay in hours:", (delayMs / 1000 / 60 / 60).toFixed(2));
    console.log("📅 [STREAK REMINDER] Final reminder time:", reminderTime.toLocaleString());
    console.log("📅 [STREAK REMINDER] Final reminder time (ISO):", reminderTime.toISOString());

    // Only schedule if the reminder time is in the future and within 25 hours (to allow scheduling for tomorrow at 9 PM)
    if (delayMs > 0 && delayMs < 25 * 60 * 60 * 1000) {
      console.log("✅ [STREAK REMINDER] Conditions met, scheduling notification...");
      // Use a custom identifier for the notification
      const notificationIdentifier = `mealReminder_${user.uid}_${Date.now()}`;
      console.log("🆔 [STREAK REMINDER] Notification identifier:", notificationIdentifier);
      
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

      console.log("✅ [STREAK REMINDER] Notification scheduled successfully!");
      console.log("   - Notification ID:", notificationId);
      console.log("   - Identifier:", notificationIdentifier);
      console.log("   - Scheduled for:", reminderTime.toLocaleString());
      console.log("   - Scheduled for (ISO):", reminderTime.toISOString());

      // Store reminder identifier to track it
      await AsyncStorage.setItem(reminderKey, notificationIdentifier);
      console.log("💾 [STREAK REMINDER] Stored reminder key in AsyncStorage:", reminderKey);

      // Verify the notification was actually scheduled
      try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const scheduledNotification = allNotifications.find(n => n.identifier === notificationIdentifier);
        if (scheduledNotification) {
          console.log("✅ [STREAK REMINDER] Verification: Notification confirmed in system");
          console.log("   - Found identifier:", scheduledNotification.identifier);
          console.log("   - Trigger type:", scheduledNotification.trigger?.type);
          console.log("   - Trigger object:", JSON.stringify(scheduledNotification.trigger, null, 2));
          
          if (scheduledNotification.trigger?.type === 'date') {
            try {
              // Handle different date formats that Expo might return
              // Expo notifications use 'value' (timestamp) for date triggers, not 'date'
              let verifiedDate;
              const triggerDate = scheduledNotification.trigger.date || scheduledNotification.trigger.value;
              
              console.log("   - Raw trigger.date value:", scheduledNotification.trigger.date);
              console.log("   - Raw trigger.value (timestamp):", scheduledNotification.trigger.value);
              console.log("   - Using value:", triggerDate);
              console.log("   - Value type:", typeof triggerDate);
              
              // Try parsing as Date object, timestamp, or string
              if (triggerDate instanceof Date) {
                verifiedDate = triggerDate;
              } else if (typeof triggerDate === 'number') {
                verifiedDate = new Date(triggerDate);
              } else if (typeof triggerDate === 'string') {
                verifiedDate = new Date(triggerDate);
              } else {
                console.log("   - ⚠️ Unknown date format, cannot parse");
                verifiedDate = null;
              }
              
              if (verifiedDate && !isNaN(verifiedDate.getTime())) {
                console.log("   - Verified scheduled time:", verifiedDate.toLocaleString());
                console.log("   - Verified scheduled time (ISO):", verifiedDate.toISOString());
                const timeDiff = Math.abs(verifiedDate.getTime() - reminderTime.getTime());
                console.log("   - Time difference from requested:", timeDiff, "ms");
                if (timeDiff > 1000) {
                  console.log("   - ⚠️ WARNING: Scheduled time differs from requested time by", Math.floor(timeDiff / 1000), "seconds");
                  console.log("   - Requested time:", reminderTime.toLocaleString());
                  console.log("   - Scheduled time:", verifiedDate.toLocaleString());
                } else {
                  console.log("   - ✅ Scheduled time matches requested time");
                }
              } else {
                console.log("   - ⚠️ Could not parse scheduled date, but notification exists");
                console.log("   - This is okay - the notification is scheduled, we just can't verify the exact time");
              }
            } catch (dateParseError) {
              console.error("   - ❌ Error parsing date:", dateParseError.message);
              console.log("   - ⚠️ Notification is scheduled, but couldn't verify exact time");
            }
          } else {
            console.log("   - ⚠️ Trigger type is not 'date':", scheduledNotification.trigger?.type);
          }
        } else {
          console.log("❌ [STREAK REMINDER] Verification FAILED: Notification NOT found in system!");
          console.log("   - This might indicate a scheduling error");
          console.log("   - Looking for identifier:", notificationIdentifier);
          console.log("   - Available identifiers:", allNotifications.map(n => n.identifier));
        }
        console.log("📊 [STREAK REMINDER] Total scheduled notifications:", allNotifications.length);
      } catch (verifyError) {
        console.error("❌ [STREAK REMINDER] Error verifying notification:", verifyError);
        console.error("   - Error message:", verifyError.message);
        console.error("   - Error stack:", verifyError.stack);
      }
    } else {
      if (delayMs <= 0) {
        console.log("❌ [STREAK REMINDER] Cannot schedule: delay is in the past (", delayMs, "ms)");
        console.log("   - Current time:", now.toLocaleString());
        console.log("   - Reminder time:", reminderTime.toLocaleString());
      }
      if (delayMs >= 25 * 60 * 60 * 1000) {
        console.log("❌ [STREAK REMINDER] Cannot schedule: delay is more than 25 hours (", delayMs, "ms)");
      }
    }
  } catch (error) {
    console.error("❌ [STREAK REMINDER] Error scheduling meal reminder:", error);
    console.error("   - Error message:", error.message);
    console.error("   - Error stack:", error.stack);
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
    console.log("🚀 [STREAK REMINDER] initializeMealReminder() called");
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ [STREAK REMINDER] No user in initializeMealReminder, returning");
      return;
    }
    console.log("✅ [STREAK REMINDER] User found in initializeMealReminder:", user.uid);

    // First, validate and update streak (reset if user hasn't logged meal today)
    try {
      console.log("🔄 [STREAK REMINDER] Validating streak...");
      const response = await API.post(`/streak/validate/${user.uid}`);
      if (response.data?.success) {
        // Check if user exists in database
        if (response.data.message && response.data.message.includes("not found")) {
          // User doesn't exist yet (new signup, not verified), skip notification scheduling
          console.log("⚠️ [STREAK REMINDER] User not verified yet, skipping meal reminder setup");
          return;
        }
        console.log("✅ [STREAK REMINDER] Streak validated:", response.data.streak);
      }
    } catch (error) {
      // Silently fail if endpoint doesn't exist yet (backend needs restart)
      if (error.response?.status === 404) {
        console.log("⚠️ [STREAK REMINDER] Streak validation endpoint not available (backend may need restart)");
        return; // Don't proceed with notifications if validation fails
      } else {
        console.error("❌ [STREAK REMINDER] Error validating streak:", error);
        // If it's a user not found error, don't proceed
        if (error.response?.status === 404 || error.response?.data?.message?.includes("not found")) {
          console.log("⚠️ [STREAK REMINDER] User not found in database, skipping meal reminder setup");
          return;
        }
      }
    }

    // Check if user has logged a meal today (only if user exists in database)
    try {
      console.log("🔍 [STREAK REMINDER] Checking if meal logged today...");
      const hasLogged = await hasLoggedMealToday(user.uid);
      console.log("📝 [STREAK REMINDER] Has logged meal today:", hasLogged);
      
      if (!hasLogged) {
        // Schedule reminder if no meal logged today
        console.log("📅 [STREAK REMINDER] No meal logged, scheduling reminder...");
        await scheduleMealReminderIfNeeded();
      } else {
        // Cancel any existing reminders if meal already logged
        console.log("✅ [STREAK REMINDER] Meal already logged, cancelling any existing reminders...");
        await cancelMealReminderNotifications();
      }
    } catch (error) {
      // If checking meal log fails (e.g., user doesn't exist), don't schedule notifications
      if (error.message?.includes("permission") || error.code === "permission-denied") {
        console.log("⚠️ [STREAK REMINDER] User not verified yet or no permission, skipping meal reminder setup");
      } else {
        console.error("❌ [STREAK REMINDER] Error checking meal log:", error);
      }
    }
    console.log("✅ [STREAK REMINDER] initializeMealReminder() completed");
  } catch (error) {
    console.error("❌ [STREAK REMINDER] Error initializing meal reminder:", error);
    console.error("   - Error message:", error.message);
    console.error("   - Error stack:", error.stack);
  }
}

// 🔍 Debug function to list all scheduled notifications (useful for troubleshooting)
export async function debugListAllNotifications() {
  try {
    console.log("🔍 [DEBUG] Listing all scheduled notifications...");
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 [DEBUG] Total scheduled notifications: ${allNotifications.length}`);
    
    if (allNotifications.length === 0) {
      console.log("⚠️ [DEBUG] No notifications scheduled");
      return;
    }
    
    const user = auth.currentUser;
    const now = new Date();
    
    allNotifications.forEach((notification, index) => {
      console.log(`\n📌 [DEBUG] Notification ${index + 1}:`);
      console.log("   - Identifier:", notification.identifier);
      console.log("   - Title:", notification.content?.title);
      console.log("   - Body:", notification.content?.body);
      console.log("   - Trigger type:", notification.trigger?.type);
      
      if (notification.trigger?.type === 'date') {
        try {
          // Expo notifications use 'value' (timestamp) for date triggers, not 'date'
          const triggerDate = notification.trigger.date || notification.trigger.value;
          let scheduledDate;
          
          console.log("   - Raw trigger.date:", notification.trigger.date);
          console.log("   - Raw trigger.value (timestamp):", notification.trigger.value);
          console.log("   - Using value:", triggerDate);
          
          if (triggerDate instanceof Date) {
            scheduledDate = triggerDate;
          } else if (typeof triggerDate === 'number') {
            scheduledDate = new Date(triggerDate);
          } else if (typeof triggerDate === 'string') {
            scheduledDate = new Date(triggerDate);
          }
          
          if (scheduledDate && !isNaN(scheduledDate.getTime())) {
            console.log("   - Scheduled for:", scheduledDate.toLocaleString());
            console.log("   - Scheduled for (ISO):", scheduledDate.toISOString());
            const timeUntil = scheduledDate.getTime() - now.getTime();
            const hoursUntil = timeUntil / 1000 / 60 / 60;
            console.log("   - Time until notification:", Math.floor(timeUntil / 1000 / 60), "minutes");
            console.log("   - Time until notification:", hoursUntil.toFixed(2), "hours");
            
            if (timeUntil < 0) {
              console.log("   - ⚠️ STATUS: This notification is in the PAST (should have already fired)");
            } else {
              console.log("   - ✅ STATUS: This notification is scheduled for the FUTURE");
            }
          } else {
            console.log("   - ⚠️ Could not parse scheduled date");
            console.log("   - Raw trigger value:", triggerDate);
          }
        } catch (err) {
          console.error("   - ❌ Error parsing date:", err.message);
        }
      }
      
      // Check if it's a meal reminder
      if (notification.identifier && notification.identifier.startsWith('mealReminder_')) {
        console.log("   - 🍽️ Type: Meal reminder");
        if (user && notification.identifier.includes(user.uid)) {
          console.log("   - ✅ Belongs to current user");
        }
      }
    });
    
    console.log(`\n⏰ [DEBUG] Current time: ${now.toLocaleString()}`);
    console.log(`⏰ [DEBUG] Current time (ISO): ${now.toISOString()}`);
  } catch (error) {
    console.error("❌ [DEBUG] Error listing notifications:", error);
  }
}
