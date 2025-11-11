import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  cancelAllNotifications,
  registerForPushNotificationsAsync,
  initializeMealReminder,
} from "./src/tabs/Home/notificationService";
import { auth } from "./src/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { LogBox, ActivityIndicator, View, StyleSheet } from "react-native";
import { doc, getDoc } from "firebase/firestore";

// Home + other tabs
import HomeTab from "./src/tabs/Home/HomeTab";
import { TimerProvider } from "./src/tabs/Home/TimerContext";
import IFTimer from "./src/tabs/Home/IFTimer";

// Expert tab
import ExpertTab from "./src/tabs/Expert/ExpertTab";
import FindCoach from "./src/tabs/Expert/FindCoach";
import FindNutritionist from "./src/tabs/Expert/FindNutritionist";
import NutritionistProfile from "./src/tabs/Expert/NutritionistProfile";
import CoachProfile from "./src/tabs/Expert/CoachProfile";
import ViewRatingCoach from "./src/tabs/Expert/ViewRatingCoach";
import ViewRatingNutritionist from "./src/tabs/Expert/ViewRatingNutritionist";
import NutChatScreen from "./src/tabs/Expert/NutChatScreen";
import CoachesChatScreen from "./src/tabs/Expert/CoachesChatScreen";
import ChatList from "./src/tabs/Expert/ChatList";

// More tab
import MoreTab from "./src/tabs/More/MoreTab";
import ProfileTab from "./src/tabs/More/ProfileTab";
import UpgradePremium from "./src/tabs/More/UpgradePremium";
import CheckoutScreen from "./src/tabs/More/CheckoutScreen";
import EditProfile from "./src/tabs/More/EditProfile";
import BMICalculator from "./src/tabs/More/BMICalculator";
import ManageMembership from "./src/tabs/More/ManageMembership";
import SubmitReview from "./src/tabs/More/SubmitReview";
import ViewAllAchievements from "./src/tabs/More/ViewAllAchievements";

// Diary tab
import DiaryTab from "./src/tabs/Diary/DiaryTab";
import MealLog from "./src/tabs/Diary/MealLog";
import DeleteFoods from "./src/tabs/Diary/DeleteFoods";
import FoodRecognition from "./src/tabs/Diary/FoodRecognition";
import LogMealQR from "./src/tabs/Diary/LogMealQR";
import EditMeal from "./src/tabs/Diary/EditMeal";
import QRScanner from "./src/tabs/Diary/QRScanner";
import ManualAddFoodQR from "./src/tabs/Diary/ManualAddFoodQR";
import WaterPage from "./src/tabs/Diary/WaterPage";
import ActivityPage from "./src/tabs/Diary/ActivityPage";
import DeleteActivity from "./src/tabs/Diary/DeleteActivity";
import WeightPage from "./src/tabs/Diary/WeightPage";

// Recipe tab
import RecipeTab from "./src/tabs/Recipe/RecipeTab";
import RecipeList from "./src/tabs/Recipe/RecipeList";
import RecipeDetail from "./src/tabs/Recipe/RecipeDetail";
import ViewMoreRecipes from "./src/tabs/Recipe/ViewMoreRecipes";
import FavRecipes from "./src/tabs/Recipe/FavRecipes";

// Coach tabs
import CoachMessageTab from "./src/coachtabs/Message/CoachMessageTab";
import CoachChatScreen from "./src/coachtabs/Message/CoachChatScreen";
import CoachHomeTab from "./src/coachtabs/Home/CoachHomeTab";
import CoachPendingRequest from "./src/coachtabs/Home/CoachPendingRequest";
import CoachPendingAction from "./src/coachtabs/Home/CoachPendingAction";
import CoachProfileTab from "./src/coachtabs/Profile/CoachProfileTab"; 
import CoachUpcomingAppointment from "./src/coachtabs/Home/CoachUpcomingAppointment";
import CoachArticleManagement from "./src/coachtabs/Home/CoachArticleManagement";
import CreateWorkoutPlan from "./src/coachtabs/Home/CreateWorkoutPlan";

// Nutritionist tabs
import NutritionistMessageTab from "./src/nutritionisttabs/Message/NutritionistMessageTab";
import NutritionistChatScreen from "./src/nutritionisttabs/Message/NutritionistChatScreen";
import NutritionistHomeTab from "./src/nutritionisttabs/Home/NutritionistHomeTab";
import NutritionistPendingRequest from "./src/nutritionisttabs/Home/NutritionistPendingRequest";
import NutritionistPendingAction from "./src/nutritionisttabs/Home/NutritionistPendingAction";
import NutriProfileTab from "./src/nutritionisttabs/Profile/NutriProfileTab"; 
import NutriUpcomingAppointment from "./src/nutritionisttabs/Home/NutriUpcomingAppointment";
import CreateMealPlan from "./src/nutritionisttabs/Home/CreateMealPlan";
import NutritionistRecipeBrowser from "./src/nutritionisttabs/Home/NutritionistRecipeBrowser";
import MealPlanDetails from "./src/tabs/Expert/MealPlanDetails";
import WorkoutPlanDetails from "./src/tabs/Expert/WorkoutPlanDetails";
import NutriArticleManagement from "./src/nutritionisttabs/Home/NutriArticleManagement";


// welcome pages
import WelcomePage from "./src/welcome/WelcomePage";
import SignUpPage from "./src/welcome/SignUpPage";
import LoginPage from "./src/welcome/LoginPage";
import ForgotPasswordPage from "./src/welcome/ForgotPasswordPage";
import NutritionistSignup from "./src/welcome/NutritionistSignup";
import CoachSignup from "./src/welcome/CoachSignup";

import { db } from "./src/firebaseConfig";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DiaryStackNav = createNativeStackNavigator();
const RecipeStackNav = createNativeStackNavigator();
const ExpertStackNav = createNativeStackNavigator();
const MoreStackNav = createNativeStackNavigator();
const CoachHomeStackNav = createNativeStackNavigator();
const CoachMessageStackNav = createNativeStackNavigator();
const CoachProfileStackNav = createNativeStackNavigator(); 

const NutritionistHomeStackNav = createNativeStackNavigator();
const NutritionistMessageStackNav = createNativeStackNavigator();
const NutritionistProfileStackNav = createNativeStackNavigator(); 

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed",
]);


function DiaryStack() {
  return (
    <DiaryStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DiaryStackNav.Screen name="DiaryTab" component={DiaryTab} />
      <DiaryStackNav.Screen name="MealLog" component={MealLog} />
      <DiaryStackNav.Screen name="EditMeal" component={EditMeal} />
      <DiaryStackNav.Screen name="DeleteFoods" component={DeleteFoods} />
      <DiaryStackNav.Screen
        name="FoodRecognition"
        component={FoodRecognition}
        options={{ headerShown: true, title: "Scan Your Food" }}
      />
      <DiaryStackNav.Screen name="LogMealQR" component={LogMealQR} />
      <DiaryStackNav.Screen
        name="QRScanner"
        component={QRScanner}
        options={{ headerShown: true, title: "Scan Barcode" }}
      />
      <DiaryStackNav.Screen name="ManualAddFoodQR" component={ManualAddFoodQR} />
      <DiaryStackNav.Screen name="WaterPage" component={WaterPage} />
      <DiaryStackNav.Screen name="ActivityPage" component={ActivityPage} />
      <DiaryStackNav.Screen name="DeleteActivity" component={DeleteActivity} />
      <DiaryStackNav.Screen name="WeightPage" component={WeightPage} />
      <DiaryStackNav.Screen name="UpgradePremium" component={UpgradePremium} />
      <DiaryStackNav.Screen name="CheckoutScreen" component={CheckoutScreen} />
    </DiaryStackNav.Navigator>
  );
}

function RecipeStack() {
  return (
    <RecipeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <RecipeStackNav.Screen name="RecipeTab" component={RecipeTab} />
      <RecipeStackNav.Screen name="RecipeList" component={RecipeList} />
      <RecipeStackNav.Screen name="RecipeDetail" component={RecipeDetail} />
      <RecipeStackNav.Screen name="ViewMoreRecipes" component={ViewMoreRecipes} />
      <RecipeStackNav.Screen name="FavRecipes" component={FavRecipes} />
      <RecipeStackNav.Screen name="UpgradePremium" component={UpgradePremium} />
      <RecipeStackNav.Screen name="CheckoutScreen" component={CheckoutScreen} />
    </RecipeStackNav.Navigator>
  );
}

function ExpertStack() {
  return (
    <ExpertStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ExpertStackNav.Screen name="ExpertTab" component={ExpertTab} />
      <ExpertStackNav.Screen name="FindCoach" component={FindCoach} />
      <ExpertStackNav.Screen name="FindNutritionist" component={FindNutritionist} />
      <ExpertStackNav.Screen name="NutritionistProfile" component={NutritionistProfile} />
      <ExpertStackNav.Screen name="CoachProfile" component={CoachProfile} />
      <ExpertStackNav.Screen name="ViewRatingCoach" component={ViewRatingCoach} />
      <ExpertStackNav.Screen name="ViewRatingNutritionist" component={ViewRatingNutritionist} />
      <ExpertStackNav.Screen name="NutChatScreen" component={NutChatScreen} />
      <ExpertStackNav.Screen name="MealPlanDetails" component={MealPlanDetails} />
      <ExpertStackNav.Screen name="WorkoutPlanDetails" component={WorkoutPlanDetails} />
      <ExpertStackNav.Screen name="CoachesChatScreen" component={CoachesChatScreen} />
      <ExpertStackNav.Screen name="ChatList" component={ChatList} />
      <ExpertStackNav.Screen name="UpgradePremium" component={UpgradePremium} />
      <ExpertStackNav.Screen name="CheckoutScreen" component={CheckoutScreen} />
    </ExpertStackNav.Navigator>
  );
}

function MoreStack() {
  return (
    <MoreStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MoreStackNav.Screen name="MoreTab" component={MoreTab} />
      <MoreStackNav.Screen name="ProfileTab" component={ProfileTab} />
      <MoreStackNav.Screen name="UpgradePremium" component={UpgradePremium} />
      <MoreStackNav.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <MoreStackNav.Screen name="EditProfile" component={EditProfile} />
      <MoreStackNav.Screen name="BMICalculator" component={BMICalculator} />
      <MoreStackNav.Screen name="ManageMembership" component={ManageMembership} />
      <MoreStackNav.Screen name="SubmitReview" component={SubmitReview} />
      <MoreStackNav.Screen name="ViewAllAchievements" component={ViewAllAchievements} />
    </MoreStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Diary") {
            iconName = focused ? "journal" : "journal-outline";
          } else if (route.name === "Recipe") {
            iconName = focused ? "restaurant" : "restaurant-outline";
          } else if (route.name === "Expert") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "More") {
            iconName = focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen name="Diary" component={DiaryStack} />
      <Tab.Screen name="Recipe" component={RecipeStack} />
      <Tab.Screen name="Expert" component={ExpertStack} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}


function CoachHomeStack() {
  return (
    <CoachHomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CoachHomeStackNav.Screen name="CoachHomeTab" component={CoachHomeTab} />
      <CoachHomeStackNav.Screen name="CoachPendingRequest" component={CoachPendingRequest} />
      <CoachHomeStackNav.Screen name="CoachPendingAction" component={CoachPendingAction} />
      <CoachHomeStackNav.Screen name="CreateWorkoutPlan" component={CreateWorkoutPlan} />
      <CoachHomeStackNav.Screen name="CoachUpcomingAppointment" component={CoachUpcomingAppointment} />
      <CoachHomeStackNav.Screen name="CoachArticleManagement" component={CoachArticleManagement} />


    </CoachHomeStackNav.Navigator>
  );
}

function CoachMessageStack() {
  return (
    <CoachMessageStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CoachMessageStackNav.Screen name="CoachMessageTab" component={CoachMessageTab} />
      <CoachMessageStackNav.Screen name="CoachChatScreen" component={CoachChatScreen} />
    </CoachMessageStackNav.Navigator>
  );
}

function CoachProfileStack() {
  return (
    <CoachProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CoachProfileStackNav.Screen name="CoachProfileTab" component={CoachProfileTab} />
    </CoachProfileStackNav.Navigator>
  );
}


function CoachTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Messages") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={CoachHomeStack} />
      <Tab.Screen name="Messages" component={CoachMessageStack} />
      <Tab.Screen name="Profile" component={CoachProfileStack} />
    </Tab.Navigator>
  );
}


function NutritionistHomeStack() {
  return (
    <NutritionistHomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <NutritionistHomeStackNav.Screen name="NutritionistHomeTab" component={NutritionistHomeTab} />
      <NutritionistHomeStackNav.Screen name="CreateMealPlan" component={CreateMealPlan} />
      <NutritionistHomeStackNav.Screen name="NutritionistRecipeBrowser" component={NutritionistRecipeBrowser} />
      <NutritionistHomeStackNav.Screen name="RecipeDetail" component={RecipeDetail} />
      <NutritionistHomeStackNav.Screen name="NutriUpcomingAppointment" component={NutriUpcomingAppointment} />
      <NutritionistHomeStackNav.Screen name="NutritionistPendingRequest" component={NutritionistPendingRequest} />
      <NutritionistHomeStackNav.Screen name="NutritionistPendingAction" component={NutritionistPendingAction} />
      <CoachHomeStackNav.Screen name="NutriArticleManagement" component={NutriArticleManagement} />
      <NutritionistHomeStackNav.Screen name="MealPlanDetails" component={MealPlanDetails} />


    </NutritionistHomeStackNav.Navigator>
  );
}

function NutritionistMessageStack() {
  return (
    <NutritionistMessageStackNav.Navigator screenOptions={{ headerShown: false }}>
      <NutritionistMessageStackNav.Screen
        name="NutritionistMessageTab"
        component={NutritionistMessageTab}
      />
      <NutritionistMessageStackNav.Screen
        name="NutritionistChatScreen"
        component={NutritionistChatScreen}
      />
    </NutritionistMessageStackNav.Navigator>
  );
}

function NutritionistProfileStack() {
  return (
    <NutritionistProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <NutritionistProfileStackNav.Screen name="NutriProfileTab" component={NutriProfileTab} />
    </NutritionistProfileStackNav.Navigator>
  );
}

function NutritionistTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Messages") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={NutritionistHomeStack} />
      <Tab.Screen name="Messages" component={NutritionistMessageStack} />
      <Tab.Screen name="Profile" component={NutritionistProfileStack} />
    </Tab.Navigator>
  );
}


export default function App() {
  const navigationRef = React.useRef(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [initialRouteName, setInitialRouteName] = React.useState("Welcome");

  // Check authentication state on app startup
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        // User is logged in and email is verified - check their account type
        try {
          const nutritionistRef = doc(db, "nutritionist", user.uid);
          const coachRef = doc(db, "coach", user.uid);
          const userRef = doc(db, "user", user.uid);

          const [nutritionistSnap, coachSnap, userSnap] = await Promise.all([
            getDoc(nutritionistRef),
            getDoc(coachRef),
            getDoc(userRef)
          ]);

          // Determine user type and set initial route
          if (nutritionistSnap.exists()) {
            const nutritionistData = nutritionistSnap.data();
            if (nutritionistData.accountstatus === "approved") {
              setInitialRouteName("NutritionistTabs");
            } else {
              setInitialRouteName("Welcome");
            }
          } else if (coachSnap.exists()) {
            const coachData = coachSnap.data();
            if (coachData.accountstatus === "approved") {
              setInitialRouteName("CoachTabs");
            } else {
              setInitialRouteName("Welcome");
            }
          } else if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.accountstatus === "active") {
              setInitialRouteName("MainTabs");
            } else {
              setInitialRouteName("Welcome");
            }
          } else {
            setInitialRouteName("Welcome");
          }
        } catch (error) {
          setInitialRouteName("Welcome");
        }
      } else {
        setInitialRouteName("Welcome");
      }
      
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Navigate when route changes
  React.useEffect(() => {
    if (isAuthReady && navigationRef.current && initialRouteName !== "Welcome") {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: initialRouteName }],
      });
    }
  }, [isAuthReady, initialRouteName]);

  useEffect(() => {
    registerForPushNotificationsAsync();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const notification = response.notification;
      const identifier = notification.request.identifier || '';
      const data = notification.request.content.data || {};
      
      // Check if this is a meal reminder notification
      if (identifier.startsWith('mealReminder_') || data.type === 'mealReminder') {
        Toast.show({
          type: "info",
          text1: "🍽️ Meal Reminder",
          text2: "Don't forget to log a meal to keep your streak going!",
        });
      } else {
        // This is a fasting timer notification
        Toast.show({
          type: "success",
          text1: "⏳ Fasting Timer",
          text2: "Your fasting timer has ended!",
        });
        cancelAllNotifications();
      }
    });

    // Initialize meal reminder when auth state changes (user logs in)
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.emailVerified) {
          setTimeout(() => {
            initializeMealReminder();
          }, 1000);
        } else {
        }
      }
    });

    return () => {
      sub.remove();
      unsubscribeAuth();
    };
  }, []);

  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <TimerProvider>
      <NavigationContainer 
        ref={navigationRef}
        onReady={() => {
          if (initialRouteName !== "Welcome") {
            navigationRef.current?.reset({
              index: 0,
              routes: [{ name: initialRouteName }],
            });
          }
        }}
      >
        <Stack.Navigator 
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRouteName}
        >
          {/* Auth flow */}
          <Stack.Screen
            name="Welcome"
            component={WelcomePage}
            options={{ animationEnabled: false }}
          />
          <Stack.Screen name="SignUp" component={SignUpPage} />
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
          <Stack.Screen name="NutritionistSignup" component={NutritionistSignup} />
          <Stack.Screen name="CoachSignup" component={CoachSignup} />

          {/* Main App for Users */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Coach App */}
          <Stack.Screen name="CoachTabs" component={CoachTabs} />

          {/* Nutritionist App */}
          <Stack.Screen name="NutritionistTabs" component={NutritionistTabs} />

          {/* Global screens */}
          <Stack.Screen name="IFTimer" component={IFTimer} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </TimerProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F0FF",
  },
});