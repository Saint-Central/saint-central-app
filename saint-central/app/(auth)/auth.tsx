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
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";

const { width, height } = Dimensions.get("window");
const isIpad = width >= 768;

// API Configuration
const AUTH_API_BASE = "https://auth-worker.colinmcherney.workers.dev";
const CRUD_API_BASE = "https://crud-worker.colinmcherney.workers.dev";

// Types
interface User {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// --- Christian Cross Component ---
const ChristianCross = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    rotation.value = withSequence(
      withTiming(5, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(-5, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
    );
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
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

// --- Utility Functions ---

// Nonce generation for replay protection
const generateNonce = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

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

// --- API Helper Functions ---
const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem("access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({ error: "Network error" }));

  if (!response.ok) {
    if (data.code && data.error) {
      switch (data.code) {
        case "RATE_LIMITED":
          throw new Error("Too many attempts. Please wait a moment and try again.");
        case "WEAK_PASSWORD":
          throw new Error(
            "Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.",
          );
        case "INVALID_EMAIL":
          throw new Error("Please enter a valid email address.");
        case "AUTH_FAILED":
          throw new Error("Invalid email or password. Please check your credentials.");
        case "TOKEN_EXPIRED":
          throw new Error("Your session has expired. Please sign in again.");
        case "INVALID_RESET_TOKEN":
          throw new Error(
            "This password reset link is invalid or has expired. Please request a new one.",
          );
        case "REDIS_ERROR":
          throw new Error("Service temporarily unavailable. Please try again in a moment.");
        default:
          throw new Error(data.error);
      }
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error(`Network error (${response.status})`);
    }
  }

  return data;
};

const storeTokens = async (session: AuthSession) => {
  await AsyncStorage.multiSet([
    ["access_token", session.access_token],
    ["refresh_token", session.refresh_token],
    ["user", JSON.stringify(session.user)],
    ["expires_at", (Date.now() + session.expires_in * 1000).toString()],
  ]);
};

const clearTokens = async () => {
  await AsyncStorage.multiRemove([
    "access_token",
    "refresh_token",
    "user",
    "expires_at",
    "oauth_state",
  ]);
};

const checkSession = async (): Promise<User | null> => {
  try {
    const result = await apiCall(`${AUTH_API_BASE}/auth/session`);
    if (result.success && result.valid) {
      return {
        id: result.user_id,
        email: result.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch (error: any) {
    console.error("Session check failed:", error);

    if (error.message?.includes("expired") || error.message?.includes("invalid")) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        try {
          const result = await apiCall(`${AUTH_API_BASE}/auth/session`);
          if (result.success && result.valid) {
            return {
              id: result.user_id,
              email: result.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        } catch (retryError) {
          console.error("Session check retry failed:", retryError);
        }
      }
    }
  }
  return null;
};

const tryRefreshToken = async (): Promise<boolean> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refresh_token");
    if (!refreshToken) {
      return false;
    }

    const response = await apiCall(`${AUTH_API_BASE}/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({
        refresh_token: refreshToken,
        nonce: generateNonce(),
      }),
    });

    if (response.success && response.access_token) {
      await AsyncStorage.multiSet([
        ["access_token", response.access_token],
        ["refresh_token", response.refresh_token],
        ["expires_at", (Date.now() + response.expires_in * 1000).toString()],
      ]);
      return true;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
    await clearTokens();
  }
  return false;
};

// --- Animated Input Component ---
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

// --- Main Component ---
const AuthScreen: React.FC = () => {
  const router = useRouter();
  const { signIn, signUp, session, user, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<
    "landing" | "login" | "signup" | "forgotPassword" | "resetPassword"
  >("landing");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState<boolean>(true);
  const [secureNewPasswordEntry, setSecureNewPasswordEntry] = useState<boolean>(true);
  const [secureConfirmNewPasswordEntry, setSecureConfirmNewPasswordEntry] = useState<boolean>(true);

  // Animated values
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  useEffect(() => {
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 1000 }));
    contentTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 150 }));

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.startsWith("myapp://auth/callback")) {
        handleOAuthCallback(url);
      } else if (url.includes("reset-password") || url.includes("token=")) {
        handlePasswordResetLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (session && user && !authLoading) {
      checkUserDenomination(user.id);
    }
  }, [session, user, authLoading]);

  const checkUserDenomination = async (userId: string) => {
    try {
      const response = await apiCall(CRUD_API_BASE, {
        method: "POST",
        body: JSON.stringify({
          operation: "SELECT",
          table: "users",
          where: { id: userId },
          select: "denomination",
        }),
      });

      if (response.success && response.data.length > 0) {
        const userData = response.data[0];
        if (userData.denomination) {
          navigateToHome();
        } else {
          navigateToDenominationSelection();
        }
      } else {
        navigateToDenominationSelection();
      }
    } catch (error) {
      console.error("Error checking user denomination:", error);
      navigateToHome();
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentTranslateY.value }],
    };
  });

  const navigateToHome = () => {
    router.replace("/(tabs)/home");
  };

  const navigateToDenominationSelection = () => {
    router.replace("/selectDenomination");
  };

  const createUserInDatabase = async (
    userId: string,
    userEmail: string,
    firstName?: string,
    lastName?: string,
  ) => {
    try {
      await apiCall(CRUD_API_BASE, {
        method: "POST",
        body: JSON.stringify({
          operation: "INSERT",
          table: "users",
          data: {
            id: userId,
            email: userEmail,
            first_name: firstName || "",
            last_name: lastName || "",
          },
        }),
      });
    } catch (err) {
      console.error("Error inserting user:", err);
    }
  };

  const handlePasswordResetLink = async (url: string) => {
    try {
      const urlParams = new URL(url);
      const token = urlParams.searchParams.get("token");

      if (token) {
        setResetToken(token);
        setAuthMode("resetPassword");
        setMessage("Please enter your new password below.");
      } else {
        setError("Invalid password reset link. Please request a new one.");
      }
    } catch (error) {
      setError("Invalid password reset link. Please request a new one.");
    }
  };

  const handleOAuthCallback = async (url: string) => {
    try {
      setLoading(true);
      const urlParams = new URL(url);
      const code = urlParams.searchParams.get("code");
      const state = urlParams.searchParams.get("state");
      const error = urlParams.searchParams.get("error");
      const errorDescription = urlParams.searchParams.get("error_description");

      if (error) {
        throw new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`);
      }

      if (!code || !state) {
        throw new Error("Invalid OAuth callback parameters");
      }

      const storedState = await AsyncStorage.getItem("oauth_state");
      if (state !== storedState) {
        throw new Error("Invalid OAuth state parameter - possible CSRF attack");
      }

      await AsyncStorage.removeItem("oauth_state");

      const response = await apiCall(`${AUTH_API_BASE}/auth/callback?code=${code}&state=${state}`);

      if (response.access_token) {
        await storeTokens(response);

        try {
          await checkUserDenomination(response.user.id);
        } catch (error) {
          await createUserInDatabase(response.user.id, response.user.email || "");
          navigateToDenominationSelection();
        }
      } else {
        throw new Error("No access token received from OAuth callback");
      }
    } catch (e: any) {
      setError(e.message || "OAuth authentication failed. Please try again.");
    } finally {
      setLoading(false);
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

      if (!credential.identityToken) {
        throw new Error("Unable to authenticate with Apple");
      }

      const response = await apiCall(`${AUTH_API_BASE}/auth/apple-signin`, {
        method: "POST",
        body: JSON.stringify({
          identityToken: credential.identityToken,
          user: credential.user,
          fullName: credential.fullName,
          email: credential.email,
          nonce: generateNonce(),
        }),
      });

      if (response.success && response.access_token) {
        await storeTokens({
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          expires_in: response.expires_in,
          user: response.user,
        });

        try {
          await checkUserDenomination(response.user.id);
        } catch (error) {
          await createUserInDatabase(
            response.user.id,
            response.user.email || credential.email || "",
            credential.fullName?.givenName || "",
            credential.fullName?.familyName || "",
          );
          navigateToDenominationSelection();
        }
      } else {
        throw new Error("Apple Sign In failed. Please try again.");
      }
    } catch (e: any) {
      if (e.code === "ERR_CANCELED") {
        return;
      }
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

        const result = await signIn(email, password);
        if (result) {
          await checkUserDenomination(result.user.id);
        } else {
          throw new Error("Login failed. Please check your credentials.");
        }
      } else if (authMode === "signup") {
        if (!email || !password || !firstName || !lastName || !confirmPassword) {
          throw new Error("Please fill in all fields to sign up.");
        }
        if (password !== confirmPassword)
          throw new Error("Passwords don't match. Please check and try again.");

        const validationError = validatePassword(password);
        if (validationError) {
          throw new Error(validationError);
        }

        const result = await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
        });

        if (result) {
          await createUserInDatabase(result.user.id, email, firstName, lastName);
          setMessage("Welcome! You've signed up successfully.");
          await checkUserDenomination(result.user.id);
        } else {
          throw new Error("Registration failed. Please try again.");
        }
      } else if (authMode === "forgotPassword") {
        if (!email) {
          throw new Error("Please enter your email to reset your password.");
        }

        const response = await apiCall(`${AUTH_API_BASE}/auth/reset-password`, {
          method: "POST",
          body: JSON.stringify({
            email,
            nonce: `reset-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          }),
        });

        if (response.success) {
          setMessage("If the email exists in our system, you will receive a password reset link.");
          setTimeout(() => {
            setAuthMode("login");
            setMessage("");
          }, 3000);
        } else {
          throw new Error("Failed to send password reset email. Please try again.");
        }
      } else if (authMode === "resetPassword") {
        if (!resetToken || !newPassword || !confirmNewPassword) {
          throw new Error("Please fill in all fields to reset your password.");
        }

        if (newPassword !== confirmNewPassword) {
          throw new Error("Passwords don't match. Please check and try again.");
        }

        const validationError = validatePassword(newPassword);
        if (validationError) {
          throw new Error(validationError);
        }

        const response = await apiCall(`${AUTH_API_BASE}/auth/reset-password/confirm`, {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            password: newPassword,
            nonce: generateNonce(),
          }),
        });

        if (response.success) {
          await storeTokens(response);
          setMessage("Password has been reset successfully. You are now logged in.");
          await checkUserDenomination(response.user.id);
        } else {
          throw new Error("Failed to reset password. Please try again.");
        }
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
        authMode === "signup" && styles.signupInputContainer,
      ]}
    >
      {icon}
      <AnimatedInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
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
            color="rgba(255, 255, 255, 0.8)"
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const getAuthModeText = () => {
    switch (authMode) {
      case "landing":
        return {
          title: "Saint Central",
          subtitle: "",
          verse:
            '"Come to me, all you who are weary and burdened, and I will give you rest." - Matthew 11:28',
        };
      case "login":
        return {
          title: "Sign In",
          subtitle: "Welcome back to your spiritual journey",
          verse:
            '"Come to me, all you who are weary and burdened, and I will give you rest." - Matthew 11:28',
        };
      case "signup":
        return {
          title: "Join Our Community",
          subtitle: "",
          verse:
            '"Therefore, if anyone is in Christ, the new creation has come." - 2 Corinthians 5:17',
        };
      case "forgotPassword":
        return {
          title: "Restore Your Access",
          subtitle:
            "God's grace is sufficient. Let us help you restore your access to continue your journey.",
          verse: '"He restores my soul. He guides me along the right paths." - Psalm 23:3',
        };
      case "resetPassword":
        return {
          title: "New Beginning",
          subtitle: "Set your new password and continue your walk with faith.",
          verse:
            '"He gives strength to the weary and increases the power of the weak." - Isaiah 40:29',
        };
    }
  };

  const { title, subtitle, verse } = getAuthModeText();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <ImageBackground
          source={require("../../assets/images/background.png")}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />

          {/* Error Toast */}
          {error !== "" && (
            <Animated.View
              style={styles.toastContainer}
              entering={SlideInDown.springify().damping(12)}
              exiting={FadeOut}
            >
              <Feather name="alert-circle" size={18} color="#fff" />
              <Text style={styles.toastText}>{error}</Text>
            </Animated.View>
          )}

          <SafeAreaView style={styles.safeArea}>
            <Animated.View
              style={[styles.content, contentStyle, authMode === "signup" && styles.signupContent]}
            >
              {/* Christian Cross */}
              <View
                style={[
                  styles.crossContainer,
                  authMode === "signup" && styles.signupCrossContainer,
                ]}
              >
                <ChristianCross />
              </View>

              {/* Main Content */}
              <Text style={[styles.title, authMode === "signup" && styles.signupTitle]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, authMode === "signup" && styles.signupSubtitle]}>
                {subtitle}
              </Text>

              {/* Bible Verse - Only show for non-signup modes */}
              {authMode !== "signup" && authMode !== "landing" && (
                <Animated.View
                  style={styles.verseContainer}
                  entering={FadeIn.delay(600).duration(800)}
                >
                  <Text style={styles.verse}>{verse}</Text>
                </Animated.View>
              )}

              {/* Success Message */}
              {!error && message !== "" && (
                <Animated.View style={styles.messageContainer} entering={FadeIn.duration(400)}>
                  <Feather name="check-circle" size={18} color="#4ade80" />
                  <Text style={styles.message}>{message}</Text>
                </Animated.View>
              )}

              {/* Form - Only show when not in landing mode */}
              {authMode !== "landing" && (
                <View style={[styles.form, authMode === "signup" && styles.signupForm]}>
                  {(authMode === "login" ||
                    authMode === "signup" ||
                    authMode === "forgotPassword") &&
                    renderInput({
                      placeholder: "Email",
                      value: email,
                      setValue: setEmail,
                      keyboardType: "email-address",
                      icon: <Feather name="mail" size={20} color="rgba(255, 255, 255, 0.8)" />,
                      index: 0,
                    })}

                  {authMode === "resetPassword" && (
                    <>
                      {renderInput({
                        placeholder: "New Password",
                        value: newPassword,
                        setValue: setNewPassword,
                        secureEntry: secureNewPasswordEntry,
                        toggleSecure: () => setSecureNewPasswordEntry(!secureNewPasswordEntry),
                        icon: <Feather name="lock" size={20} color="rgba(255, 255, 255, 0.8)" />,
                        index: 0,
                      })}
                      {renderInput({
                        placeholder: "Confirm New Password",
                        value: confirmNewPassword,
                        setValue: setConfirmNewPassword,
                        secureEntry: secureConfirmNewPasswordEntry,
                        toggleSecure: () =>
                          setSecureConfirmNewPasswordEntry(!secureConfirmNewPasswordEntry),
                        icon: <Feather name="lock" size={20} color="rgba(255, 255, 255, 0.8)" />,
                        index: 1,
                      })}
                    </>
                  )}

                  {authMode === "signup" && (
                    <View style={styles.nameRow}>
                      {renderInput({
                        placeholder: "First Name",
                        value: firstName,
                        setValue: setFirstName,
                        icon: <Feather name="user" size={20} color="rgba(255, 255, 255, 0.8)" />,
                        index: 1,
                      })}
                      {renderInput({
                        placeholder: "Last Name",
                        value: lastName,
                        setValue: setLastName,
                        icon: <Ionicons name="person" size={20} color="rgba(255, 255, 255, 0.8)" />,
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
                      icon: <Feather name="lock" size={20} color="rgba(255, 255, 255, 0.8)" />,
                      index: authMode === "login" ? 1 : 3,
                    })}

                  {authMode === "signup" &&
                    renderInput({
                      placeholder: "Confirm Password",
                      value: confirmPassword,
                      setValue: setConfirmPassword,
                      secureEntry: secureConfirmTextEntry,
                      toggleSecure: () => setSecureConfirmTextEntry(!secureConfirmTextEntry),
                      icon: <Feather name="lock" size={20} color="rgba(255, 255, 255, 0.8)" />,
                      index: 4,
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
              )}

              {/* Main Action Button - Different for landing vs forms */}
              {authMode !== "landing" && (
                <TouchableOpacity
                  style={[styles.button, authMode === "signup" && styles.signupButton]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {authMode === "login"
                        ? "Sign in"
                        : authMode === "signup"
                          ? "Sign up"
                          : authMode === "forgotPassword"
                            ? "Reset Password"
                            : "Update Password"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Social Login - Only show for non-landing form modes */}
              {authMode !== "forgotPassword" &&
                authMode !== "resetPassword" &&
                authMode !== "landing" && (
                  <View
                    style={[
                      styles.socialSection,
                      authMode === "signup" && styles.signupSocialSection,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.socialButton}
                      onPress={handleAppleSignIn}
                      disabled={loading}
                    >
                      <FontAwesome5 name="apple" size={20} color="#FFFFFF" />
                      <Text style={styles.socialButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Mode Switch */}
              {authMode !== "resetPassword" && authMode !== "landing" && (
                <TouchableOpacity
                  style={styles.switchContainer}
                  onPress={() => {
                    if (authMode === "login") {
                      setAuthMode("signup");
                    } else {
                      setAuthMode("login");
                    }
                  }}
                >
                  <Text style={styles.switchText}>
                    {authMode === "login" ? "Need an account? " : "Already have an account? "}
                    <Text style={styles.switchTextBold}>
                      {authMode === "login" ? "Sign up" : "Sign in"}
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Bottom Buttons for Landing Page */}
            {authMode === "landing" && (
              <Animated.View style={styles.bottomButtonsContainer}>
                <TouchableOpacity style={styles.button} onPress={() => setAuthMode("login")}>
                  <Text style={styles.buttonText}>Sign in</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <FontAwesome5 name="apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchContainer}
                  onPress={() => setAuthMode("signup")}
                >
                  <Text style={styles.switchText}>
                    Need an account?
                    <Text style={styles.switchTextBold}> Sign up</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </SafeAreaView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 40,
    position: "relative",
  },
  signupContent: {
    paddingTop: 20,
  },
  landingContent: {
    justifyContent: "flex-start",
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 0,
    padding: 12,
    zIndex: 10,
  },
  crossContainer: {
    marginBottom: 24,
  },
  signupCrossContainer: {
    marginBottom: 16,
  },
  crossIconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  crossVertical: {
    position: "absolute",
    width: 6,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  crossHorizontal: {
    position: "absolute",
    width: 48,
    height: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 42,
    fontWeight: "300",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 3,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  signupTitle: {
    fontSize: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 20,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  signupSubtitle: {
    marginBottom: 12,
  },
  verseContainer: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  verse: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  message: {
    color: "#4ade80",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
    marginBottom: 24,
  },
  signupForm: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
  },
  signupInputContainer: {
    height: 52,
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
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
    marginBottom: 0,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "rgba(255, 255, 255, 0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.8)",
    backdropFilter: "blur(20px)",
  },
  signupButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  bottomButtonsContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 32,
    right: 32,
    gap: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  socialSection: {
    width: "100%",
    marginBottom: 24,
  },
  signupSocialSection: {
    marginBottom: 16,
  },
  socialButton: {
    width: "100%",
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "rgba(255, 255, 255, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backdropFilter: "blur(20px)",
  },
  socialButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  switchContainer: {
    marginTop: 16,
  },
  switchText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textAlign: "center",
  },
  switchTextBold: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    padding: 16,
    borderRadius: 12,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
});

export default AuthScreen;
