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
  TextInputProps,
  SafeAreaView,
} from "react-native";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import { LinearGradient } from "expo-linear-gradient";
import * as AppleAuthentication from "expo-apple-authentication";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { Video, ResizeMode } from "expo-av";
import Svg, { Rect } from "react-native-svg";

// Import video background file
const videoSource = require("../../assets/images/background.mp4");

const { width, height } = Dimensions.get("window");
const isIpad = width >= 768;

// --- SVG Cross Component ---
const CrossIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 64 64">
    <Rect x="28" y="4" width="8" height="56" fill="#FAC898" />
    <Rect x="4" y="28" width="56" height="8" fill="#FAC898" />
  </Svg>
);

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

      if (!credential.identityToken)
        throw new Error("Unable to authenticate with Apple");

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
            lastNameFromApple
          );
        }
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
          navigateToHome();
        }
      }
    );

    return () => {
      subscription.remove();
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Automatically clear error after 15 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
            throw new Error(
              "This email is already registered. Try signing in instead."
            );
          }

          // Check for weak password errors first
          if (lowerCaseError.includes("weak")) {
            throw new Error(
              "Password is known to be weak and easy to guess. Please choose a different password."
            );
          }

          // Check for data breach or exposed password keywords.
          if (
            lowerCaseError.includes("leak") ||
            lowerCaseError.includes("exposed")
          ) {
            throw new Error(
              "Password has been exposed in a data breach. Please choose a different password."
            );
          }

          // Otherwise, if the error mentions password requirements.
          if (lowerCaseError.includes("password")) {
            throw new Error(
              "Password must contain an uppercase letter, a lowercase letter, a digit, and a symbol."
            );
          }

          throw new Error(errMsg);
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
        placeholderTextColor="rgba(255, 255, 255, 0.6)"
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
            color="#FAC898"
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
        {/* Video background */}
        <Video
          source={videoSource}
          style={styles.background}
          rate={1.0}
          volume={0}
          isMuted
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
        />
        <View style={styles.overlay}>
          {/* Toast error message */}
          {error !== "" && (
            <View style={styles.toastContainer} pointerEvents="none">
              <Text style={styles.toastText}>{error}</Text>
            </View>
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
            <Animated.View
              style={[styles.content, isIpad && { maxWidth: 600 }]}
            >
              <View style={styles.crossContainer}>
                <CrossIcon />
              </View>
              <Text style={styles.title}>Saint Central</Text>
              <Text style={styles.subtitle}>
                {authMode === "login"
                  ? "Let's begin the journey to your spiritual life"
                  : authMode === "signup"
                  ? "Join today"
                  : "Reset your password to continue your journey"}
              </Text>
              {!error && message !== "" && (
                <View
                  style={[styles.messageContainer, styles.successContainer]}
                >
                  <Feather name="check-circle" size={18} color="#10b981" />
                  <Text style={styles.message}>{message}</Text>
                </View>
              )}
              <View style={styles.form}>
                {renderInput({
                  placeholder: "Email",
                  value: email,
                  setValue: setEmail,
                  keyboardType: "email-address",
                  icon: <Feather name="mail" size={20} color="#FAC898" />,
                })}
                {authMode === "signup" && (
                  <View style={styles.nameRow}>
                    {renderInput({
                      placeholder: "First Name",
                      value: firstName,
                      setValue: setFirstName,
                      icon: <Feather name="user" size={20} color="#FAC898" />,
                    })}
                    {renderInput({
                      placeholder: "Last Name",
                      value: lastName,
                      setValue: setLastName,
                      icon: (
                        <Ionicons name="person" size={20} color="#FAC898" />
                      ),
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
                    icon: <Feather name="lock" size={20} color="#FAC898" />,
                  })}
                {authMode === "signup" &&
                  renderInput({
                    placeholder: "Confirm Password",
                    value: confirmPassword,
                    setValue: setConfirmPassword,
                    secureEntry: secureConfirmTextEntry,
                    toggleSecure: () =>
                      setSecureConfirmTextEntry(!secureConfirmTextEntry),
                    icon: <Feather name="lock" size={20} color="#FAC898" />,
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
                {loading ? (
                  <ActivityIndicator color="#513C28" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>
                      {authMode === "login"
                        ? "START HERE"
                        : authMode === "signup"
                        ? "SIGN UP"
                        : "RESET PASSWORD"}
                    </Text>
                    <Feather name="arrow-right" size={16} color="#513C28" />
                  </View>
                )}
              </TouchableOpacity>
              {authMode !== "forgotPassword" && (
                <View style={styles.socialSection}>
                  <Text style={styles.orText}>Or continue with</Text>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  >
                    <FontAwesome5 name="apple" size={24} color="#FFFFFF" />
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
                    ? "Need an account? Sign up"
                    : "Already a member? Log in"}
                </Text>
              </TouchableOpacity>
              <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by faith</Text>
              </View>
            </Animated.View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    paddingTop: Platform.OS === "ios" ? 40 : 20,
  },
  crossContainer: { alignSelf: "center", marginBottom: 8 },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "300",
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
  error: { color: "#ef4444", marginLeft: 8, fontSize: 14, fontWeight: "500" },
  message: { color: "#10b981", marginLeft: 8, fontSize: 14, fontWeight: "500" },
  form: { width: "100%", gap: 16, marginBottom: 20 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
  },
  nameInput: { flex: 1, width: undefined },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
    height: "100%",
  },
  eyeIcon: { padding: 8 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  },
  forgotLink: { alignSelf: "flex-end", marginTop: 8, marginBottom: 0 },
  forgotText: { color: "#FFFFFF", fontSize: 14, opacity: 0.8 },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 30,
    backgroundColor: "#FAC898",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#513C28",
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
  orText: { color: "rgba(255, 255, 255, 0.6)", fontSize: 14 },
  socialButton: {
    width: "100%",
    height: 52,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 8,
  },
  socialButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "400" },
  switchText: { color: "#FFFFFF", fontSize: 14, marginTop: 24, opacity: 0.8 },
  footer: { marginTop: 32, marginBottom: 24 },
  footerText: { color: "rgba(255, 255, 255, 0.5)", fontSize: 12 },
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(239,68,68,0.9)",
    padding: 10,
    borderRadius: 8,
    zIndex: 100,
    alignItems: "center",
  },
  toastText: { color: "#fff", fontSize: 14 },
});

export default AuthScreen;
