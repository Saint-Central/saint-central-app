import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { WebView } from "react-native-webview";
import theme from "@/theme";

// API Configuration
const CRUD_API_BASE = "https://crud-worker.colinmcherney.workers.dev";

// API Helper Function
const apiCall = async (url: string, options: RequestInit = {}) => {
  // Try to get token from new keys first, then fallback to old keys
  let token = await AsyncStorage.getItem("@auth_access_token");
  if (!token) {
    token = await AsyncStorage.getItem("access_token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log("Making API call to:", url);
  console.log("With headers:", Object.keys(headers));
  console.log("Token found:", token ? `${token.substring(0, 20)}...` : "No token");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log("API response status:", response.status);

  const data = await response.json().catch(() => ({ error: "Network error" }));
  console.log("API response data:", data);

  if (!response.ok) {
    if (data.code && data.error) {
      switch (data.code) {
        case "RATE_LIMITED":
          throw new Error("Too many attempts. Please wait a moment and try again.");
        case "TOKEN_EXPIRED":
        case "JWT_VERIFICATION_FAILED":
          throw new Error("Your session has expired. Please sign in again.");
        case "MISSING_AUTH_HEADER":
        case "INVALID_AUTH_FORMAT":
        case "INVALID_TOKEN":
          throw new Error("Authentication required. Please sign in again.");
        default:
          throw new Error(data.error || `API Error: ${data.code}`);
      }
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error(`Network error (${response.status}): ${response.statusText}`);
    }
  }

  return data;
};

// Rich Text Editor Component
const QuillEditor = ({ value, onContentChange, placeholder = "Share your story or message..." }: {
  value: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
}) => {
  const webviewRef = useRef<WebView>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>(value);

  // Memoize the content change handler to prevent unnecessary re-renders
  const handleContentChange = useCallback((content: string) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Only update if content actually changed
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      
      // Debounce the callback to prevent keyboard from closing
      debounceTimeoutRef.current = setTimeout(() => {
        onContentChange(content);
      }, 300); // 300ms delay
    }
  }, [onContentChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
    <style>
      body {
        margin: 0;
        padding: 16px;
        background-color: #1a1a1a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #editor-container {
        height: 280px;
        background-color: #2a2a2a;
        border-radius: 12px;
        border: 1px solid #404040;
      }
      .ql-toolbar {
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        border-bottom: 1px solid #404040;
        background-color: #333;
      }
      .ql-container {
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
        background-color: #2a2a2a;
        color: white;
        font-size: 16px;
      }
      .ql-editor {
        color: white;
        min-height: 200px;
        padding: 16px;
        line-height: 1.5;
      }
      .ql-editor.ql-blank::before {
        color: rgba(255, 255, 255, 0.5);
        content: attr(data-placeholder);
        font-style: italic;
      }
      .ql-toolbar .ql-stroke {
        stroke: #ccc;
      }
      .ql-toolbar .ql-fill {
        fill: #ccc;
      }
      .ql-toolbar .ql-picker-label {
        color: #ccc;
      }
      .ql-toolbar button:hover {
        background-color: #444;
      }
      .ql-toolbar button.ql-active {
        background-color: #7C3AED;
      }
    </style>
  </head>
  <body>
    <div id="editor-container"></div>
    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <script>
      const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: '${placeholder}',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
          ]
        }
      });
      
      // Set initial content if provided
      const initialContent = '${value.replace(/'/g, "\\'")}';
      if (initialContent && initialContent !== '') {
        quill.root.innerHTML = initialContent;
      }
      
      // Track content changes with debouncing
      let contentChangeTimeout;
      quill.on('text-change', function() {
        // Clear existing timeout
        if (contentChangeTimeout) {
          clearTimeout(contentChangeTimeout);
        }
        
        // Debounce the content change notification
        contentChangeTimeout = setTimeout(() => {
          const content = quill.root.innerHTML;
          if (content !== '<p><br></p>') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'content-change',
              content: content
            }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'content-change',
              content: ''
            }));
          }
        }, 100); // Short debounce for immediate feedback, but not every keystroke
      });
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ready'
      }));
      
      // Handle messages from React Native
      document.addEventListener("message", function(event) {
        const data = JSON.parse(event.data);
        if (data.type === "getContent") {
          const content = quill.root.innerHTML;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'content',
            content: content !== '<p><br></p>' ? content : ''
          }));
        } else if (data.type === "setContent") {
          quill.root.innerHTML = data.content || '';
        }
      });
    </script>
  </body>
</html>
`;

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'content-change') {
        handleContentChange(data.content);
      }
    } catch (error) {
      console.log('Editor message error:', error);
    }
  }, [handleContentChange]);

  return (
    <View style={styles.editorContainer}>
      <Text style={styles.editorLabel}>
        <MaterialCommunityIcons name="text-box" size={16} color={theme.textLight} />
        {"  "}Description
      </Text>
      <View style={styles.editorWrapper}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          scalesPageToFit={false}
          style={styles.webview}
          scrollEnabled={false}
          // These props help prevent unnecessary re-renders
          cacheEnabled={false}
          incognito={false}
          sharedCookiesEnabled={false}
        />
      </View>
    </View>
  );
};

// Categories that posts can be submitted to
const categories = [
  { 
    id: "faith", 
    name: "Faith", 
    icon: "book-open-variant",
    description: "Devotionals & Bible studies",
    color: "#7C3AED" 
  },
  { 
    id: "womens", 
    name: "Women's Ministry", 
    icon: "flower",
    description: "Fellowship & growth",
    color: "#DB2777" 
  },
  { 
    id: "culture", 
    name: "Culture", 
    icon: "comment-quote",
    description: "Stories & testimonies",
    color: "#0891B2" 
  },
];

// Form Input Component
const FormInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  multiline = false, 
  numberOfLines = 1,
  keyboardType = "default",
  autoCapitalize = "sentences",
  icon 
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  autoCapitalize?: any;
  icon?: string;
}) => {
  const focusAnim = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.divider, theme.primary],
  });

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {icon && <MaterialCommunityIcons name={icon as any} size={16} color={theme.textLight} />}
        {icon && "  "}
        {label}
      </Text>
      <Animated.View style={[styles.inputWrapper, { borderColor }]}>
        <TextInput
          style={[styles.textInput, multiline && styles.textInputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textLight}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </Animated.View>
    </View>
  );
};

// Category Selector Component
const CategorySelector = ({ selectedCategory, onSelectCategory }: {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}) => {
  const slideIn = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.categorySelector,
        {
          opacity,
          transform: [{ translateY: slideIn }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>
        <MaterialCommunityIcons name="tag" size={18} color={theme.textLight} />
        {"  "}Category
      </Text>
      <View style={styles.categoryGrid}>
        {categories.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryOption,
              selectedCategory === category.id && styles.categoryOptionSelected,
            ]}
            onPress={() => onSelectCategory(category.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                selectedCategory === category.id
                  ? [category.color, `${category.color}DD`]
                  : [`${category.color}08`, `${category.color}03`]
              }
              style={styles.categoryGradient}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={24}
                color={selectedCategory === category.id ? "#FFFFFF" : category.color}
              />
              <Text
                style={[
                  styles.categoryName,
                  selectedCategory === category.id && styles.categoryNameSelected,
                ]}
              >
                {category.name}
              </Text>
              <Text
                style={[
                  styles.categoryDescription,
                  selectedCategory === category.id && styles.categoryDescriptionSelected,
                ]}
              >
                {category.description}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

// Submit Button Component
const SubmitButton = ({ onPress, loading, disabled }: {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.submitContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={disabled || loading}
      >
        <LinearGradient
          colors={disabled ? [theme.textLight, theme.textLight] : ["#9333EA", "#7C3AED"]}
          style={styles.submitGradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="clock" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>Submitting...</Text>
            </View>
          ) : (
            <View style={styles.submitContent}>
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>Submit for Review</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function PostsScreen() {
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    authorName: "",
    imageUrl: "",
    videoLink: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); // Get user from AuthContext

  const headerAnimation = useRef(new Animated.Value(-50)).current;
  const contentAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnimation, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnimation, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Memoize the content change handler to prevent unnecessary re-renders
  const handleContentChange = useCallback((content: string) => {
    setFormData(prev => ({ ...prev, excerpt: content }));
  }, []);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    
    // For rich text editor, check if content exists (strip HTML for validation)
    const textContent = formData.excerpt.replace(/<[^>]*>/g, '').trim();
    if (!textContent) newErrors.excerpt = "Description is required";
    
    if (!formData.authorName.trim()) newErrors.authorName = "Author name is required";
    if (!formData.category) newErrors.category = "Please select a category";

    // Validate URL format if provided
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = "Please enter a valid image URL";
    }
    if (formData.videoLink && !isValidUrl(formData.videoLink)) {
      newErrors.videoLink = "Please enter a valid video URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields correctly.");
      return;
    }

    if (!user) {
      Alert.alert("Authentication Error", "Please sign in to submit a post.");
      return;
    }

    setLoading(true);

    try {
      console.log("📝 [POST SUBMIT] Starting post submission...");
      console.log("📝 [POST SUBMIT] User ID:", user.id);
      console.log("📝 [POST SUBMIT] Form data:", formData);

      // Prepare post data for pending_posts table
      const postData = {
        user_id: user.id,
        title: formData.title.trim(),
        excerpt: formData.excerpt, // This now contains rich HTML content
        author_name: formData.authorName.trim(),
        image_url: formData.imageUrl.trim() || null,
        video_link: formData.videoLink.trim() || null,
        section: formData.category,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      console.log("📝 [POST SUBMIT] Prepared data:", postData);

      // Submit to pending_posts table
      const response = await apiCall(CRUD_API_BASE, {
        method: "POST",
        body: JSON.stringify({
          operation: "INSERT",
          table: "pending_posts",
          data: postData,
        }),
      });

      console.log("📝 [POST SUBMIT] API Response:", response);

      if (response.success) {
        console.log("✅ [POST SUBMIT] Post submitted successfully!");
        
        Alert.alert(
          "Success! 🎉",
          "Your post has been submitted for review. You'll be notified once it's approved!",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(response.error || "Failed to submit post");
      }
    } catch (error: any) {
      console.error("❌ [POST SUBMIT] Error submitting post:", error);
      
      let errorMessage = "Failed to submit post. Please try again.";
      
      if (error.message?.includes("expired") || error.message?.includes("Authentication")) {
        errorMessage = "Your session has expired. Please sign in again.";
      } else if (error.message?.includes("rate limit") || error.message?.includes("Too many")) {
        errorMessage = "Too many submissions. Please wait a moment and try again.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.title && formData.excerpt.replace(/<[^>]*>/g, '').trim() && formData.authorName && formData.category;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            paddingTop: insets.top + 10,
            transform: [{ translateY: headerAnimation }] 
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Share Your Story</Text>
          <Text style={styles.headerSubtitle}>Inspire others with your faith journey</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: contentAnimation }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          {/* Form Fields */}
          <View style={styles.formSection}>
            <FormInput
              label="Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter your post title..."
              icon="format-title"
            />

            {/* Rich Text Editor for Description */}
            <QuillEditor
              value={formData.excerpt}
              onContentChange={handleContentChange}
              placeholder="Share your story or message..."
            />

            <FormInput
              label="Your Name"
              value={formData.authorName}
              onChangeText={(text) => setFormData({ ...formData, authorName: text })}
              placeholder="Enter your name..."
              icon="account"
            />

            <FormInput
              label="Image URL (Optional)"
              value={formData.imageUrl}
              onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
              placeholder="https://example.com/image.jpg"
              keyboardType="url"
              autoCapitalize="none"
              icon="image"
            />

            <FormInput
              label="Video URL (Optional)"
              value={formData.videoLink}
              onChangeText={(text) => setFormData({ ...formData, videoLink: text })}
              placeholder="https://youtube.com/watch?v=..."
              keyboardType="url"
              autoCapitalize="none"
              icon="video"
            />
          </View>

          {/* Category Selection */}
          <CategorySelector
            selectedCategory={formData.category}
            onSelectCategory={(category) => setFormData({ ...formData, category })}
          />

          {/* Submit Button */}
          <SubmitButton
            onPress={handleSubmit}
            loading={loading}
            disabled={!isFormValid}
          />

          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
            <Text style={styles.infoText}>
              Your post will be reviewed by our team before being published. You'll receive a notification once it's approved.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.pageBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.textLight,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Extra space for tab bar and safe area
  },

  // Form Section
  formSection: {
    gap: 20,
    marginBottom: 40,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.textLight,
  },
  inputWrapper: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: theme.cardBg,
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    color: theme.textWhite,
    minHeight: 48,
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  // Category Selection
  categorySelector: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: theme.textLight,
    marginBottom: 16,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryOption: {
    borderRadius: 16,
    overflow: "hidden",
  },
  categoryOptionSelected: {
    ...Platform.select({
      ios: {
        shadowColor: "#9333EA",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  categoryGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    flex: 1,
  },
  categoryNameSelected: {
    color: "#FFFFFF",
  },
  categoryDescription: {
    fontSize: 12,
    color: theme.textLight,
    lineHeight: 16,
    marginTop: 4,
  },
  categoryDescriptionSelected: {
    color: "rgba(255,255,255,0.8)",
  },

  // Submit Button
  submitContainer: {
    marginBottom: 32,
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    padding: 18,
    alignItems: "center",
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
  },

  // Info Card
  infoCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.divider,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.textLight,
    lineHeight: 20,
  },

  // Rich Text Editor
  editorContainer: {
    marginBottom: 20,
  },
  editorLabel: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.textLight,
    marginBottom: 8,
  },
  editorWrapper: {
    height: 320,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  webview: {
    backgroundColor: "transparent",
    flex: 1,
  },

  bottomSpacer: {
    height: 100,
  },
});