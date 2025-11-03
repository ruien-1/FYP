import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import {
  cancelAllNotifications,
  registerForPushNotificationsAsync,
} from "./src/tabs/Home/notificationService";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { LogBox } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
import ViewRestaurant from "./src/tabs/Recipe/ViewRestaurant";
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
import MealPlanDetails from "./src/tabs/Expert/MealPlanDetails";
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

// Sub-stacks
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

// ======================
// 📘 Regular User Stacks
// ======================
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
    </DiaryStackNav.Navigator>
  );
}

function RecipeStack() {
  return (
    <RecipeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <RecipeStackNav.Screen name="RecipeTab" component={RecipeTab} />
      <RecipeStackNav.Screen name="RecipeList" component={RecipeList} />
      <RecipeStackNav.Screen name="RecipeDetail" component={RecipeDetail} />
      <RecipeStackNav.Screen name="ViewRestaurant" component={ViewRestaurant} />
      <RecipeStackNav.Screen name="ViewMoreRecipes" component={ViewMoreRecipes} />
      <RecipeStackNav.Screen name="FavRecipes" component={FavRecipes} />
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
      <ExpertStackNav.Screen name="CoachesChatScreen" component={CoachesChatScreen} />
      <ExpertStackNav.Screen name="ChatList" component={ChatList} />
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
    </MoreStackNav.Navigator>
  );
}

// ✅ MainTabs for regular users with icons
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
            iconName = focused ? "book" : "book-outline";
          } else if (route.name === "Recipe") {
            iconName = focused ? "restaurant" : "restaurant-outline";
          } else if (route.name === "Expert") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "More") {
            iconName = focused ? "menu" : "menu-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2faaf7ff",
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

// ======================
// 🧑‍🏫 Coach-Specific Stacks
// ======================
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

// ✅ CoachTabs with icons
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
        tabBarActiveTintColor: "#2faaf7ff",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={CoachHomeStack} />
      <Tab.Screen name="Messages" component={CoachMessageStack} />
      <Tab.Screen name="Profile" component={CoachProfileStack} />
    </Tab.Navigator>
  );
}

// ======================
// 🥗 Nutritionist-Specific Stacks
// ======================
function NutritionistHomeStack() {
  return (
    <NutritionistHomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <NutritionistHomeStackNav.Screen name="NutritionistHomeTab" component={NutritionistHomeTab} />
      <NutritionistHomeStackNav.Screen name="CreateMealPlan" component={CreateMealPlan} />
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

// ✅ NutritionistTabs with icons
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
        tabBarActiveTintColor: "#2faaf7ff",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={NutritionistHomeStack} />
      <Tab.Screen name="Messages" component={NutritionistMessageStack} />
      <Tab.Screen name="Profile" component={NutritionistProfileStack} />
    </Tab.Navigator>
  );
}

// ======================
// 🚀 App Root
// ======================
export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();

    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      Toast.show({
        type: "success",
        text1: "⏳ Fasting Timer",
        text2: "Your fasting timer has ended!",
      });
      cancelAllNotifications();
    });

    return () => sub.remove();
  }, []);

  return (
    <TimerProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
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