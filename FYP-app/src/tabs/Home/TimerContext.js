// TimerContext.js
import React, { createContext, useState, useEffect, useRef } from "react";
export const TimerContext = createContext();
import { scheduleNotification} from "./notificationService";

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

  const intervalRef = useRef(null);

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

const scheduleFasting = (startTime, fastingHours, isCustom = false) => {
  setStartDate(startTime);
  setActiveFastingHours(fastingHours);
  setActivePlan({
    fasting: fastingHours,
    start: isCustom ? startTime : null,
    isCustom,
  });

  // Calculate expiry
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + fastingHours);
  setExpiryDate(endTime);
  setLastRemaining(null);


  // 🟢 Single notification (optional, maybe for debugging)
  const delayMs = endTime.getTime() - Date.now();
  scheduleNotification({
    title: "🎉 Fasting Complete!",
    body: "Your fasting window just ended. Time to eat!",
    delayMs,
    
  });
};



  // Stop fasting & freeze last remaining time
  const stopFasting = () => {
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

  const updateTimer = () => {
    if (!activePlan || !startDate || !activeFastingHours) return;

    const now = new Date();

    if (now < startDate) {
      setTimeUnits({ years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const endTime = new Date(startDate);
    endTime.setHours(endTime.getHours() + activeFastingHours);

    if (!expiryDate || expiryDate.getTime() !== endTime.getTime()) {
      setExpiryDate(endTime);
    }

    const timeDifference = endTime.getTime() - now.getTime();

    if (timeDifference <= 0) {
      setActivePlan(null);
      setExpiryDate(null);
      setStartDate(null);
      setActiveFastingHours(null);
      return;
    }

    calculateTimeUnits(timeDifference);
  };

  useEffect(() => {
    clearTimers();

    if (activePlan && startDate && activeFastingHours) {
      updateTimer();
      intervalRef.current = setInterval(() => {
        updateTimer();
      }, 1000);
    } else {
      setTimeUnits({ years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
    }

    return () => clearTimers();
  }, [activePlan, startDate, activeFastingHours]);

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
