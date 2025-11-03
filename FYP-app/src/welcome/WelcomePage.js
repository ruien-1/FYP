import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
import { useState, useRef } from "react";

const { width } = Dimensions.get('window');

export default function WelcomePage({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const images = [
    {
      uri: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=500&fit=crop",
      text: "Ready to lead a healthier lifestyle? Start today with us!"
    },
    {
      uri: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=500&fit=crop",
      text: "Track your meals and nutrition with ease"
    },
    {
      uri: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=500&fit=crop",
      text: "Discover healthy recipes tailored for you"
    },
    {
      uri: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=500&fit=crop",
      text: "Monitor your progress and reach your goals"
    }
  ];

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (width - 40));
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Welcome to {"\n"}<Text style={styles.titleHighlight}>NutriLog</Text>
        </Text>
        
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.imageScrollView}
          contentContainerStyle={styles.imageScrollContent}
        >
          {images.map((item, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image
                source={{ uri: item.uri }}
                style={styles.image}
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.pagination}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeIndex === index && styles.paginationDotActive
              ]}
            />
          ))}
        </View>

        <Text style={styles.subtitle}>
          {images[activeIndex].text}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.buttonText}>Sign up for free</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.buttonTextPrimary}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c3e50",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 30,
  },
  titleHighlight: {
    color: "#03f464ff",
    fontSize: 32,
  },
  imageScrollView: {
    flexGrow: 0,
  },
  imageScrollContent: {
    alignItems: "center",
  },
  imageContainer: {
    width: width - 40,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: width - 80,
    height: 380,
    borderRadius: 20,
    resizeMode: "cover",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff50",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#03f464ff",
    width: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 20,
    minHeight: 50,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 20,
  },
  buttonSecondary: {
    backgroundColor: "#4682B4",
    padding: 16,
    borderRadius: 25,
    marginVertical: 8,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonPrimary: {
    backgroundColor: "#90EE90",
    padding: 16,
    borderRadius: 25,
    marginVertical: 8,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonTextPrimary: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});