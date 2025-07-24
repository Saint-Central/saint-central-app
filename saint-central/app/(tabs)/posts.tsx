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
  KeyboardAvoidingView,
  Modal,
  Dimensions,
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

// Rich Text Editor Component - Completely Fixed Version
const QuillEditor = ({ value, onContentChange, placeholder = "Share your story or message..." }: {
  value: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
}) => {
  const webviewRef = useRef<WebView>(null);
  const contentRef = useRef<string>(value);
  const isInitializedRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only update parent when user stops typing for a while or loses focus
  const updateParentContent = useCallback(() => {
    if (contentRef.current !== value) {
      onContentChange(contentRef.current);
    }
  }, [onContentChange, value]);

  // Update content ref immediately but delay parent update
  const handleContentChange = useCallback((content: string) => {
    if (!isInitializedRef.current) return;
    
    contentRef.current = content;
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Update parent after user stops typing for 2 seconds
    updateTimeoutRef.current = setTimeout(() => {
      updateParentContent();
    }, 2000);
  }, [updateParentContent]);

  // Force update parent when component unmounts or when needed
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Force final update on unmount
      updateParentContent();
    };
  }, [updateParentContent]);

  // Method to get current content (for form submission)
  const getCurrentContent = useCallback(() => {
    return contentRef.current;
  }, []);

  // Expose method to parent
  useEffect(() => {
    if (webviewRef.current) {
      (webviewRef.current as any).getCurrentContent = getCurrentContent;
    }
  }, [getCurrentContent]);

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: transparent;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #editor-container {
        height: 280px;
        background-color: transparent;
        border: none;
      }
      .ql-toolbar {
        border: none;
        background-color: transparent;
        padding: 8px 0;
      }
      .ql-container {
        border: none;
        background-color: transparent;
        color: white;
        font-size: 16px;
      }
      .ql-editor {
        color: white;
        min-height: 200px;
        padding: 12px 0;
        line-height: 1.5;
        border: none;
      }
      .ql-editor.ql-blank::before {
        color: rgba(255, 255, 255, 0.5);
        content: attr(data-placeholder);
        font-style: italic;
      }
      
      /* Enhanced toolbar button styling */
      .ql-toolbar button {
        border-radius: 6px !important;
        margin: 0 1px !important;
        padding: 6px 7px !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        border: none !important;
        background-color: transparent !important;
        position: relative !important;
        overflow: hidden !important;
        min-width: 32px !important;
        min-height: 32px !important;
      }
      
      /* Make toolbar icons appropriately sized for single line */
      .ql-toolbar button svg {
        width: 16px !important;
        height: 16px !important;
        position: relative;
        z-index: 1;
      }
      
      .ql-toolbar .ql-picker-label {
        min-height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 6px 7px !important;
      }
      
      .ql-toolbar .ql-picker-label svg {
        width: 16px !important;
        height: 16px !important;
      }
      
      .ql-toolbar button:hover {
        background-color: rgba(124, 58, 237, 0.1) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2) !important;
      }
      
      .ql-toolbar button:active {
        transform: translateY(0) !important;
        transition: all 0.05s !important;
      }
      
      .ql-toolbar button.ql-active {
        background-color: #7C3AED !important;
        color: white !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4) !important;
      }
      
      .ql-toolbar button.ql-active:hover {
        background-color: #6D28D9 !important;
        box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5) !important;
      }
      
      /* Smooth icon transitions */
      .ql-toolbar .ql-stroke {
        stroke: #ccc !important;
        transition: stroke 0.15s ease !important;
      }
      
      .ql-toolbar .ql-fill {
        fill: #ccc !important;
        transition: fill 0.15s ease !important;
      }
      
      .ql-toolbar button:hover .ql-stroke {
        stroke: #7C3AED !important;
      }
      
      .ql-toolbar button:hover .ql-fill {
        fill: #7C3AED !important;
      }
      
      .ql-toolbar button.ql-active .ql-stroke {
        stroke: white !important;
      }
      
      .ql-toolbar button.ql-active .ql-fill {
        fill: white !important;
      }
      
      /* Enhanced picker styling */
      .ql-toolbar .ql-picker-label {
        color: #ccc !important;
        border-radius: 6px !important;
        padding: 6px 8px !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .ql-toolbar .ql-picker-label:hover {
        background-color: rgba(124, 58, 237, 0.1) !important;
        color: #7C3AED !important;
        transform: translateY(-1px) !important;
      }
      
      .ql-toolbar .ql-picker.ql-expanded .ql-picker-label {
        background-color: #7C3AED !important;
        color: white !important;
      }
      
      /* Dropdown animations */
      .ql-toolbar .ql-picker-options {
        background-color: #2a2a2a !important;
        border: 1px solid #404040 !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
        animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .ql-toolbar .ql-picker-item {
        color: #ccc !important;
        transition: all 0.15s ease !important;
        padding: 8px 12px !important;
        border-radius: 4px !important;
        margin: 2px !important;
      }
      
      .ql-toolbar .ql-picker-item:hover {
        background-color: rgba(124, 58, 237, 0.1) !important;
        color: #7C3AED !important;
      }
      
      /* Link tooltip styling */
      .ql-tooltip {
        background-color: #2a2a2a !important;
        border: 1px solid #404040 !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
        color: white !important;
      }
      
      .ql-tooltip input {
        background-color: #1a1a1a !important;
        border: 1px solid #404040 !important;
        border-radius: 6px !important;
        color: white !important;
        padding: 8px 12px !important;
        transition: border-color 0.15s ease !important;
      }
      
      .ql-tooltip input:focus {
        border-color: #7C3AED !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2) !important;
      }
      
      .ql-tooltip a.ql-action {
        color: #7C3AED !important;
        transition: color 0.15s ease !important;
      }
      
      .ql-tooltip a.ql-action:hover {
        color: #6D28D9 !important;
      }
      
      /* Add ripple effect for button presses */
      .ql-toolbar button::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(124, 58, 237, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s;
        z-index: 0;
      }
      
      .ql-toolbar button:active::before {
        width: 40px;
        height: 40px;
      }
      
      .ql-toolbar button svg {
        position: relative;
        z-index: 1;
      }
    </style>
  </head>
  <body>
    <div id="editor-container"></div>
    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <script>
      let isInitialized = false;
      let currentContent = '';
      
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
        currentContent = initialContent;
      }
      
      // Mark as initialized
      setTimeout(() => {
        isInitialized = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));
      }, 100);
      
      // Lightweight focus preservation for toolbar interactions
      const toolbar = document.querySelector('.ql-toolbar');
      if (toolbar) {
        // Prevent toolbar from stealing focus but keep formatting snappy
        toolbar.addEventListener('mousedown', function(e) {
          e.preventDefault();
        });
        
        // Quick refocus after toolbar interaction without interfering with formatting speed
        toolbar.addEventListener('click', function(e) {
          // Very fast refocus - no delay to keep formatting responsive
          setTimeout(() => quill.focus(), 1);
        });
      }
      
      // Handle content changes - send immediately for responsiveness
      quill.on('text-change', function() {
        if (!isInitialized) return;
        
        const content = quill.root.innerHTML;
        const processedContent = content === '<p><br></p>' ? '' : content;
        
        // Update current content and send to React Native immediately
        currentContent = processedContent;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'content-change',
          content: processedContent
        }));
      });
      
      // Simple blur handling - only update parent on real blur
      quill.root.addEventListener('blur', function(e) {
        // Check if blur is due to toolbar interaction
        const relatedTarget = e.relatedTarget;
        const toolbar = document.querySelector('.ql-toolbar');
        
        if (!(relatedTarget && toolbar && toolbar.contains(relatedTarget))) {
          // Real blur event, update parent
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'blur',
            content: currentContent
          }));
        }
      });
      
      // Handle messages from React Native
      document.addEventListener("message", function(event) {
        const data = JSON.parse(event.data);
        if (data.type === "getContent") {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'content',
            content: currentContent
          }));
        } else if (data.type === "setContent") {
          const newContent = data.content || '';
          if (newContent !== currentContent) {
            currentContent = newContent;
            quill.root.innerHTML = newContent;
          }
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
      } else if (data.type === 'ready') {
        isInitializedRef.current = true;
      } else if (data.type === 'blur') {
        // Update parent immediately on blur
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        updateParentContent();
      }
    } catch (error) {
      console.log('Editor message error:', error);
    }
  }, [handleContentChange, updateParentContent]);

  return (
    <View style={styles.borderlessEditorContainer}>
      <Text style={styles.borderlessInputLabel}>
        <MaterialCommunityIcons name="text-box" size={16} color={theme.textLight} />
        {"  "}Description
      </Text>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scalesPageToFit={false}
        style={styles.borderlessWebview}
        scrollEnabled={false}
        cacheEnabled={false}
        incognito={true}
        sharedCookiesEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        // Critical: Prevent re-renders
        onShouldStartLoadWithRequest={() => true}
        onLoadEnd={() => {}}
        onLoadStart={() => {}}
      />
      <View style={styles.underline} />
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

// Borderless Form Input Component
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
  return (
    <View style={styles.borderlessInputContainer}>
      <Text style={styles.borderlessInputLabel}>
        {icon && <MaterialCommunityIcons name={icon as any} size={16} color={theme.textLight} />}
        {icon && "  "}
        {label}
      </Text>
      <TextInput
        style={[
          styles.borderlessTextInput,
          multiline && styles.borderlessTextInputMultiline
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textLight}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      <View style={styles.underline} />
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

// Modern Enhanced Modal Component
const CustomModal = ({ 
  visible, 
  title, 
  message, 
  type = "info", 
  onClose, 
  onConfirm,
  confirmText = "OK",
  showCancel = false,
  cancelText = "Cancel"
}: {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
}) => {
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.3)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  
  // Modern bounce animation for modal entrance
  useEffect(() => {
    if (visible) {
      // Reset animations
      slideAnimation.setValue(0);
      opacityAnimation.setValue(0);
      scaleAnimation.setValue(0.3);
      
      Animated.parallel([
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnimation, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon pulse animation for success/error states
      if (type === "success" || type === "error") {
        Animated.sequence([
          Animated.timing(iconPulse, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(iconPulse, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      Animated.parallel([
        Animated.timing(opacityAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, type]);

  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return { 
          icon: "check-circle", 
          color: "#10B981", 
          bgColor: "rgba(16, 185, 129, 0.1)",
          gradientColors: ["#10B981", "#059669"]
        };
      case "error":
        return { 
          icon: "close-circle", 
          color: "#EF4444", 
          bgColor: "rgba(239, 68, 68, 0.1)",
          gradientColors: ["#EF4444", "#DC2626"]
        };
      case "warning":
        return { 
          icon: "alert", 
          color: "#F59E0B", 
          bgColor: "rgba(245, 158, 11, 0.1)",
          gradientColors: ["#F59E0B", "#D97706"]
        };
      default:
        return { 
          icon: "information", 
          color: theme.primary, 
          bgColor: "rgba(124, 58, 237, 0.1)",
          gradientColors: [theme.primary, "#6D28D9"]
        };
    }
  };

  const { icon, color, bgColor, gradientColors } = getIconAndColor();

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: opacityAnimation }
        ]}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.modernModalContainer,
            {
              opacity: opacityAnimation,
              transform: [
                { scale: scaleAnimation },
                {
                  translateY: slideAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Modern glassmorphism background */}
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.95)', 'rgba(42, 42, 42, 0.95)']}
            style={styles.modernModalGradient}
          >
            {/* Top accent bar */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalAccentBar}
            />
            
            <View style={styles.modernModalContent}>
              {/* Enhanced icon with background */}
              <Animated.View 
                style={[
                  styles.modernModalIcon,
                  { backgroundColor: bgColor, transform: [{ scale: iconPulse }] }
                ]}
              >
                <MaterialCommunityIcons name={icon as any} size={36} color={color} />
                
                {/* Subtle glow effect for success/error */}
                {(type === "success" || type === "error") && (
                  <View style={[styles.iconGlow, { backgroundColor: color }]} />
                )}
              </Animated.View>
              
              {/* Title with better typography */}
              <Text style={styles.modernModalTitle}>{title}</Text>
              
              {/* Message with improved readability */}
              <Text style={styles.modernModalMessage}>{message}</Text>
              
              {/* Enhanced buttons */}
              <View style={styles.modernModalButtons}>
                {showCancel && (
                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                      style={styles.modernModalButtonCancel}
                      onPress={onClose}
                      onPressIn={handleButtonPressIn}
                      onPressOut={handleButtonPressOut}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modernModalButtonTextCancel}>{cancelText}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
                
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.modernModalButtonConfirm}
                    onPress={handleConfirm}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      style={styles.modernModalButtonGradient}
                    >
                      <Text style={styles.modernModalButtonTextConfirm}>{confirmText}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
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
  const [modal, setModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning",
    onConfirm: undefined as (() => void) | undefined,
    confirmText: "OK",
    showCancel: false,
    cancelText: "Cancel"
  });

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const editorRef = useRef<WebView>(null);

  const headerAnimation = useRef(new Animated.Value(-50)).current;
  const contentAnimation = useRef(new Animated.Value(0)).current;

  const showModal = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    onConfirm?: () => void,
    confirmText: string = "OK",
    showCancel: boolean = false,
    cancelText: string = "Cancel"
  ) => {
    setModal({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      showCancel,
      cancelText
    });
  };

  const hideModal = () => {
    setModal(prev => ({ ...prev, visible: false }));
  };

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

  // Handle content change with delayed update
  const handleContentChange = useCallback((content: string) => {
    setFormData(prev => ({ ...prev, excerpt: content }));
  }, []);

  // Get current content from editor for validation and submission
  const getCurrentEditorContent = useCallback(() => {
    if (editorRef.current && (editorRef.current as any).getCurrentContent) {
      return (editorRef.current as any).getCurrentContent();
    }
    return formData.excerpt;
  }, [formData.excerpt]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    
    // Get current content from editor for validation
    const currentContent = getCurrentEditorContent();
    const textContent = currentContent.replace(/<[^>]*>/g, '').trim();
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
      showModal("Validation Error", "Please fill in all required fields correctly.", "warning");
      return;
    }

    if (!user) {
      showModal("Authentication Error", "Please sign in to submit a post.", "error");
      return;
    }

    setLoading(true);

    try {
      console.log("📝 [POST SUBMIT] Starting post submission...");
      console.log("📝 [POST SUBMIT] User ID:", user.id);

      // Get the latest content from editor
      const currentContent = getCurrentEditorContent();
      
      // Prepare post data for pending_posts table
      const postData = {
        user_id: user.id,
        title: formData.title.trim(),
        excerpt: currentContent, // Use current content from editor
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
        
        showModal(
          "Success! 🎉",
          "Your post has been submitted for review. You'll be notified once it's approved!",
          "success",
          () => {
            hideModal();
            setTimeout(() => router.back(), 100);
          },
          "OK"
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
      
      showModal("Error", errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // Check form validity using current editor content
  const isFormValid = () => {
    const currentContent = getCurrentEditorContent();
    const textContent = currentContent.replace(/<[^>]*>/g, '').trim();
    return formData.title.trim() && textContent && formData.authorName.trim() && formData.category;
  };

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
            disabled={!isFormValid()}
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

      {/* Custom Modal */}
      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        showCancel={modal.showCancel}
        cancelText={modal.cancelText}
      />
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
    gap: 24,
    marginBottom: 40,
  },
  borderlessInputContainer: {
    marginBottom: 8,
  },
  borderlessInputLabel: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.textLight,
    marginBottom: 12,
  },
  borderlessTextInput: {
    backgroundColor: "transparent",
    padding: 0,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.textWhite,
    minHeight: 44,
    textAlignVertical: "top",
  },
  borderlessTextInputMultiline: {
    minHeight: 120,
    paddingVertical: 16,
  },
  underline: {
    height: 1,
    backgroundColor: theme.divider,
    marginTop: 4,
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

  // Borderless Rich Text Editor
  borderlessEditorContainer: {
    marginBottom: 8,
  },
  borderlessWebview: {
    backgroundColor: "transparent",
    height: 280,
  },

  bottomSpacer: {
    height: 100,
  },

  // Enhanced Modern Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(10px)",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modernModalContainer: {
    width: Dimensions.get("window").width * 0.88,
    maxWidth: 420,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 25,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modernModalGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  modalAccentBar: {
    height: 4,
    width: "100%",
  },
  modernModalContent: {
    padding: 28,
    alignItems: "center",
  },
  modernModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.1,
    top: -5,
    left: -5,
  },
  modernModalTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modernModalMessage: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  modernModalButtons: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    justifyContent: "center",
  },
  modernModalButtonCancel: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modernModalButtonConfirm: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modernModalButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modernModalButtonTextCancel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    letterSpacing: 0.5,
  },
  modernModalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});