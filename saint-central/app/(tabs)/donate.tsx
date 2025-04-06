import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useStripe } from "@stripe/stripe-react-native";

const { width } = Dimensions.get("window");

const DonateScreen: React.FC = () => {
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [showSafetyInfo, setShowSafetyInfo] = useState<boolean>(false);
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

    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid donation amount greater than zero.");
      return;
    }

    try {
      setLoading(true);

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

        const responseText = await response.text();

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

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const { clientSecret } = responseData;
      if (!clientSecret) {
        throw new Error("No client secret received from server");
      }

      const initResponse = await initPaymentSheet({
        merchantDisplayName: "Saint Central",
        returnURL: "saintcentral://stripe-redirect",
        paymentIntentClientSecret: clientSecret,
      });

      if (initResponse.error) {
        throw new Error(initResponse.error.message);
      }

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

  const toggleSafetyInfo = () => {
    setShowSafetyInfo((prev) => !prev);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {/* Video Background */}
        <Video
          source={require("../../assets/images/background.mp4")}
          rate={1.0}
          volume={1.0}
          isMuted
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          style={styles.backgroundVideo}
        />
        <View style={styles.overlay} />
        <View style={styles.centerContainer}>
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
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={donationAmount}
                  onChangeText={setDonationAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleDonate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Donate</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoButton} onPress={toggleSafetyInfo}>
              <Text style={styles.infoButtonText}>Payment Safety Info</Text>
            </TouchableOpacity>

            {showSafetyInfo && (
              <View style={styles.safetyInfoContainer}>
                <Text style={styles.safetyInfoText}>
                  We use Stripe to securely process your donation. Stripe uses advanced security
                  measures to encrypt your card details and protect your information. Your payment
                  information is never stored on our servers.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.80)", // Increased opacity for a darker background
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    transform: [{ translateY: -30 }],
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingVertical: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: "#FFF",
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.9,
    letterSpacing: 0.5,
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
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  error: {
    color: "#ef4444",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  message: {
    color: "#10b981",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
    height: "100%",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: "#FAC898",
  },
  buttonText: {
    color: "#513C28",
    fontSize: 16,
    fontWeight: "600",
  },
  infoButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#FAC898",
  },
  infoButtonText: {
    color: "#FAC898",
    fontSize: 14,
    fontWeight: "500",
  },
  safetyInfoContainer: {
    marginTop: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  safetyInfoText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
  },
});

export default DonateScreen;
