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
  TextInputProps,
  Easing,
} from "react-native";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseClient";
import { LinearGradient } from "expo-linear-gradient";
import * as AppleAuthentication from "expo-apple-authentication";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import Svg, { Rect, Defs, RadialGradient, Stop } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// --- Interfaces ---
interface CustomInputProps {
  placeholder: string;
  value: string;
  setValue: (text: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
  icon: React.ReactNode;
  secureEntry?: boolean;
  toggleSecure?: () => void;
}

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

// --- Animation Generators ---
const generateCrossAnimations = (count: number): CrossAnimation[] => {
  return Array.from({ length: count }).map(() => ({
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
};

const generateParticleAnimations = (count: number): ParticleAnimation[] => {
  return Array.from({ length: count }).map(() => {
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
};

// --- Background Components ---
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

// --- Main Component ---
const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<
    "login" | "signup" | "forgotPassword"
  >("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] =
    useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const navigateToHome = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/(tabs)/home");
    }
  };

  const createUserInDatabase = async (
    userId: string,
    userEmail: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      const { error } = await supabase.from("users").upsert(
        [
          {
            id: userId,
            email: userEmail,
            first_name: firstName || "",
            last_name: lastName || "",
          },
        ],
        { onConflict: "id" }
      );
      if (error) throw error;
    } catch (err) {
      console.error("Error upserting user:", err);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      setError("Apple Sign In is only available on iOS devices.");
      return;
    }
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken)
        throw new Error("Unable to authenticate with Apple");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) throw new Error("Apple Sign In failed. Please try again.");
      if (data?.session) {
        const firstNameFromApple = credential.fullName?.givenName ?? "";
        const lastNameFromApple = credential.fullName?.familyName ?? "";

        await createUserInDatabase(
          data.session.user.id,
          data.session.user.email || "",
          firstNameFromApple,
          lastNameFromApple
        );
        navigateToHome();
      }
    } catch (e: any) {
      setError(
        e.message ||
          "Something went wrong with Apple Sign In. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.startsWith("myapp://auth/callback")) {
        // Handle OAuth callback
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        if (
          currentSession &&
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
        ) {
          await createUserInDatabase(
            currentSession.user.id,
            currentSession.user.email || "",
            currentSession.user.user_metadata?.first_name,
            currentSession.user.user_metadata?.last_name
          );
          navigateToHome();
        }
      }
    );

    return () => {
      subscription.remove();
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError("");
    setMessage("");

    try {
      setLoading(true);
      if (authMode === "login") {
        if (!email || !password) {
          throw new Error("Please enter both email and password.");
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Incorrect email or password. Please try again.");
          }
          throw new Error(
            "Unable to sign in. Please check your connection and try again."
          );
        }
        if (data?.session) navigateToHome();
      } else if (authMode === "signup") {
        if (
          !email ||
          !password ||
          !firstName ||
          !lastName ||
          !confirmPassword
        ) {
          throw new Error("Please fill in all fields to sign up.");
        }
        if (password !== confirmPassword)
          throw new Error("Passwords don't match. Please check and try again.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName } },
        });
        if (error) {
          if (error.message.includes("User already registered")) {
            throw new Error(
              "This email is already registered. Try signing in instead."
            );
          }
          throw new Error(
            "Unable to create your account. Please try again later."
          );
        }
        if (data?.user) {
          await createUserInDatabase(data.user.id, email, firstName, lastName);
          setMessage(
            data.session
              ? "Welcome! You've signed up successfully."
              : "Check your email to confirm your account."
          );
          if (data.session) navigateToHome();
        }
      } else {
        if (!email) {
          throw new Error("Please enter your email to reset your password.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://www.saint-central.com/update-password",
        });
        if (error) {
          if (error.message.includes("rate limit")) {
            throw new Error(
              "Too many reset requests. Please wait and try again later."
            );
          }
          throw new Error(
            "Unable to send reset email. Please check your email and try again."
          );
        }
        setMessage("We've sent a password reset link to your email.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = ({
    placeholder,
    value,
    setValue,
    keyboardType = "default",
    icon,
    secureEntry,
    toggleSecure,
  }: CustomInputProps) => (
    <View
      style={[
        styles.inputContainer,
        authMode === "signup" && placeholder.includes("Name")
          ? styles.nameInput
          : null,
      ]}
    >
      {icon}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(252, 211, 77, 0.5)"
        value={value}
        onChangeText={setValue}
        keyboardType={keyboardType}
        secureTextEntry={secureEntry}
        autoCapitalize="none"
      />
      {toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon}>
          <Feather
            name={secureEntry ? "eye-off" : "eye"}
            size={20}
            color="#fcd34d"
          />
        </TouchableOpacity>
      )}
    </View>
  );

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
            <Text style={styles.title}>Saint Central</Text>
            <Text style={styles.subtitle}>
              {authMode === "login"
                ? "Welcome Back"
                : authMode === "signup"
                ? "Join Us"
                : "Reset Password"}
            </Text>

            {(error || message) && (
              <View style={styles.messageContainer}>
                {error ? (
                  <>
                    <Feather name="alert-circle" size={18} color="#ef4444" />
                    <Text style={styles.error}>{error}</Text>
                  </>
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#10b981" />
                    <Text style={styles.message}>{message}</Text>
                  </>
                )}
              </View>
            )}

            <View style={styles.form}>
              {renderInput({
                placeholder: "Email",
                value: email,
                setValue: setEmail,
                keyboardType: "email-address",
                icon: <Feather name="mail" size={20} color="#fcd34d" />,
              })}

              {authMode === "signup" && (
                <View style={styles.nameRow}>
                  {renderInput({
                    placeholder: "First Name",
                    value: firstName,
                    setValue: setFirstName,
                    icon: <Feather name="user" size={20} color="#fcd34d" />,
                  })}
                  {renderInput({
                    placeholder: "Last Name",
                    value: lastName,
                    setValue: setLastName,
                    icon: <Ionicons name="person" size={20} color="#fcd34d" />,
                  })}
                </View>
              )}

              {(authMode === "login" || authMode === "signup") &&
                renderInput({
                  placeholder: "Password",
                  value: password,
                  setValue: setPassword,
                  secureEntry: secureTextEntry,
                  toggleSecure: () => setSecureTextEntry(!secureTextEntry),
                  icon: <Feather name="lock" size={20} color="#fcd34d" />,
                })}

              {authMode === "signup" &&
                renderInput({
                  placeholder: "Confirm Password",
                  value: confirmPassword,
                  setValue: setConfirmPassword,
                  secureEntry: secureConfirmTextEntry,
                  toggleSecure: () =>
                    setSecureConfirmTextEntry(!secureConfirmTextEntry),
                  icon: <Feather name="lock" size={20} color="#fcd34d" />,
                })}

              {authMode === "login" && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => setAuthMode("forgotPassword")}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={["#eab308", "#fbbf24"]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {authMode === "login"
                      ? "Sign In"
                      : authMode === "signup"
                      ? "Sign Up"
                      : "Reset"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {authMode !== "forgotPassword" && (
              <View style={styles.socialSection}>
                <Text style={styles.orText}>Or continue with</Text>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <FontAwesome5 name="apple" size={24} color="#fcd34d" />
                  <Text style={styles.socialButtonText}>
                    Sign in with Apple
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
            >
              <Text style={styles.switchText}>
                {authMode === "login"
                  ? "Need an account? Sign Up"
                  : "Already have an account? Sign In"}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Powered by faith</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  crossesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  crossContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    backgroundColor: "#fcd34d",
  },
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
    gap: 16,
  },
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
  nameInput: {
    flex: 1,
    width: undefined,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 0,
  },
  forgotText: {
    color: "#fcd34d",
    fontSize: 14,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 24,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  socialSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  orText: {
    color: "rgba(252, 211, 77, 0.5)",
    fontSize: 14,
  },
  socialButton: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.2)",
    gap: 8,
  },
  socialButtonText: {
    color: "#fcd34d",
    fontSize: 16,
    fontWeight: "500",
  },
  switchText: {
    color: "#fcd34d",
    fontSize: 14,
    marginTop: 24,
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
  footerText: {
    color: "rgba(252, 211, 77, 0.5)",
    fontSize: 12,
  },
});

export default AuthScreen;
