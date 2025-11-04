import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import * as Device from "expo-device";

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
