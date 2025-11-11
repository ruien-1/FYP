// TimerContext.js
import React, { createContext, useState, useEffect, useRef } from "react";
export const TimerContext = createContext();
import { scheduleNotification, cancelFastingNotification, cancelAllFastingNotifications} from "./notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const TIMER_STORAGE_KEY = "fasting_timer_data";

export const TimerProvider = ({ children }) => {
  const [expiryDate, setExpiryDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [activeFastingHours, setActiveFastingHours] = useState(null);
  const [customPlans, setCustomPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [lastRemaining, setLastRemaining] = useState(null);
  const [timeUnits, setTimeUnits] = useState({
    years: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [currentUserId, setCurrentUserId] = useState(null);
  const previousUserIdRef = useRef(null);
  const notificationIdRef = useRef(null);
  const lastScheduledExpiryRef = useRef(null);
  const isLoadingTimerRef = useRef(false);
  const isInitialMountRef = useRef(true);
  
  // Refs to track current timer state for use in auth effect
  const activePlanRef = useRef(null);
  const startDateRef = useRef(null);
  const expiryDateRef = useRef(null);
  const activeFastingHoursRef = useRef(null);

  const intervalRef = useRef(null);

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Save timer state to AsyncStorage
  const saveTimerState = async (userId) => {
    if (!userId) return;
    
    try {
      // Only save if timer is actually active
      if (activePlan && startDate && expiryDate && activeFastingHours) {
        const timerData = {
          startDate: startDate?.toISOString(),
          expiryDate: expiryDate?.toISOString(),
          activeFastingHours,
          activePlan,
          userId,
        };
        const key = `${TIMER_STORAGE_KEY}_${userId}`;
        await AsyncStorage.setItem(key, JSON.stringify(timerData));
      }
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  };

  // Load timer state from AsyncStorage
  const loadTimerState = async (userId, skipIfActive = false) => {
    if (!userId) {
      // Don't clear timer if no user - just don't display it
      // Timer continues running in background
      return;
    }

    // Prevent loading if we're already loading or if timer is already active (unless forced)
    if (isLoadingTimerRef.current) {
      return;
    }

    // Skip loading if timer is already active and we don't want to override it
    // BUT: Always load if this is the initial mount (user just logged in or app just started)
    // because we need to restore the timer even if there's stale state
    if (skipIfActive && activePlan && startDate && expiryDate && activeFastingHours && !isInitialMountRef.current) {
      return;
    }

    isLoadingTimerRef.current = true;

    try {
      const key = `${TIMER_STORAGE_KEY}_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const timerData = JSON.parse(stored);
        
        // Verify this timer belongs to the current user
        if (timerData.userId === userId) {
          const loadedStartDate = timerData.startDate ? new Date(timerData.startDate) : null;
          const loadedExpiryDate = timerData.expiryDate ? new Date(timerData.expiryDate) : null;
          
          // Check if timer has expired
          if (loadedExpiryDate && new Date() < loadedExpiryDate) {
            // Always restore the timer state when loading from storage
            // Set all state values together to ensure timer effect triggers
            console.log("🔄 Restoring timer state from storage:", {
              startDate: loadedStartDate?.toISOString(),
              expiryDate: loadedExpiryDate?.toISOString(),
              fastingHours: timerData.activeFastingHours,
              hasActivePlan: !!timerData.activePlan,
            });
            
            // Set all state in the correct order
            // Set expiryDate first, then the others
            setExpiryDate(loadedExpiryDate);
            setStartDate(loadedStartDate);
            setActiveFastingHours(timerData.activeFastingHours);
            // Set activePlan last to ensure all dependencies are ready
            setActivePlan(timerData.activePlan);
            
            // Reschedule notification for restored timer (only if not already scheduled)
            const delayMs = loadedExpiryDate.getTime() - Date.now();
            const expiryTime = loadedExpiryDate.getTime();
            if (delayMs > 0 && lastScheduledExpiryRef.current !== expiryTime) {
              // Cancel all existing notifications first to prevent duplicates
              await cancelAllFastingNotifications();
              
              const notificationId = `fastingTimer_${userId}_${Date.now()}`;
              notificationIdRef.current = notificationId;
              lastScheduledExpiryRef.current = expiryTime;
              scheduleNotification({
                title: "🎉 Fasting Complete!",
                body: "Your fasting window just ended. Time to eat!",
                delayMs,
                identifier: notificationId,
              });
            }
          } else {
            // Timer expired, clear it
            await clearTimerState(userId);
            if (activePlan || startDate || expiryDate || activeFastingHours) {
              setActivePlan(null);
              setExpiryDate(null);
              setStartDate(null);
              setActiveFastingHours(null);
            }
          }
        } else {
          // Timer belongs to different user, clear it from storage but don't affect display
          await clearTimerState(userId);
        }
      } else {
        // No timer found for this user, only clear if there's an active timer
        if (activePlan || startDate || expiryDate || activeFastingHours) {
          setActivePlan(null);
          setExpiryDate(null);
          setStartDate(null);
          setActiveFastingHours(null);
        }
      }
    } catch (error) {
      console.error("Error loading timer state:", error);
    } finally {
      isLoadingTimerRef.current = false;
    }
  };

  // Clear timer state from AsyncStorage
  const clearTimerState = async (userId) => {
    if (!userId) return;
    
    try {
      const key = `${TIMER_STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error clearing timer state:", error);
    }
  };

const scheduleFasting = async (startTime, fastingHours, isCustom = false, planData = null) => {
  const userId = auth.currentUser?.uid;
  // Allow starting timer even if no user logged in (will save when user logs in)
  
  // Cancel ALL existing fasting timer notifications before scheduling new one
  // This prevents accumulation of notifications
  await cancelAllFastingNotifications();
  notificationIdRef.current = null;
  lastScheduledExpiryRef.current = null;
  
  setStartDate(startTime);
  setActiveFastingHours(fastingHours);
  
  // If planData is provided (from IFTimer), use it to preserve plan id and other properties
  // Otherwise, create a basic activePlan
  if (planData) {
    // For custom plans, preserve all properties including id, start time, etc.
    // For fixed plans, just preserve the structure
    // Preserve all properties from planData (including id for custom plans)
    // This ensures the toggle can recognize the active plan
    const newActivePlan = {
      ...planData, // This includes id, eating, and other plan properties
      fasting: fastingHours, // Ensure fasting hours matches what we're scheduling
      start: isCustom ? startTime : null, // Use the actual start time for the timer
      isCustom: isCustom, // Ensure isCustom flag is set correctly
    };
    setActivePlan(newActivePlan);
  } else {
    setActivePlan({
      fasting: fastingHours,
      start: isCustom ? startTime : null,
      isCustom,
    });
  }

  // Calculate expiry
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + fastingHours);
  setExpiryDate(endTime);
  setLastRemaining(null);

  // Timer state will be saved automatically by the useEffect when state updates
  // If user is logged in, it will save immediately. If not, it will save when user logs in.

  // 🟢 Schedule notification with unique identifier (only if not already scheduled for this expiry)
  const delayMs = endTime.getTime() - Date.now();
  if (delayMs > 0 && lastScheduledExpiryRef.current !== endTime.getTime()) {
    const notificationId = `fastingTimer_${userId || 'anonymous'}_${Date.now()}`;
    notificationIdRef.current = notificationId;
    lastScheduledExpiryRef.current = endTime.getTime();
    scheduleNotification({
      title: "🎉 Fasting Complete!",
      body: "Your fasting window just ended. Time to eat!",
      delayMs,
      identifier: notificationId,
    });
  }
};



  // Stop fasting & freeze last remaining time
  const stopFasting = async () => {
    const userId = auth.currentUser?.uid;
    
    // Cancel notification
    if (notificationIdRef.current) {
      cancelFastingNotification(notificationIdRef.current);
      notificationIdRef.current = null;
      lastScheduledExpiryRef.current = null;
    }
    
    if (expiryDate && startDate) {
      const now = new Date();
      const endTime = new Date(expiryDate);
      const remaining = endTime.getTime() - now.getTime();
      setLastRemaining(remaining > 0 ? remaining : 0);
    }
    setActivePlan(null);
    setExpiryDate(null);
    setStartDate(null);
    setActiveFastingHours(null);
    
    // Clear timer state from storage
    if (userId) {
      await clearTimerState(userId);
    }
  };

  const calculateTimeUnits = (timeDifference) => {
    const totalSeconds = Math.max(0, Math.ceil(timeDifference / 1000));

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setTimeUnits({
      years: 0,
      days: 0,
      hours,
      minutes,
      seconds,
    });
  };

  const updateTimer = async () => {
    if (!activePlan || !startDate || !activeFastingHours) {
      return;
    }

    const now = new Date();

    // Calculate the end time based on start date and fasting hours
    const calculatedEndTime = new Date(startDate);
    calculatedEndTime.setHours(calculatedEndTime.getHours() + activeFastingHours);

    // Use expiryDate if it exists and is valid, otherwise use calculated end time
    // This handles both fresh timers and restored timers from storage
    const effectiveEndTime = expiryDate && expiryDate.getTime() > now.getTime() 
      ? expiryDate 
      : calculatedEndTime;

    // Update expiryDate if it doesn't exist or is significantly different
    if (!expiryDate || Math.abs(expiryDate.getTime() - calculatedEndTime.getTime()) > 60000) {
      setExpiryDate(calculatedEndTime);
    }

    // Check if timer hasn't started yet (for future start times)
    if (now < startDate) {
      // Timer hasn't started yet - calculate time until start
      const timeToStart = startDate.getTime() - now.getTime();
      calculateTimeUnits(timeToStart);
      return;
    }

    // Calculate time remaining until end time
    const timeDifference = effectiveEndTime.getTime() - now.getTime();

    if (timeDifference <= 0) {
      // Timer expired - clear state and storage
      const userId = auth.currentUser?.uid;
      setActivePlan(null);
      setExpiryDate(null);
      setStartDate(null);
      setActiveFastingHours(null);
      if (userId) {
        await clearTimerState(userId);
      }
      return;
    }

    // Update the displayed time
    calculateTimeUnits(timeDifference);
  };

  // Listen to auth state changes to detect logout/account switch
  // This should ONLY run when auth state changes, not when timer state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const newUserId = user?.uid || null;
      const previousUserId = previousUserIdRef.current;
      
      // Only process if user actually changed
      if (previousUserId === newUserId && !isInitialMountRef.current) {
        return;
      }
      
      // Clean up all old fasting timer notifications on first mount or user login
      // This prevents accumulation of notifications
      // NOTE: Emergency cleanup is now handled in App.js, so we only do regular cleanup here
      if (!isInitialMountRef.current && (!previousUserId && newUserId)) {
        // Only cleanup fasting notifications on user login (not on initial mount)
        await cancelAllFastingNotifications();
      }
      
      isInitialMountRef.current = false;
      
      // If user changed (logout or account switch), save the previous user's timer first
      if (previousUserId && previousUserId !== newUserId) {
        // Get current timer state from refs (always current values)
        const currentState = {
          activePlan: activePlanRef.current,
          startDate: startDateRef.current,
          expiryDate: expiryDateRef.current,
          activeFastingHours: activeFastingHoursRef.current,
        };
        
        // Save the current timer state for the previous user before switching
        // This ensures the timer continues running for that user even after logout/switch
        if (currentState.activePlan && currentState.startDate && currentState.expiryDate && currentState.activeFastingHours) {
          const timerData = {
            startDate: currentState.startDate?.toISOString(),
            expiryDate: currentState.expiryDate?.toISOString(),
            activeFastingHours: currentState.activeFastingHours,
            activePlan: currentState.activePlan,
            userId: previousUserId,
          };
          const key = `${TIMER_STORAGE_KEY}_${previousUserId}`;
          await AsyncStorage.setItem(key, JSON.stringify(timerData));
        }
        // Clear the display temporarily while we switch users
        // The timer continues running in storage for the previous user
        setActivePlan(null);
        setExpiryDate(null);
        setStartDate(null);
        setActiveFastingHours(null);
        setTimeUnits({ years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        notificationIdRef.current = null;
        lastScheduledExpiryRef.current = null;
      }
      
      // Update current user ID and ref
      previousUserIdRef.current = newUserId;
      setCurrentUserId(newUserId);
      
      // Load timer state for new user (if logged in)
      // Timer continues running even when logged out, we just don't display it
      // On initial mount or when user logs in, always load timer state (don't skip)
      if (newUserId) {
        // Always load timer state on initial mount or login to restore timer
        // Pass false so it always loads (skipIfActive is checked inside loadTimerState)
        await loadTimerState(newUserId, false);
      }
      // If no user logged in, timer state is preserved but not displayed
      // It will be restored when user logs back in
    });

    return () => unsubscribe();
  }, []); // Empty dependency array - only run on mount and when auth state changes

  // Update refs whenever timer state changes
  useEffect(() => {
    activePlanRef.current = activePlan;
    startDateRef.current = startDate;
    expiryDateRef.current = expiryDate;
    activeFastingHoursRef.current = activeFastingHours;
  }, [activePlan, startDate, expiryDate, activeFastingHours]);

  // Save timer state whenever it changes (if user is logged in)
  // Timer continues running even when logged out - it will be saved when user logs in
  useEffect(() => {
    if (currentUserId) {
      if (activePlan && startDate && expiryDate && activeFastingHours) {
        saveTimerState(currentUserId);
      } else if (!activePlan && !startDate && !expiryDate && !activeFastingHours) {
        // Timer cleared - also clear from storage
        clearTimerState(currentUserId);
      }
    }
    // If no user logged in but timer is active, it will be saved when user logs in
  }, [activePlan, startDate, expiryDate, activeFastingHours, currentUserId]);

  // Timer update effect - starts the timer interval when timer state is active
  useEffect(() => {
    clearTimers();

    // Check if we have all required state to run the timer
    // Note: expiryDate is optional - it will be calculated if not present
    const hasRequiredState = activePlan && startDate && activeFastingHours;
    
    if (hasRequiredState) {
      // Immediately update timer to show current time
      // This will calculate expiryDate if needed
      updateTimer();
      
      // Start interval to update every second
      intervalRef.current = setInterval(() => {
        updateTimer();
      }, 1000);
    } else {
      // Clear timer display if not all required state is present
      setTimeUnits({ years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
    }

    return () => clearTimers();
  }, [activePlan, startDate, activeFastingHours, expiryDate]);

  return (
    <TimerContext.Provider
      value={{
        expiryDate,
        startDate,
        activeFastingHours,
        customPlans,
        activePlan,
        timeUnits,
        lastRemaining,
        scheduleFasting,
        stopFasting,
        setCustomPlans,
        setActivePlan,
        setActiveFastingHours,
        setStartDate,
        setExpiryDate,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};