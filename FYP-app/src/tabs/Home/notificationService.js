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

export async function cancelFastingNotification(identifier) {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
  }
}

export async function cancelAllFastingNotifications() {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    let cancelledCount = 0;
    
    for (const notif of allNotifications) {
      if (notif.identifier && notif.identifier.startsWith('fastingTimer_')) {
        try {
          if (notif.trigger && notif.trigger.type === 'date') {
            const triggerDate = new Date(notif.trigger.date);
            if (triggerDate < new Date()) {
              await Notifications.cancelScheduledNotificationAsync(notif.identifier);
              cancelledCount++;
              continue;
            }
          }
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          cancelledCount++;
        } catch (err) {
        }
      }
    }
    
    if (cancelledCount > 0) {
      (`Cleaned up ${cancelledCount} fasting timer notification(s)`);
    }
  } catch (error) {
  }
}

export async function scheduleNotification({ title, body, delayMs, identifier }) {
  try {
    await cancelAllFastingNotifications();

    const triggerTime = new Date(Date.now() + delayMs);
    
    if (delayMs <= 0 || !title || !body) {
      if (delayMs <= 0) {
      }
      return;
    }

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
    
  } catch (error) {
  }
}


export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
  }
}

export async function hasLoggedMealToday(uid) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const mealsRef = collection(db, "meals_log", uid, "meals");
    const q = query(mealsRef, where("date", "==", today));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    if (error.code === "permission-denied" || error.message?.includes("permission")) {
      return false;
    }
    return false;
  }
}

export async function scheduleMealReminderIfNeeded() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return;
    }

    const hasLogged = await hasLoggedMealToday(user.uid);
    if (hasLogged) {
      await cancelMealReminderNotifications();
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const reminderKey = `mealReminder_${user.uid}_${today}`;
    const existingReminder = await AsyncStorage.getItem(reminderKey);
    if (existingReminder) {
      let notificationFound = false;
      try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const foundNotification = allNotifications.find(n => n.identifier === existingReminder);
        if (foundNotification) {
          notificationFound = true;
          
          if (foundNotification.trigger?.type === 'date') {
            try {

              let scheduledDate;
              const triggerDate = foundNotification.trigger.date || foundNotification.trigger.value;
              
              if (triggerDate instanceof Date) {
                scheduledDate = triggerDate;
              } else if (typeof triggerDate === 'number') {
                scheduledDate = new Date(triggerDate);
              } else if (typeof triggerDate === 'string') {
                scheduledDate = new Date(triggerDate);
              } else {
                scheduledDate = null;
              }
              
              if (scheduledDate && !isNaN(scheduledDate.getTime())) {
                const timeUntil = scheduledDate.getTime() - Date.now();
                
                if (timeUntil < 0) {

                  notificationFound = false; 
                } else {
                }
              } else {
              }
            } catch (dateParseError) {
            }
          } else {
          }
        } else {

        }
      } catch (err) {
      }
      
      if (notificationFound) {
        return; 
      } else {
        await AsyncStorage.removeItem(reminderKey);
      }
    }

    const now = new Date();

    const reminderTime = new Date(now);
    reminderTime.setHours(21, 0, 0, 0); // 9 PM

    if (now.getHours() >= 21) {
      reminderTime.setDate(reminderTime.getDate() + 1);
      reminderTime.setHours(21, 0, 0, 0); // 9 PM tomorrow
    } else {
    }

    const delayMs = reminderTime.getTime() - now.getTime();

    if (delayMs > 0 && delayMs < 25 * 60 * 60 * 1000) {
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



      await AsyncStorage.setItem(reminderKey, notificationIdentifier);

      try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const scheduledNotification = allNotifications.find(n => n.identifier === notificationIdentifier);
        if (scheduledNotification) {

          
          if (scheduledNotification.trigger?.type === 'date') {
            try {
              let verifiedDate;
              const triggerDate = scheduledNotification.trigger.date || scheduledNotification.trigger.value;

              
              if (triggerDate instanceof Date) {
                verifiedDate = triggerDate;
              } else if (typeof triggerDate === 'number') {
                verifiedDate = new Date(triggerDate);
              } else if (typeof triggerDate === 'string') {
                verifiedDate = new Date(triggerDate);
              } else {
                verifiedDate = null;
              }
              
              if (verifiedDate && !isNaN(verifiedDate.getTime())) {

                const timeDiff = Math.abs(verifiedDate.getTime() - reminderTime.getTime());
                if (timeDiff > 1000) {

                } else {
                }
              } else {
              }
            } catch (dateParseError) {
            }
          } else {
          }
        } else {

        }
      } catch (verifyError) {

      }
    } else {
      if (delayMs <= 0) {

      }
      if (delayMs >= 25 * 60 * 60 * 1000) {
      }
    }
  } catch (error) {

  }
}

export async function cancelMealReminderNotifications() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const today = new Date().toISOString().split("T")[0];
    
    const keys = await AsyncStorage.getAllKeys();
    const reminderKeys = keys.filter(key => key.startsWith(`mealReminder_${user.uid}_`));
    
    for (const reminderKey of reminderKeys) {
      const storedIdentifier = await AsyncStorage.getItem(reminderKey);
      if (storedIdentifier) {
        try {
          await Notifications.cancelScheduledNotificationAsync(storedIdentifier);
        } catch (err) {
        }
        await AsyncStorage.removeItem(reminderKey);
      }
    }

    for (const notification of scheduledNotifications) {
      if (notification.identifier && notification.identifier.startsWith(`mealReminder_${user.uid}_`)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        } catch (err) {
        }
      }
    }
  } catch (error) {
  }
}

export async function initializeMealReminder() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return;
    }

    try {
      const response = await API.post(`/streak/validate/${user.uid}`);
      if (response.data?.success) {
        if (response.data.message && response.data.message.includes("not found")) {
          return;
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return; 
      } else {
        // If it's a user not found error, don't proceed
        if (error.response?.status === 404 || error.response?.data?.message?.includes("not found")) {
          return;
        }
      }
    }

    try {
      const hasLogged = await hasLoggedMealToday(user.uid);
      
      if (!hasLogged) {
        await scheduleMealReminderIfNeeded();
      } else {
        await cancelMealReminderNotifications();
      }
    } catch (error) {
      if (error.message?.includes("permission") || error.code === "permission-denied") {
      } else {
      }
    }
  } catch (error) {

  }
}

export async function debugListAllNotifications() {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    if (allNotifications.length === 0) {
      return;
    }
    
    const user = auth.currentUser;
    const now = new Date();
    
    allNotifications.forEach((notification, index) => {

      
      if (notification.trigger?.type === 'date') {
        try {
          const triggerDate = notification.trigger.date || notification.trigger.value;
          let scheduledDate;

          
          if (triggerDate instanceof Date) {
            scheduledDate = triggerDate;
          } else if (typeof triggerDate === 'number') {
            scheduledDate = new Date(triggerDate);
          } else if (typeof triggerDate === 'string') {
            scheduledDate = new Date(triggerDate);
          }
          
          if (scheduledDate && !isNaN(scheduledDate.getTime())) {

            const timeUntil = scheduledDate.getTime() - now.getTime();
            const hoursUntil = timeUntil / 1000 / 60 / 60;

            
            if (timeUntil < 0) {
            } else {
            }
          } else {
            ("   - Raw trigger value:", triggerDate);
          }
        } catch (err) {
        }
      }
      
      if (notification.identifier && notification.identifier.startsWith('mealReminder_')) {
        if (user && notification.identifier.includes(user.uid)) {
        }
      }
    });
    

  } catch (error) {
  }
}