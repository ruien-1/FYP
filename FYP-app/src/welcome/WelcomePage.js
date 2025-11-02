import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";

export default function WelcomePage({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome to <Text style={{ color: "#03f464ff" }}>NutriLog</Text>
      </Text>
      <Image
        source={{ uri: "https://placekitten.com/200/200" }}        
        style={styles.image}
      />
      <Text style={styles.subtitle}>
        Ready to lead a healthier lifestyle? Start today with us!
      </Text>

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
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c3e50",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 25,
    
    color: "#fff",
    textAlign: "center",
    marginVertical: 10,
  },
  buttonPrimary: {
    backgroundColor: "#90EE90",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#4682B4",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
});
