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
    trigger: { type: "date", date: triggerTime },
  });
}

export async function scheduleFastingEndNotifications(endTime) {
  const baseTime = endTime.getTime();
  const currentTime = Date.now();

  const reminders = [
    { offset: 2 * 60 * 1000, text: "⏳ Reminder: Fasting ended 2m ago!", label: "after 2 min" },
    { offset: 5 * 60 * 1000, text: "⏳ Reminder: Fasting ended 5m ago!", label: "after 5 min" },
    { offset: 15 * 60 * 1000, text: "⏳ Reminder: Fasting ended 15m ago!", label: "after 15 min" },
  ];

  for (let i = 0; i < reminders.length; i++) {
    const { offset, text, label } = reminders[i];
    const fireTime = new Date(baseTime + offset);
    const delayMs = fireTime.getTime() - currentTime;

    // ⛔️ Skip if the reminder time already passed
    if (delayMs <= 0) {
      console.log(`⚠️ Skipping reminder [${label}] because time already passed.`);
      continue;
    }

    console.log(`⏰ [${i + 1}/${reminders.length}] Scheduling reminder [${label}]:`);
    console.log(`   - Fire time: ${fireTime.toString()}`);
    console.log(`   - Delay: ${delayMs}ms (${Math.round(delayMs / 1000)}s)`);

    try {
      const content = {
        title: "Fasting Reminder",
        body: text,
        sound: "default",
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: fireTime, // ✅ Correct absolute scheduling
      });

      console.log(`✅ Scheduled reminder (${label}) with ID: ${notificationId}`);
    } catch (error) {
      console.error(`❌ Failed to schedule reminder (${label}):`, error);
    }
  }
}

// ❌ Cancel notifications for streaks
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}
