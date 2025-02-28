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

import {
  MaterialCommunityIcons,
  Feather,
  Ionicons,
  FontAwesome5,
  AntDesign,
} from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import Svg, { Rect, Defs, RadialGradient, Stop } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// --- Interfaces & Animation Generators ---
interface CrossAnimation {
  rotate: Animated.Value;
  float: Animated.Value;
  opacity: Animated.Value;
  rotationDuration: number;
  direction: number;
  floatDistance: number;
  floatDuration: number;
  position: {
    top: number;
    left: number;
    size: number;
    zIndex: number;
  };
}

interface ParticleAnimation {
  pos: Animated.Value;
  opacity: Animated.Value;
  duration: number;
  delay: number;
  path: number[];
  size: number;
}

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

// --- Visual Components ---
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

const PulsingLogo = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  return (
    <View style={styles.logoContainer}>
      <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <MaterialCommunityIcons name="church" size={50} color="#fcd34d" />
      </Animated.View>
    </View>
  );
};

// --- Auth Screen Component ---
interface CustomInputProps {
  placeholder: string;
  value: string;
  setValue: (text: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
  icon: React.ReactNode;
  secureEntry?: boolean;
  toggleSecure?: () => void;
  style?: any;
}

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
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Navigate to home if user is logged in
  const navigateToHome = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/(tabs)/home");
    }
  };

  // Function to create user in "users" table if not already present
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
      if (error) {
        console.error("Error upserting user into users table:", error);
      } else {
        console.log("User successfully upserted into users table.");
      }
    } catch (err) {
      console.error("Failed to create/update user in database:", err);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      setError("Apple Sign In is only available on iOS devices.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log("Apple credential:", credential); // For debugging

      if (!credential.identityToken) {
        throw new Error("No identity token returned from Apple");
      }
      const firstNameFromApple = credential.fullName?.givenName || "";
      const lastNameFromApple = credential.fullName?.familyName || "";

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) {
        console.error("Supabase sign in error:", error);
        setError(error.message);
      } else if (data?.session) {
        await createUserInDatabase(
          data.session.user.id,
          data.session.user.email || "",
          firstNameFromApple,
          lastNameFromApple
        );
        console.log("User session:", data.session);
        navigateToHome();
      }
    } catch (e: any) {
      console.error("Apple Sign In error:", e);
      setError("An error occurred during Apple Sign In.");
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password and back to login
  const handleForgotPassword = () => {
    setAuthMode("forgotPassword");
    setError("");
    setMessage("");
  };
  const backToLogin = () => {
    setAuthMode("login");
    setError("");
    setMessage("");
  };

  // URL redirect handler for OAuth callbacks
  const handleURLRedirect = async (event: { url: string }) => {
    if (event.url.startsWith("myapp://auth/callback")) {
      try {
        const urlObj = new URL(event.url);
        const code = urlObj.searchParams.get("code");
        if (!code) {
          throw new Error("No code found in URL");
        }
        const { data: authData } = await supabase.auth.exchangeCodeForSession(
          code
        );
        if (authData?.session) {
          setSession(authData.session);
          if (authData.user) {
            await createUserInDatabase(
              authData.user.id,
              authData.user.email || "",
              authData.user.user_metadata?.first_name,
              authData.user.user_metadata?.last_name
            );
          }
          navigateToHome();
        }
      } catch (err) {
        console.error("Error handling auth callback:", err);
        setError("Authentication failed. Please try again.");
      }
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    const subscription = Linking.addEventListener("url", handleURLRedirect);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        if (
          currentSession &&
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
        ) {
          if (currentSession.user) {
            await createUserInDatabase(
              currentSession.user.id,
              currentSession.user.email || "",
              currentSession.user.user_metadata?.first_name,
              currentSession.user.user_metadata?.last_name
            );
          }
          navigateToHome();
        } else if (event === "SIGNED_OUT") {
          setIsLoggedIn(false);
        }
      }
    );
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleURLRedirect({ url });
      }
    });
    return () => {
      subscription.remove();
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [authMode]);

  const handleSubmit = async (): Promise<void> => {
    Keyboard.dismiss();
    setError("");
    setMessage("");

    if (authMode === "login") {
      if (!email || !password) {
        setError("Please fill out all fields.");
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else if (data?.session) {
          setSession(data.session);
          setMessage("Logged in successfully!");
          navigateToHome();
        }
      } catch (err) {
        console.error("Login error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    } else if (authMode === "signup") {
      if (!email || !password || !firstName || !lastName || !confirmPassword) {
        setError("Please fill out all fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });
        if (error) {
          setError(error.message);
        } else if (data?.user) {
          if (data.session) {
            setSession(data.session);
            setMessage("Sign up successful!");
            await createUserInDatabase(
              data.user.id,
              email,
              firstName,
              lastName
            );
            navigateToHome();
          } else {
            setMessage("Please check your email for confirmation link.");
          }
        }
      } catch (err) {
        console.error("Signup error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    } else if (authMode === "forgotPassword") {
      if (!email) {
        setError("Please enter your email to reset your password.");
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: "https://www.saint-central.com/update-password",
          }
        );
        if (error) {
          setError(error.message);
        } else {
          setMessage("Password reset email sent. Please check your inbox.");
        }
      } catch (err) {
        console.error("Forgot Password error:", err);
        setError("An error occurred during password reset. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAuthMode = (): void => {
    setAuthMode(authMode === "login" ? "signup" : "login");
    setError("");
    setMessage("");
    if (authMode === "signup") {
      setFirstName("");
      setLastName("");
      setConfirmPassword("");
    }
  };

  const renderInput = ({
    placeholder,
    value,
    setValue,
    keyboardType = "default",
    icon,
    secureEntry = false,
    toggleSecure = undefined,
    style = {},
  }: CustomInputProps): React.ReactNode => {
    const inputId = placeholder.toLowerCase().replace(/\s/g, "");
    const isInputFocused = isFocused === inputId;
    return (
      <View
        style={[
          styles.inputContainer,
          isInputFocused && styles.inputContainerFocused,
          style,
        ]}
      >
        <View style={styles.iconContainer}>{icon}</View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          autoCapitalize="none"
          keyboardType={keyboardType}
          value={value}
          onChangeText={setValue}
          secureTextEntry={secureEntry}
          onFocus={() => setIsFocused(inputId)}
          onBlur={() => setIsFocused(null)}
        />
        {toggleSecure && (
          <TouchableOpacity style={styles.secureButton} onPress={toggleSecure}>
            <Feather
              name={secureEntry ? "eye-off" : "eye"}
              size={20}
              color="rgba(255, 255, 255, 0.7)"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const renderFormTitle = () => {
    if (authMode === "login") return "Sign in to your account";
    if (authMode === "signup") return "Create a new account";
    if (authMode === "forgotPassword") return "Reset your password";
    return "";
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <LinearGradient
          colors={["#0a090a", "#1a1917", "#262524", "#39383c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          <LightRaysBackground />
          <ParticlesAnimation />
          <AnimatedCrosses />
          <View style={styles.radialGlow} />
          <View style={styles.decorativeCircle} />
          <View style={styles.centralGlow} />
          <View style={styles.centerLogoWrapper}>
            <PulsingLogo />
          </View>
          <Animated.View
            style={[
              styles.formContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.formTitle}>Saint Central</Text>
              <Text style={styles.formSubtitle}>{renderFormTitle()}</Text>
            </View>
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
            <View style={styles.inputsContainer}>
              {renderInput({
                placeholder: "Email",
                value: email,
                setValue: setEmail,
                keyboardType: "email-address",
                icon: <Feather name="mail" size={20} color="#fcd34d" />,
                style: { marginBottom: 16 },
              })}
              {authMode === "signup" && (
                <View style={styles.nameInputsRow}>
                  {renderInput({
                    placeholder: "First Name",
                    value: firstName,
                    setValue: setFirstName,
                    icon: <Feather name="user" size={20} color="#fcd34d" />,
                    style: { width: "48%" },
                  })}
                  {renderInput({
                    placeholder: "Last Name",
                    value: lastName,
                    setValue: setLastName,
                    icon: <Ionicons name="person" size={20} color="#fcd34d" />,
                    style: { width: "48%" },
                  })}
                </View>
              )}
              {(authMode === "login" || authMode === "signup") &&
                renderInput({
                  placeholder: "Password",
                  value: password,
                  setValue: setPassword,
                  icon: <Feather name="lock" size={20} color="#fcd34d" />,
                  secureEntry: secureTextEntry,
                  toggleSecure: () => setSecureTextEntry(!secureTextEntry),
                  style: {
                    marginBottom: 16,
                    marginTop: authMode === "signup" ? 16 : 0,
                  },
                })}
              {authMode === "signup" &&
                renderInput({
                  placeholder: "Confirm Password",
                  value: confirmPassword,
                  setValue: setConfirmPassword,
                  icon: <Feather name="lock" size={20} color="#fcd34d" />,
                  secureEntry: secureConfirmTextEntry,
                  toggleSecure: () =>
                    setSecureConfirmTextEntry(!secureConfirmTextEntry),
                  style: { marginBottom: 16 },
                })}
            </View>
            {authMode === "login" && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            <Animated.View
              style={[
                styles.buttonContainer,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <LinearGradient
                  colors={["#eab308", "#facc15", "#fbbf24"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#1c1917" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>
                        {authMode === "login"
                          ? "Sign In"
                          : authMode === "signup"
                          ? "Sign Up"
                          : "Reset Password"}
                      </Text>
                      <AntDesign name="arrowright" size={20} color="#1c1917" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            {authMode === "forgotPassword" ? (
              <TouchableOpacity
                style={styles.toggleContainer}
                onPress={backToLogin}
              >
                <Text style={styles.toggleText}>Remember your password?</Text>
                <Text style={styles.toggleTextBold}> Back to Sign In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.toggleContainer}
                onPress={toggleAuthMode}
              >
                <Text style={styles.toggleText}>
                  {authMode === "login"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                </Text>
                <Text style={styles.toggleTextBold}>
                  {authMode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            )}
            {authMode === "login" && (
              <>
                <View style={styles.orContainer}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR CONTINUE WITH</Text>
                  <View style={styles.orLine} />
                </View>
                <View style={styles.socialContainer}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  >
                    <FontAwesome5 name="apple" size={20} color="#fcd34d" />
                  </TouchableOpacity>
                </View>
              </>
            )}
            <View style={styles.footer}>
              <MaterialCommunityIcons
                name="cross"
                size={18}
                color="rgba(255, 255, 255, 0.3)"
              />
              <Text style={styles.footerText}>Powered by faith</Text>
            </View>
          </Animated.View>
          {isLoggedIn && (
            <View style={styles.bottomNav}>
              <TouchableOpacity style={styles.navItem}>
                <MaterialCommunityIcons
                  name="compass"
                  size={24}
                  color="#fcd34d"
                />
                <Text style={styles.navText}>Discover</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={24}
                  color="#fcd34d"
                />
                <Text style={styles.navText}>Community</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color="#fcd34d"
                />
                <Text style={styles.navText}>Me</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  radialGlow: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: "transparent",
    shadowColor: "#fcd34d",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 150,
    zIndex: 3,
  },
  centralGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "transparent",
    shadowColor: "#fcd34d",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 100,
    zIndex: 3,
  },
  decorativeCircle: {
    position: "absolute",
    width: height * 0.4,
    height: height * 0.4,
    borderRadius: height * 0.2,
    backgroundColor: "#fcd34d",
    top: -height * 0.15,
    right: -width * 0.15,
    zIndex: 3,
    opacity: 0.05,
  },
  centerLogoWrapper: {
    position: "absolute",
    top: height * 0.1,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.3)",
  },
  logoGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "transparent",
    shadowColor: "#fcd34d",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  formContainer: {
    width: width * 0.9,
    maxWidth: 420,
    alignItems: "center",
    maxHeight: height * 0.8,
    paddingTop: 0,
    marginTop: height * 0.05,
    zIndex: 10,
  },
  nameInputsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 0,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
    paddingTop: 20,
  },
  formTitle: {
    fontSize: 36,
    fontWeight: "600",
    color: "#fcd34d",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(252, 211, 77, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  formSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 8,
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
  inputsContainer: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 15, 15, 0.5)",
    borderRadius: 16,
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  inputContainerFocused: {
    borderColor: "rgba(252, 211, 77, 0.5)",
    backgroundColor: "rgba(20, 20, 20, 0.7)",
    shadowColor: "#fcd34d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    height: "100%",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  secureButton: {
    width: 50,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#fcd34d",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  button: {
    width: "100%",
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#1c1917",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 10,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  toggleText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  toggleTextBold: {
    color: "#fcd34d",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 22,
    width: "100%",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(252, 211, 77, 0.2)",
  },
  orText: {
    color: "rgba(252, 211, 77, 0.5)",
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(15, 15, 15, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 13,
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 10, 10, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(252, 211, 77, 0.2)",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 10,
    zIndex: 100,
  },
  navItem: {
    alignItems: "center",
    padding: 8,
  },
  navText: {
    color: "#fcd34d",
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
});

export default AuthScreen;
