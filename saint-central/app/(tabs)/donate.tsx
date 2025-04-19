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
import { LinearGradient } from "expo-linear-gradient";
import { useStripe } from "@stripe/stripe-react-native";
import theme from "../../theme";

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

        {/* Gradient Background */}
        <View style={styles.backgroundGradient}>
          <LinearGradient
            colors={theme.gradientWarm}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

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
                <ActivityIndicator color={theme.neutral900} />
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
    backgroundColor: theme.neutral900,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45, 36, 31, 0.65)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacingXL,
    transform: [{ translateY: -30 }],
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingVertical: theme.spacing2XL,
    zIndex: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: theme.fontRegular,
    color: theme.textWhite,
    textAlign: "center",
    marginBottom: theme.spacingS,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: theme.textWhite,
    textAlign: "center",
    marginBottom: theme.spacing2XL,
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacingL,
    backgroundColor: theme.overlayLight,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  error: {
    color: theme.error,
    marginLeft: theme.spacingS,
    fontSize: 14,
    fontWeight: theme.fontMedium,
  },
  message: {
    color: theme.success,
    marginLeft: theme.spacingS,
    fontSize: 14,
    fontWeight: theme.fontMedium,
  },
  form: {
    width: "100%",
    marginBottom: theme.spacingL,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: theme.radiusLarge,
    paddingHorizontal: theme.spacingM,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  input: {
    flex: 1,
    color: theme.textWhite,
    fontSize: 16,
    marginLeft: theme.spacingM,
    height: "100%",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: theme.radiusFull,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacingXL,
    backgroundColor: theme.accent4,
    ...theme.shadowMedium,
  },
  buttonText: {
    color: theme.neutral900,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  infoButton: {
    marginTop: theme.spacingL,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    borderRadius: theme.radiusFull,
    borderWidth: 1,
    borderColor: theme.accent4,
  },
  infoButtonText: {
    color: theme.accent4,
    fontSize: 14,
    fontWeight: theme.fontMedium,
  },
  safetyInfoContainer: {
    marginTop: theme.spacingL,
    padding: theme.spacingM,
    borderRadius: theme.radiusMedium,
    backgroundColor: theme.overlayLight,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  safetyInfoText: {
    color: theme.textWhite,
    fontSize: 14,
    textAlign: "center",
  },
});

export default DonateScreen;
