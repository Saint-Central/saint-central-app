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
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import theme from "../../theme";

const { width, height } = Dimensions.get("window");

// Animated floating particle component
const FloatingParticle = ({ delay = 0, index }: { delay?: number; index: number }) => {
  const translateY = useSharedValue(height);
  const translateX = useSharedValue(width * 0.1 + (index * width * 0.8) / 15);
  const opacity = useSharedValue(0);
  const size = 4 + (index % 3) * 2;

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-100, { duration: 15000 + index * 1000, easing: Easing.linear }),
          withTiming(height, { duration: 0 })
        ),
        -1
      )
    );
    
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 2000 }),
          withTiming(0.7, { duration: 11000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1
      )
    );
  }, [delay, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View style={[styles.particle, animatedStyle]}>
      <View style={[styles.particleInner, { 
        width: size,
        height: size,
      }]} />
    </Reanimated.View>
  );
};

// Animated gradient orb component
const GradientOrb = ({ color1, color2, size, x, y }: any) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View 
      style={[
        styles.gradientOrb,
        animatedStyle,
        {
          width: size,
          height: size,
          left: x,
          top: y,
        }
      ]}
    >
      <LinearGradient
        colors={[color1, color2]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Reanimated.View>
  );
};

const DonateScreen: React.FC = () => {
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [showSafetyInfo, setShowSafetyInfo] = useState<boolean>(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

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

        {/* Animated Gradient Background */}
        <View style={styles.backgroundGradient}>
          <LinearGradient
            colors={['#1a0f1f', '#2d1b3d', '#1f1229']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          {/* Animated gradient orbs */}
          <GradientOrb 
            color1="#f59e0b40"
            color2="#dc262640"
            size={300}
            x={-100}
            y={100}
          />
          <GradientOrb 
            color1="#8b5cf640"
            color2="#ec489940"
            size={250}
            x={width - 150}
            y={300}
          />
          <GradientOrb 
            color1="#f59e0b30"
            color2="#f87171130"
            size={200}
            x={width / 2 - 100}
            y={height - 200}
          />
          
          {/* Floating particles */}
          {Array.from({ length: 15 }).map((_, i) => (
            <FloatingParticle key={i} index={i} delay={i * 1000} />
          ))}
        </View>

        {/* Blur overlay for depth */}
        <BlurView intensity={20} style={styles.blurOverlay} tint="dark" />
        
        <View style={styles.centerContainer}>
          <Reanimated.View 
            entering={FadeInDown.duration(800).springify()}
            style={styles.content}
          >
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

            <Reanimated.View 
              entering={FadeInDown.delay(200).duration(600).springify()}
              style={styles.form}
            >
              <View style={styles.inputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={donationAmount}
                  onChangeText={setDonationAmount}
                  keyboardType="numeric"
                />
              </View>
            </Reanimated.View>

            <Reanimated.View 
              entering={FadeInDown.delay(400).duration(600).springify()}
            >
              <TouchableOpacity style={styles.button} onPress={handleDonate} disabled={loading}>
                <LinearGradient
                  colors={['#f59e0b', '#dc2626']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Donate Now</Text>
                )}
              </TouchableOpacity>
            </Reanimated.View>

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
          </Reanimated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
  },
  particleInner: {
    backgroundColor: '#f59e0b',
    borderRadius: 50,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  gradientOrb: {
    position: 'absolute',
    borderRadius: 1000,
    overflow: 'hidden',
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
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: "center",
    marginBottom: theme.spacingS,
    letterSpacing: 2,
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#f59e0b',
    textAlign: "center",
    marginBottom: theme.spacing2XL,
    opacity: 0.9,
    letterSpacing: 1,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacingL,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    width: "100%",
    backdropFilter: 'blur(10px)',
  },
  error: {
    color: '#ef4444',
    marginLeft: theme.spacingS,
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    color: '#10b981',
    marginLeft: theme.spacingS,
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    width: "100%",
    marginBottom: theme.spacingL,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    width: "100%",
    backdropFilter: 'blur(20px)',
  },
  dollarSign: {
    fontSize: 24,
    color: '#f59e0b',
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    height: "100%",
    fontWeight: '500',
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacingXL,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoButton: {
    marginTop: theme.spacingL,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    borderRadius: theme.radiusFull,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  infoButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  safetyInfoContainer: {
    marginTop: theme.spacingL,
    padding: theme.spacingM,
    borderRadius: theme.radiusMedium,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    width: "100%",
    backdropFilter: 'blur(10px)',
  },
  safetyInfoText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 20,
  },
});

export default DonateScreen;
