import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";

// Achievement definitions
export const ACHIEVEMENTS = {
  SEVEN_DAYS: {
    id: "seven_days_streak",
    name: "7 Days Streak",
    requirement: 7,
    description: "Maintain a 7-day streak by logging meals daily",
    type: "streak",
  },
  FIFTY_DAYS: {
    id: "fifty_days_streak",
    name: "50 Days Streak",
    requirement: 50,
    description: "Maintain a 50-day streak by logging meals daily",
    type: "streak",
  },
  HUNDRED_DAYS: {
    id: "hundred_days_streak",
    name: "100 Days Streak",
    requirement: 100,
    description: "Maintain a 100-day streak by logging meals daily",
    type: "streak",
  },
  WARM_UP_WARRIOR: {
    id: "warm_up_warrior",
    name: "Warm-Up Warrior",
    requirement: 500,
    description: "Accumulate 500 calories burned through activities",
    type: "calories",
  },
  CALORIE_CRUSADER: {
    id: "calorie_crusader",
    name: "Calorie Crusader",
    requirement: 5000,
    description: "Accumulate 5,000 calories burned through activities",
    type: "calories",
  },
  WORKOUT_MANIAC: {
    id: "workout_maniac",
    name: "Workout Maniac",
    requirement: 10000,
    description: "Accumulate 10,000 calories burned through activities",
    type: "calories",
  },
  SNACK_ROOKIE: {
    id: "snack_rookie",
    name: "Snack Rookie",
    requirement: 5000,
    description: "Accumulate more than 5,000 calories intake",
    type: "caloriesIntake",
  },
  CALORIE_COLLECTOR: {
    id: "calorie_collector",
    name: "Calorie Collector",
    requirement: 50000,
    description: "Accumulate more than 50,000 calories intake",
    type: "caloriesIntake",
  },
  GOURMET_GIANT: {
    id: "gourmet_giant",
    name: "Gourmet Giant",
    requirement: 100000,
    description: "Accumulate more than 100,000 calories intake",
    type: "caloriesIntake",
  },
};

// Check and unlock achievements based on current streak
export const checkAndUnlockAchievements = async (currentStreak) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "user", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const unlockedAchievements = userData.unlockedAchievements || [];
    const unlockedIds = unlockedAchievements.map((a) => a.id);

    const newlyUnlocked = [];

    // Check streak-based achievements
    Object.values(ACHIEVEMENTS).forEach((achievement) => {
      if (achievement.type === "streak") {
        // Check if achievement should be unlocked
        if (
          currentStreak >= achievement.requirement &&
          !unlockedIds.includes(achievement.id)
        ) {
          newlyUnlocked.push({
            id: achievement.id,
            name: achievement.name,
            unlockedAt: new Date(),
          });
        }
      }
    });

    // Update Firestore if there are new achievements
    if (newlyUnlocked.length > 0) {
      await updateDoc(userRef, {
        unlockedAchievements: arrayUnion(...newlyUnlocked),
      });
      console.log("✅ New achievements unlocked:", newlyUnlocked.map((a) => a.name));
      return newlyUnlocked;
    }

    return [];
  } catch (error) {
    console.error("Error checking achievements:", error);
    return [];
  }
};

// Check and unlock achievements based on total calories burned
export const checkAndUnlockCaloriesAchievements = async (totalCaloriesBurned) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "user", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const unlockedAchievements = userData.unlockedAchievements || [];
    const unlockedIds = unlockedAchievements.map((a) => a.id);

    const newlyUnlocked = [];

    // Check calories-based achievements
    Object.values(ACHIEVEMENTS).forEach((achievement) => {
      if (achievement.type === "calories") {
        // Check if achievement should be unlocked
        if (
          totalCaloriesBurned >= achievement.requirement &&
          !unlockedIds.includes(achievement.id)
        ) {
          newlyUnlocked.push({
            id: achievement.id,
            name: achievement.name,
            unlockedAt: new Date(),
          });
        }
      }
    });

    // Update Firestore if there are new achievements
    if (newlyUnlocked.length > 0) {
      await updateDoc(userRef, {
        unlockedAchievements: arrayUnion(...newlyUnlocked),
      });
      console.log("✅ New calories achievements unlocked:", newlyUnlocked.map((a) => a.name));
      return newlyUnlocked;
    }

    return [];
  } catch (error) {
    console.error("Error checking calories achievements:", error);
    return [];
  }
};

// Check and unlock achievements based on total calories intake
export const checkAndUnlockCaloriesIntakeAchievements = async (totalCaloriesIntake) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "user", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const unlockedAchievements = userData.unlockedAchievements || [];
    const unlockedIds = unlockedAchievements.map((a) => a.id);

    const newlyUnlocked = [];

    // Check calories intake-based achievements
    Object.values(ACHIEVEMENTS).forEach((achievement) => {
      if (achievement.type === "caloriesIntake") {
        // Check if achievement should be unlocked
        if (
          totalCaloriesIntake >= achievement.requirement &&
          !unlockedIds.includes(achievement.id)
        ) {
          newlyUnlocked.push({
            id: achievement.id,
            name: achievement.name,
            unlockedAt: new Date(),
          });
        }
      }
    });

    // Update Firestore if there are new achievements
    if (newlyUnlocked.length > 0) {
      await updateDoc(userRef, {
        unlockedAchievements: arrayUnion(...newlyUnlocked),
      });
      console.log("✅ New calories intake achievements unlocked:", newlyUnlocked.map((a) => a.name));
      return newlyUnlocked;
    }

    return [];
  } catch (error) {
    console.error("Error checking calories intake achievements:", error);
    return [];
  }
};

// Get all achievements with unlock status
export const getAllAchievementsWithStatus = (
  unlockedAchievements = [],
  currentStreak = 0,
  totalCaloriesBurned = 0,
  totalCaloriesIntake = 0
) => {
  return Object.values(ACHIEVEMENTS).map((achievement) => {
    const unlocked = unlockedAchievements.find((a) => a.id === achievement.id);
    let progress = 0;
    
    if (achievement.type === "streak") {
      progress = Math.min((currentStreak / achievement.requirement) * 100, 100);
    } else if (achievement.type === "calories") {
      progress = Math.min((totalCaloriesBurned / achievement.requirement) * 100, 100);
    } else if (achievement.type === "caloriesIntake") {
      progress = Math.min((totalCaloriesIntake / achievement.requirement) * 100, 100);
    }
    
    return {
      ...achievement,
      unlocked: !!unlocked,
      unlockedAt: unlocked?.unlockedAt || null,
      progress: progress,
    };
  });
};

// Get unlocked achievements sorted by date (newest first)
export const getUnlockedAchievementsSorted = (unlockedAchievements = []) => {
  return [...unlockedAchievements]
    .filter((a) => a.unlockedAt) // Only include unlocked
    .sort((a, b) => {
      // Sort by date (newest first)
      const dateA = a.unlockedAt?.toDate?.() || new Date(a.unlockedAt);
      const dateB = b.unlockedAt?.toDate?.() || new Date(b.unlockedAt);
      return dateB - dateA;
    });
};

