import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Easing,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Rect, Defs, RadialGradient, Stop } from "react-native-svg";
import { useStripe } from "@stripe/stripe-react-native";

const { width, height } = Dimensions.get("window");

/* ---------------------------------------------------------------------------
   Animated Background Components (same as your AuthScreen)
--------------------------------------------------------------------------- */
interface CrossAnimation {
  rotate: Animated.Value;
  float: Animated.Value;
  opacity: Animated.Value;
  rotationDuration: number;
  direction: number;
  floatDistance: number;
  floatDuration: number;
  position: { top: number; left: number; size: number; zIndex: number };
}

interface ParticleAnimation {
  pos: Animated.Value;
  opacity: Animated.Value;
  duration: number;
  delay: number;
  path: number[];
  size: number;
}

const generateCrossAnimations = (count: number): CrossAnimation[] =>
  Array.from({ length: count }).map(() => ({
    rotate: new Animated.Value(0),
    float: new Animated.Value(0),
    opacity: new Animated.Value(0.05 + Math.random() * 0.2),
    rotationDuration: 15000 + Math.random() * 25000,
    direction: Math.random() > 0.5 ? 1 : -1,
    floatDistance: 30 + Math.random() * 50,
    floatDuration: 5000 + Math.random() * 3000,
    position: {
      top: Math.random() * height,
      left: Math.random() * width,
      size: 20 + Math.random() * 60,
      zIndex: Math.floor(Math.random() * 5) + 1,
    },
  }));

const generateParticleAnimations = (count: number): ParticleAnimation[] =>
  Array.from({ length: count }).map(() => {
    const size = Math.random() * 4 + 1;
    const initialLeft = Math.random() * width;
    return {
      pos: new Animated.Value(0),
      opacity: new Animated.Value(Math.random() * 0.5),
      duration: 20000 + Math.random() * 30000,
      delay: Math.random() * 10000,
      path: [
        initialLeft,
        initialLeft + Math.random() * 50 - 25,
        initialLeft + Math.random() * 100 - 50,
        initialLeft + Math.random() * 50 - 25,
        initialLeft + Math.random() * 100 - 50,
        initialLeft + Math.random() * 50 - 25,
      ],
      size,
    };
  });

const LightRaysBackground = () => {
  const rayAnim1 = useRef(new Animated.Value(0)).current;
  const rayAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rayAnim1, {
        toValue: 1,
        duration: 120000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.timing(rayAnim2, {
        toValue: 1,
        duration: 180000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate1 = rayAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const rotate2 = rayAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <View style={styles.raysContainer}>
      <Animated.View
        style={[styles.rayLayer, { transform: [{ rotate: rotate1 }] }]}
      >
        <Svg height="900" width="900" viewBox="0 0 900 900">
          <Defs>
            <RadialGradient
              id="grad"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#fcd34d" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 12 }).map((_, i) => (
            <Rect
              key={i}
              x="440"
              y="30"
              width="20"
              height="400"
              fill="url(#grad)"
              opacity={0.4}
              transform={`rotate(${i * 30} 450 450)`}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.rayLayer, { transform: [{ rotate: rotate2 }] }]}
      >
        <Svg height="800" width="800" viewBox="0 0 800 800">
          <Defs>
            <RadialGradient
              id="grad2"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#fcd34d" stopOpacity="0.07" />
              <Stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 8 }).map((_, i) => (
            <Rect
              key={i}
              x="390"
              y="20"
              width="20"
              height="350"
              fill="url(#grad2)"
              opacity={0.3}
              transform={`rotate(${i * 45} 400 400)`}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
};

const AnimatedCrosses = () => {
  const crossAnimations = useMemo(() => generateCrossAnimations(12), []);

  useEffect(() => {
    crossAnimations.forEach((crossAnim) => {
      Animated.loop(
        Animated.timing(crossAnim.rotate, {
          toValue: crossAnim.direction * 360,
          duration: crossAnim.rotationDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(crossAnim.float, {
            toValue: crossAnim.floatDistance,
            duration: crossAnim.floatDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(crossAnim.float, {
            toValue: 0,
            duration: crossAnim.floatDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(crossAnim.opacity, {
            toValue: 0.15 + Math.random() * 0.2,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(crossAnim.opacity, {
            toValue: 0.05 + Math.random() * 0.1,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [crossAnimations]);

  return (
    <View style={styles.crossesContainer}>
      {crossAnimations.map((crossAnim, index) => {
        const spin = crossAnim.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        });
        const { top, left, size, zIndex } = crossAnim.position;
        return (
          <Animated.View
            key={index}
            style={[
              styles.crossContainer,
              {
                top,
                left,
                width: size,
                height: size,
                zIndex,
                opacity: crossAnim.opacity,
                transform: [{ translateY: crossAnim.float }, { rotate: spin }],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 24 24">
              <Defs>
                <RadialGradient
                  id={`crossGrad${index}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <Stop offset="0%" stopColor="#fcd34d" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#fcd34d" stopOpacity="0.8" />
                </RadialGradient>
              </Defs>
              <Rect
                x="10.5"
                y="4"
                width="3"
                height="16"
                fill={`url(#crossGrad${index})`}
                rx="1"
              />
              <Rect
                x="4"
                y="10.5"
                width="16"
                height="3"
                fill={`url(#crossGrad${index})`}
                rx="1"
              />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
};

const ParticlesAnimation = () => {
  const particleAnimations = useMemo(() => generateParticleAnimations(40), []);

  useEffect(() => {
    particleAnimations.forEach((particleAnim) => {
      const startAnimation = () => {
        Animated.loop(
          Animated.timing(particleAnim.pos, {
            toValue: 1,
            duration: particleAnim.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(particleAnim.opacity, {
              toValue: 0.6,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(particleAnim.opacity, {
              toValue: 0.1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      setTimeout(startAnimation, particleAnim.delay);
    });
  }, [particleAnimations]);

  return (
    <View style={styles.particlesContainer}>
      {particleAnimations.map((particleAnim, index) => {
        const translateY = particleAnim.pos.interpolate({
          inputRange: [0, 1],
          outputRange: [height + particleAnim.size, -particleAnim.size * 2],
        });
        const translateX = particleAnim.pos.interpolate({
          inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
          outputRange: particleAnim.path,
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                width: particleAnim.size,
                height: particleAnim.size,
                borderRadius: particleAnim.size / 2,
                opacity: particleAnim.opacity,
                transform: [{ translateY }, { translateX }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

/* ---------------------------------------------------------------------------
   Donate Screen Component with Stripe Integration & Error Handling
--------------------------------------------------------------------------- */
const DonateScreen: React.FC = () => {
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDonate = async () => {
    Keyboard.dismiss();
    setError("");
    setMessage("");

    if (!donationAmount) {
      setError("Please enter a donation amount.");
      return;
    }

    // Validate amount is a positive number
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid donation amount greater than zero.");
      return;
    }

    try {
      setLoading(true);

      // Make the API request to your server
      let response;
      let responseData;

      try {
        response = await fetch("https://www.saint-central.com/api/donate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: donationAmount }),
        });

        // Get response as text first
        const responseText = await response.text();

        // Then try to parse as JSON
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error("Invalid JSON response:", responseText);
          throw new Error("Server returned an invalid response format");
        }
      } catch (error: any) {
        console.error("Network request failed:", error);
        throw new Error(`Connection error: ${error.message}`);
      }

      // Check for error in the response
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const { clientSecret } = responseData;
      if (!clientSecret) {
        throw new Error("No client secret received from server");
      }

      // Initialize the payment sheet
      const initResponse = await initPaymentSheet({
        merchantDisplayName: "Saint Central",
        returnURL: "saintcentral://stripe-redirect",
        paymentIntentClientSecret: clientSecret,
      });

      if (initResponse.error) {
        throw new Error(initResponse.error.message);
      }

      // Present the payment sheet
      const paymentResponse = await presentPaymentSheet();

      if (paymentResponse.error) {
        throw new Error(paymentResponse.error.message);
      }

      setMessage("Thank you for your donation!");
    } catch (err: any) {
      console.error("Donation error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient colors={["#0a090a", "#1a1917"]} style={styles.gradient}>
          <LightRaysBackground />
          <ParticlesAnimation />
          <AnimatedCrosses />
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Donate</Text>
            <Text style={styles.subtitle}>Support Our Mission</Text>

            {(error || message) && (
              <View style={styles.messageContainer}>
                {error ? (
                  <Text style={styles.error}>{error}</Text>
                ) : (
                  <Text style={styles.message}>{message}</Text>
                )}
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Donation Amount (in USD)"
                  placeholderTextColor="rgba(252, 211, 77, 0.5)"
                  value={donationAmount}
                  onChangeText={setDonationAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleDonate}
              disabled={loading}
            >
              <LinearGradient
                colors={["#eab308", "#fbbf24"]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Donate</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  raysContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  rayLayer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  crossesContainer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  crossContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  particlesContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  particle: { position: "absolute", backgroundColor: "#fcd34d" },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingVertical: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fcd34d",
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 24,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
  },
  error: { color: "#ef4444", marginLeft: 8, fontSize: 14, fontWeight: "500" },
  message: { color: "#10b981", marginLeft: 8, fontSize: 14, fontWeight: "500" },
  form: { width: "100%", gap: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.2)",
    width: "100%",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
    height: "100%",
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 24,
  },
  buttonGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

export default DonateScreen;
