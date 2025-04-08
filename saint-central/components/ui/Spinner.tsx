import LottieView from "lottie-react-native";
import { View, StyleSheet } from "react-native";

export default function Spinner() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.lottieWrapper}>
        <LottieView
          source={require("../../assets/lottie/loading.json")}
          autoPlay
          loop
          style={styles.lottieAnimation}
          renderMode="HARDWARE"
          speed={0.8}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  lottieWrapper: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 120,
    height: 120,
  },
});
