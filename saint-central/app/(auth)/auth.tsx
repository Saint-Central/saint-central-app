import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  TextInputProps,
  SafeAreaView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import * as AppleAuthentication from "expo-apple-authentication";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  BounceIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const isIpad = width >= 768;

// --- SVG Cross Component ---
const CrossIcon = () => {
  // Using Reanimated for the cross icon animation
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSequence(
      withTiming(45, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(0, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.crossIconContainer, animatedStyle]}>
      <View style={styles.crossVertical} />
      <View style={styles.crossHorizontal} />
    </Animated.View>
  );
};

// --- Interfaces ---
interface CustomInputProps {
  placeholder: string;
  value: string;
  setValue: (text: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
  icon: React.ReactNode;
  secureEntry?: boolean;
  toggleSecure?: () => void;
  index: number;
}

// --- Password Validation Function ---
const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit.";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one symbol.";
  }
  return null;
};

// --- Animated Input Component ---
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

// --- Main Component ---
const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgotPassword">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);

  // Animated values
  const formOpacity = useSharedValue(0);
  const titlePosition = useSharedValue(-50);
  const buttonScale = useSharedValue(0.8);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Sequence of animations
    titlePosition.value = withSpring(0, {
      damping: 12,
      stiffness: 90,
    });

    formOpacity.value = withDelay(
      400,
      withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonOpacity.value = withDelay(
      600,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonScale.value = withDelay(
      600,
      withSpring(1, {
        damping: 14,
        stiffness: 100,
      }),
    );

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        if (currentSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          navigateToHome();
        }
      },
    );

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.startsWith("myapp://auth/callback")) {
        // Handle OAuth callback
      }
    });

    return () => {
      subscription.remove();
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Animate when changing auth mode
  useEffect(() => {
    // Reset animations
    formOpacity.value = 0;
    buttonScale.value = 0.8;
    buttonOpacity.value = 0;

    // Restart animations with delays
    formOpacity.value = withDelay(
      100,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonScale.value = withDelay(
      300,
      withSpring(1, {
        damping: 14,
        stiffness: 100,
      }),
    );
  }, [authMode]);

  // Animated styles
  const titleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: titlePosition.value }],
    };
  });

  const formStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Automatically clear error after 15 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const navigateToHome = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/(tabs)/home");
    }
  };

  const navigateToDenominationSelection = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/selectDenomination");
    }
  };

  const createUserInDatabase = async (
    userId: string,
    userEmail: string,
    firstName?: string,
    lastName?: string,
  ) => {
    try {
      const { error } = await supabase.from("users").insert([
        {
          id: userId,
          email: userEmail,
          first_name: firstName || "",
          last_name: lastName || "",
        },
      ]);
      if (error) throw error;
    } catch (err) {
      console.error("Error inserting user:", err);
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

      if (!credential.identityToken) throw new Error("Unable to authenticate with Apple");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) throw new Error("Apple Sign In failed. Please try again.");
      if (data?.session) {
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.session.user.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (!existingUser) {
          const firstNameFromApple = credential.fullName?.givenName ?? "";
          const lastNameFromApple = credential.fullName?.familyName ?? "";
          await createUserInDatabase(
            data.session.user.id,
            data.session.user.email || "",
            firstNameFromApple,
            lastNameFromApple,
          );
        }
        navigateToHome();
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong with Apple Sign In. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          throw new Error("Unable to sign in. Please check your connection and try again.");
        }
        if (data?.session) navigateToHome();
      } else if (authMode === "signup") {
        if (!email || !password || !firstName || !lastName || !confirmPassword) {
          throw new Error("Please fill in all fields to sign up.");
        }
        if (password !== confirmPassword)
          throw new Error("Passwords don't match. Please check and try again.");

        // Pre-validate the password on the client side.
        const validationError = validatePassword(password);
        if (validationError) {
          throw new Error(validationError);
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName } },
        });
        if (error) {
          console.log("Sign-up error:", error);
          // Try to get more detailed error info
          const errMsg = error.message;
          const lowerCaseError = errMsg.toLowerCase();

          if (lowerCaseError.includes("user already registered")) {
            throw new Error("This email is already registered. Try signing in instead.");
          }

          // Check for weak password errors first
          if (lowerCaseError.includes("weak")) {
            throw new Error(
              "Password is known to be weak and easy to guess. Please choose a different password.",
            );
          }

          // Check for data breach or exposed password keywords.
          if (lowerCaseError.includes("leak") || lowerCaseError.includes("exposed")) {
            throw new Error(
              "Password has been exposed in a data breach. Please choose a different password.",
            );
          }

          // Otherwise, if the error mentions password requirements.
          if (lowerCaseError.includes("password")) {
            throw new Error(
              "Password must contain an uppercase letter, a lowercase letter, a digit, and a symbol.",
            );
          }

          throw new Error(errMsg);
        }
        if (data?.user) {
          await createUserInDatabase(data.user.id, email, firstName, lastName);
          setMessage(
            data.session
              ? "Welcome! You've signed up successfully."
              : "Check your email to confirm your account.",
          );
          if (data.session) {
            // For signup flow, go directly to denomination selection
            if (authMode === "signup") {
              router.replace("/selectDenomination");
            } else {
              // For login flow, go to home as before
              navigateToHome();
            }
          }
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
            throw new Error("Too many reset requests. Please wait and try again later.");
          }
          throw new Error("Unable to send reset email. Please check your email and try again.");
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
    index,
  }: CustomInputProps) => (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400)}
      style={[
        styles.inputContainer,
        authMode === "signup" && placeholder.includes("Name") ? styles.nameInput : null,
      ]}
    >
      {icon}
      <AnimatedInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(100, 100, 100, 0.8)"
        value={value}
        onChangeText={setValue}
        keyboardType={keyboardType}
        secureTextEntry={secureEntry}
        autoCapitalize="none"
      />
      {toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon}>
          <Feather name={secureEntry ? "eye-off" : "eye"} size={20} color="#6366F1" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Modern Gradient Background */}
        <LinearGradient
          colors={["#F9FAFB", "#EEF2FF"]}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Decorative Elements */}
        <Animated.View
          style={styles.decorativeCircle1}
          entering={FadeIn.duration(800).delay(200)}
        />
        <Animated.View
          style={styles.decorativeCircle2}
          entering={FadeIn.duration(800).delay(350)}
        />
        <Animated.View
          style={styles.decorativeCircle3}
          entering={FadeIn.duration(800).delay(500)}
        />

        {/* Toast error message */}
        {error !== "" && (
          <Animated.View
            style={styles.toastContainer}
            entering={SlideInDown.springify().damping(12)}
            exiting={FadeOut}
            pointerEvents="none"
          >
            <Text style={styles.toastText}>{error}</Text>
          </Animated.View>
        )}

        <SafeAreaView
          style={[
            styles.safeArea,
            { alignItems: "center" },
            isIpad && {
              maxWidth: 600,
              alignSelf: "center",
              justifyContent: "center",
            },
          ]}
        >
          <View style={[styles.content, isIpad && { maxWidth: 600 }]}>
            <Animated.View style={[styles.crossContainer, titleStyle]}>
              <CrossIcon />
            </Animated.View>

            <Animated.Text style={[styles.title, titleStyle]} entering={BounceIn.duration(600)}>
              Saint Central
            </Animated.Text>

            <Animated.Text
              style={[styles.subtitle, titleStyle]}
              entering={BounceIn.duration(600).delay(200)}
            >
              {authMode === "login"
                ? "Let's begin the journey to your spiritual life"
                : authMode === "signup"
                  ? "Join today"
                  : "Reset your password to continue your journey"}
            </Animated.Text>

            {!error && message !== "" && (
              <Animated.View
                style={[styles.messageContainer, styles.successContainer]}
                entering={FadeIn.duration(400)}
              >
                <Feather name="check-circle" size={18} color="#10b981" />
                <Text style={styles.message}>{message}</Text>
              </Animated.View>
            )}

            <Animated.View style={[styles.form, formStyle]}>
              {renderInput({
                placeholder: "Email",
                value: email,
                setValue: setEmail,
                keyboardType: "email-address",
                icon: <Feather name="mail" size={20} color="#6366F1" />,
                index: 0,
              })}

              {authMode === "signup" && (
                <View style={styles.nameRow}>
                  {renderInput({
                    placeholder: "First Name",
                    value: firstName,
                    setValue: setFirstName,
                    icon: <Feather name="user" size={20} color="#6366F1" />,
                    index: 1,
                  })}
                  {renderInput({
                    placeholder: "Last Name",
                    value: lastName,
                    setValue: setLastName,
                    icon: <Ionicons name="person" size={20} color="#6366F1" />,
                    index: 2,
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
                  icon: <Feather name="lock" size={20} color="#6366F1" />,
                  index: authMode === "login" ? 1 : 3,
                })}

              {authMode === "signup" &&
                renderInput({
                  placeholder: "Confirm Password",
                  value: confirmPassword,
                  setValue: setConfirmPassword,
                  secureEntry: secureConfirmTextEntry,
                  toggleSecure: () => setSecureConfirmTextEntry(!secureConfirmTextEntry),
                  icon: <Feather name="lock" size={20} color="#6366F1" />,
                  index: 4,
                })}

              {authMode === "login" && (
                <Animated.View entering={FadeIn.delay(200).duration(400)}>
                  <TouchableOpacity
                    style={styles.forgotLink}
                    onPress={() => setAuthMode("forgotPassword")}
                  >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>

            <Animated.View style={[buttonStyle]}>
              <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>
                      {authMode === "login"
                        ? "START HERE"
                        : authMode === "signup"
                          ? "SIGN UP"
                          : "RESET PASSWORD"}
                    </Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {authMode !== "forgotPassword" && (
              <Animated.View
                style={styles.socialSection}
                entering={FadeIn.delay(700).duration(400)}
              >
                <Text style={styles.orText}>Or continue with</Text>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <FontAwesome5 name="apple" size={24} color="#333333" />
                  <Text style={styles.socialButtonText}>Sign in with Apple</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View entering={FadeIn.delay(800).duration(400)}>
              <TouchableOpacity
                onPress={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              >
                <Text style={styles.switchText}>
                  {authMode === "login" ? "Need an account? Sign up" : "Already a member? Log in"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={styles.footer} entering={FadeIn.delay(900).duration(400)}>
              <Text style={styles.footerText}>Powered by faith</Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    paddingTop: Platform.OS === "ios" ? 40 : 20,
  },
  crossContainer: {
    alignSelf: "center",
    marginBottom: 8,
  },
  crossIconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  crossVertical: {
    position: "absolute",
    width: 8,
    height: 48,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  crossHorizontal: {
    position: "absolute",
    width: 48,
    height: 8,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#4B5563",
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "400",
    opacity: 0.9,
    letterSpacing: 0.5,
    maxWidth: 280,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    width: "100%",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  successContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
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
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    width: "100%",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  nameInput: {
    flex: 1,
    width: undefined,
  },
  input: {
    flex: 1,
    color: "#374151",
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
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  socialSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  orText: {
    color: "#6B7280",
    fontSize: 14,
  },
  socialButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "500",
  },
  switchText: {
    color: "#6366F1",
    fontSize: 14,
    marginTop: 24,
    fontWeight: "500",
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(239,68,68,0.9)",
    padding: 12,
    borderRadius: 12,
    zIndex: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  // Decorative elements
  decorativeCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    bottom: 30,
    right: 30,
  },
});

export default AuthScreen;
