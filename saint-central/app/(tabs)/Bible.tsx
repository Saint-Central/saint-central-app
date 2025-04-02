import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Image,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert,
  ToastAndroid,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Enable layout animation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get("window");

// Define interfaces for data structures
interface BibleVerse {
  id: number;
  book: string;
  chapter: string;
  verse: string;
  text: string;
}

interface RecentlyReadItem {
  book: string;
  chapter: string;
  verse: string;
  lastRead: Date;
}

interface FavoriteItem {
  id?: string;
  book: string;
  chapter: string;
  verse: string;
  dateAdded: Date;
  note?: string;
  color?: string;
}

// Bible view types
type BibleView = "books" | "chapters" | "verses" | "favorites";

// Reading theme types
type ReadingTheme = "paper" | "sepia" | "night";

// Font size options
type FontSize = "small" | "medium" | "large" | "xlarge";

// List of all available Bible versions (adjust as needed)
const bibleVersions = [
  { label: "KJV", table: "KJV_bible" },
  { label: "ASV", table: "ASV_bible" },
  { label: "Albanian", table: "Alb_bible" },
  { label: "CPDV", table: "CPDV_bible" },
  { label: "Haitian", table: "Haitian_bible" },
  { label: "JapBungo", table: "JapBungo_bible" },
  { label: "ThaiKJV", table: "ThaiKJV_bible" },
  { label: "La Santa Biblia Reina-Valera", table: "SpaRV_bible" },
];

// Biblical books in order with testament grouping
const bibleBooks = {
  oldTestament: [
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "I Samuel",
    "II Samuel",
    "I Kings",
    "II Kings",
    "I Chronicles",
    "II Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
  ],
  newTestament: [
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "I Corinthians",
    "II Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "I Thessalonians",
    "II Thessalonians",
    "I Timothy",
    "II Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "I Peter",
    "II Peter",
    "I John",
    "II John",
    "III John",
    "Jude",
    "Revelation of John",
  ],
};

// All books combined for search and display
const allBooks = [...bibleBooks.oldTestament, ...bibleBooks.newTestament];

// Background patterns for each theme (SVG patterns)
const patterns = {
  paper:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBmaWxsPSIjRjVGNUY1IiBkPSJNMCAwaDIwdjIwSDB6Ii8+PHBhdGggZmlsbD0iI0Y1RjVGNSIgZD0iTTIwIDIwaDIwdjIwSDIweiIvPjwvZz48L3N2Zz4=",
  sepia:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2g9IjQwIiB2aWV3Qm94PSIwIDAgNDAgNDAiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZmlsbD0iI0Y4RjFFMyIgZD0iTTAgMGg0MHY0MEgweiIvPjxwYXRoIGZpbGw9IiNGMUU5RDYiIGQ9Ik0wIDBoMjB2MjBIMHoiLz48cGF0aCBmaWxsPSIjRjFFOUQ2IiBkPSJNMjAgMjBoMjB2MjBIMjB6Ii8+PC9nPjwvc3ZnPg==",
  night:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2g9IjIwIiB2aWV3Qm94PSIwIDAgMjAgMjAiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZmlsbD0iIzEyMTIxMiIgZD0iTTAgMGgyMHYyMEgwIi8+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMC41IiBmaWxsPSIjMkEyQTJBIi8+PC9nPjwvc3ZnPg==",
};

// Theme icons from Feather
const themeIcons: { [key in ReadingTheme]: "sun" | "book-open" | "moon" } = {
  paper: "sun",
  sepia: "book-open",
  night: "moon",
};

// Book category icons
const categoryIcons = {
  law: "book",
  history: "archive",
  wisdom: "feather",
  prophets: "message-circle",
  gospels: "heart",
  letters: "mail",
};

// Get book category
const getBookCategory = (book: string): string => {
  const lawBooks = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"];
  const historyBooks = [
    "Joshua",
    "Judges",
    "Ruth",
    "I Samuel",
    "II Samuel",
    "I Kings",
    "II Kings",
    "I Chronicles",
    "II Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    // Historical deuterocanonical books
    "Tobit",
    "Judith",
    "1 Maccabees",
    "2 Maccabees",
    "Additions to Esther",
  ];
  const wisdomBooks = [
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    // Wisdom deuterocanonical books
    "Wisdom",
    "Sirach",
  ];
  const prophetBooks = [
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    // Prophetic deuterocanonical books
    "Baruch",
  ];
  const gospelsAndActs = ["Matthew", "Mark", "Luke", "John", "Acts"];

  if (lawBooks.includes(book)) return "law";
  if (historyBooks.includes(book)) return "history";
  if (wisdomBooks.includes(book)) return "wisdom";
  if (prophetBooks.includes(book)) return "prophets";
  if (gospelsAndActs.includes(book)) return "gospels";
  return "letters";
};
// This function checks if a Bible version includes deuterocanonical books
const includesDeuterocanonical = (version: string): boolean => {
  // CPDV is Catholic Public Domain Version which should include deuterocanonical books
  return version === "CPDV_bible";
};

// Define deuterocanonical books - these are additional books in Catholic Bibles
const deuterocanonicalBooks = [
  "Tobit",
  "Judith",
  "Wisdom",
  "Sirach",
  "Baruch",
  "I Maccabees",
  "II Maccabees",
];
// Get color for book category
const getBookColor = (book: string, theme: ReadingTheme): string => {
  const category = getBookCategory(book) as keyof typeof colors.paper;

  const colors = {
    paper: {
      law: "#4A6FA5",
      history: "#3D7D91",
      wisdom: "#6A8A39",
      prophets: "#8E5B4F",
      gospels: "#6A478F",
      letters: "#92624D",
    },
    sepia: {
      law: "#8B5A2B",
      history: "#7F693B",
      wisdom: "#6B5D39",
      prophets: "#7D513A",
      gospels: "#7A503E",
      letters: "#6F5746",
    },
    night: {
      law: "#7B9EB3",
      history: "#7BA3A3",
      wisdom: "#8B9E7B",
      prophets: "#A48999",
      gospels: "#8F8CB3",
      letters: "#9A9283",
    },
  };

  return colors[theme][category];
};

// Define a set of CPDV‑exclusive books (include your desired names)
const CPDVExclusiveBooks = new Set([
  "Tobit",
  "Judith",
  "1 Maccabees",
  "2 Maccabees",
  "Additions to Esther",
  "Wisdom",
  "Sirach",
  "Baruch",
]);

export default function BibleScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation refs for bookmark/favorite interactions
  const favoriteScale = useRef(new Animated.Value(1)).current;
  const bookmarkPulse = useRef(new Animated.Value(1)).current;

  // ---------------------
  // State Management
  // ---------------------

  // Bible version state
  const [selectedVersion, setSelectedVersion] = useState<string>("KJV_bible");
  const [showVersionSelector, setShowVersionSelector] =
    useState<boolean>(false);

  // Book & chapter selection
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [verses, setVerses] = useState<BibleVerse[]>([]);

  // Loading / Searching
  const [loading, setLoading] = useState<boolean>(false);
  const [view, setView] = useState<BibleView>("books");
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Theme & font
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("paper");
  const [fontSize, setFontSize] = useState<FontSize>("medium");

  // Testament filter
  const [testament, setTestament] = useState<"all" | "old" | "new">("all");
  const [showThemeSelector, setShowThemeSelector] = useState<boolean>(false);

  // Recent & favorites
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Favorite details modal
  const [showFavoriteModal, setShowFavoriteModal] = useState<boolean>(false);
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteItem | null>(
    null
  );
  const [favoriteNote, setFavoriteNote] = useState<string>("");

  // Loading state and mode
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(true);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);

  // Grouping favorites
  const [favoriteGrouping, setFavoriteGrouping] = useState<
    "book" | "date" | "none"
  >("book");

  // ---------------------
  // PERSISTENCE - LOAD AND SAVE FAVORITES
  // ---------------------

  // Initialize by loading favorites and settings
  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([loadFavorites(), loadSettings(), loadRecentlyRead()]);
    };

    initializeApp();
  }, []);

  // Save favorites to AsyncStorage as a backup
  useEffect(() => {
    if (favorites.length > 0 && !favoriteLoading) {
      saveFavoritesToStorage();
    }
  }, [favorites]);

  // Load settings (theme, font size, etc.)
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("bibleAppSettings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.readingTheme) setReadingTheme(settings.readingTheme);
        if (settings.fontSize) setFontSize(settings.fontSize);
        if (settings.selectedVersion)
          setSelectedVersion(settings.selectedVersion);
        if (settings.favoriteGrouping)
          setFavoriteGrouping(settings.favoriteGrouping);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Load recently read items
  const loadRecentlyRead = async () => {
    try {
      const savedRecents = await AsyncStorage.getItem("bibleAppRecents");
      if (savedRecents) {
        const parsedRecents = JSON.parse(savedRecents);
        // Convert string dates back to Date objects
        const formattedRecents = parsedRecents.map((recent: any) => ({
          ...recent,
          lastRead: new Date(recent.lastRead),
        }));
        setRecentlyRead(formattedRecents);
      }
    } catch (error) {
      console.error("Error loading recently read:", error);
      setRecentlyRead([]);
    }
  };

  // Save recently read items
  const saveRecentlyRead = async (items: RecentlyReadItem[]) => {
    try {
      await AsyncStorage.setItem("bibleAppRecents", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving recently read:", error);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async () => {
    try {
      const settings = {
        readingTheme,
        fontSize,
        selectedVersion,
        favoriteGrouping,
      };
      await AsyncStorage.setItem("bibleAppSettings", JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Effect to save settings when they change
  useEffect(() => {
    saveSettings();
  }, [readingTheme, fontSize, selectedVersion, favoriteGrouping]);
  // Add this useEffect hook after the other useEffect hooks in your component
  // This will ensure the content updates when version changes
  useEffect(() => {
    // When version changes, update content based on current view
    if (view === "verses" && selectedBook && selectedChapter) {
      // If in verses view, reload verses with new version
      fetchVerses(selectedBook, selectedChapter);
    } else if (view === "chapters" && selectedBook) {
      // If in chapters view, reload chapters with new version
      fetchChapters(selectedBook);
    }
    // For books view, the getFilteredBooks function will handle this automatically
    // since it depends on selectedVersion
  }, [selectedVersion]);

  // Replace the current handleVersionSelect function with this improved version
  // Removed duplicate handleVersionSelect function
  // Load favorites from Supabase + Backup from AsyncStorage
  const loadFavorites = async () => {
    setFavoriteLoading(true);
    try {
      // First try to load from Supabase (online mode)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log("User not logged in or error, using offline mode");
        setOfflineMode(true);
        loadFavoritesFromStorage();
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("date_added", { ascending: false });

      if (error) throw error;

      // Process data from Supabase to match our local format
      const formattedFavorites: FavoriteItem[] = data.map((item) => ({
        id: item.id,
        book: item.book,
        chapter: item.chapter,
        verse: item.verse,
        dateAdded: new Date(item.date_added),
        note: item.note || "",
        color: item.color || undefined,
      }));

      setFavorites(formattedFavorites);

      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem(
        "bibleAppFavorites",
        JSON.stringify(formattedFavorites)
      );
    } catch (error) {
      console.error("Error loading favorites from Supabase:", error);
      loadFavoritesFromStorage();
      setOfflineMode(true);
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Load favorites from AsyncStorage (offline fallback)
  const loadFavoritesFromStorage = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("bibleAppFavorites");
      if (savedFavorites) {
        const parsedFavorites = JSON.parse(savedFavorites);
        // Convert string dates back to Date objects
        const formattedFavorites = parsedFavorites.map((fav: any) => ({
          ...fav,
          dateAdded: new Date(fav.dateAdded),
        }));
        setFavorites(formattedFavorites);
      }
    } catch (error) {
      console.error("Error loading favorites from storage:", error);
      setFavorites([]);
    }
  };

  // Save favorites to AsyncStorage (for offline mode and backup)
  const saveFavoritesToStorage = async () => {
    try {
      await AsyncStorage.setItem(
        "bibleAppFavorites",
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.error("Error saving favorites to storage:", error);
    }
  };

  // ---------------------
  // FAVORITES HANDLERS WITH SUPABASE AND OFFLINE SUPPORT
  // ---------------------
  const addFavorite = async (
    book: string,
    chapter: string,
    verse: string,
    note: string = ""
  ): Promise<void> => {
    try {
      // Create a new local favorite object
      const newFavorite: FavoriteItem = {
        book,
        chapter,
        verse,
        dateAdded: new Date(),
        note,
      };

      // Add to state immediately for UI responsiveness
      setFavorites((prev) => [newFavorite, ...prev]);

      // Show animation
      animateFavoriteAction();

      // If offline, just save to AsyncStorage
      if (offlineMode) {
        showFeedback("Bookmark added (offline mode)");
        return;
      }

      // Otherwise, save to Supabase
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setOfflineMode(true);
        showFeedback("Bookmark added (offline mode)");
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert([
          {
            user_id: user.id,
            bible_version: selectedVersion,
            book,
            chapter,
            verse,
            note,
            date_added: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Update the local state with the returned ID
        setFavorites((prev) => {
          const updated = [...prev];
          const index = updated.findIndex(
            (f) => f.book === book && f.chapter === chapter && f.verse === verse
          );
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              id: data[0].id,
            };
          }
          return updated;
        });
      }

      showFeedback("Bookmark added");
    } catch (error) {
      console.error("Error adding favorite:", error);
      showFeedback("Failed to add bookmark");
    }
  };

  const removeFavorite = async (
    book: string,
    chapter: string,
    verse: string
  ): Promise<void> => {
    try {
      // Find the favorite in state
      const favoriteToRemove = favorites.find(
        (f) => f.book === book && f.chapter === chapter && f.verse === verse
      );

      if (!favoriteToRemove) return;

      // Remove from state immediately for UI responsiveness
      setFavorites((prev) =>
        prev.filter(
          (fav) =>
            !(
              fav.book === book &&
              fav.chapter === chapter &&
              fav.verse === verse
            )
        )
      );

      // Show animation
      animateFavoriteAction();

      // If offline, just save to AsyncStorage
      if (offlineMode) {
        showFeedback("Bookmark removed (offline mode)");
        return;
      }

      // If online and we have an ID, remove from Supabase
      if (favoriteToRemove.id) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("id", favoriteToRemove.id);

        if (error) throw error;
      } else {
        // If no ID (maybe added in offline mode), try to delete by other fields
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setOfflineMode(true);
          showFeedback("Bookmark removed (offline mode)");
          return;
        }

        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("bible_version", selectedVersion)
          .eq("book", book)
          .eq("chapter", chapter)
          .eq("verse", verse);

        if (error) throw error;
      }

      showFeedback("Bookmark removed");
    } catch (error) {
      console.error("Error removing favorite:", error);
      showFeedback("Failed to remove bookmark");
    }
  };

  // Update favorite note
  const updateFavoriteNote = async (
    book: string,
    chapter: string,
    verse: string,
    note: string
  ): Promise<void> => {
    try {
      // Update state first
      setFavorites((prev) => {
        return prev.map((fav) => {
          if (
            fav.book === book &&
            fav.chapter === chapter &&
            fav.verse === verse
          ) {
            return { ...fav, note };
          }
          return fav;
        });
      });

      // If offline, just save to AsyncStorage
      if (offlineMode) {
        showFeedback("Note updated (offline mode)");
        return;
      }

      // Find the favorite's ID
      const favorite = favorites.find(
        (f) => f.book === book && f.chapter === chapter && f.verse === verse
      );

      if (!favorite?.id) {
        showFeedback("Updated locally only");
        return;
      }

      // Update in Supabase
      const { error } = await supabase
        .from("favorites")
        .update({ note })
        .eq("id", favorite.id);

      if (error) throw error;

      showFeedback("Note updated");
    } catch (error) {
      console.error("Error updating favorite note:", error);
      showFeedback("Failed to update note");
    }
  };

  const toggleFavorite = (
    book: string,
    chapter: string,
    verse: string
  ): void => {
    const exists = favorites.some(
      (fav) =>
        fav.book === book && fav.chapter === chapter && fav.verse === verse
    );

    if (exists) {
      removeFavorite(book, chapter, verse);
    } else {
      addFavorite(book, chapter, verse);
    }
  };

  // Function to bookmark entire chapter
  const bookmarkChapter = (book: string, chapter: string): void => {
    const chapterExists = favorites.some(
      (fav) => fav.book === book && fav.chapter === chapter && fav.verse === "0"
    );

    if (chapterExists) {
      removeFavorite(book, chapter, "0");
    } else {
      addFavorite(book, chapter, "0", `${book} chapter ${chapter}`);
      // Animate bookmark action
      animateBookmarkAction();
    }
  };

  // Show feedback based on platform
  const showFeedback = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, we'll use our own toast-like UI or Alert
      Alert.alert("Bible App", message, [{ text: "OK" }], { cancelable: true });
    }
  };

  // Animations for favoriting actions
  const animateFavoriteAction = () => {
    favoriteScale.setValue(1);
    Animated.sequence([
      Animated.timing(favoriteScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(favoriteScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animation for bookmark actions
  const animateBookmarkAction = () => {
    bookmarkPulse.setValue(1);
    Animated.sequence([
      Animated.timing(bookmarkPulse, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bookmarkPulse, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ---------------------
  // Animation for view transitions
  // ---------------------
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    };
  }, [view]);

  // ---------------------
  // THEME & FONTS
  // ---------------------
  const getThemeStyles = useCallback(() => {
    switch (readingTheme) {
      case "sepia":
        return {
          backgroundColor: "#F8F1E3",
          textColor: "#5B4636",
          accentColor: "#8B7355",
          secondaryAccentColor: "#AA8C6D",
          headerColor: "#F2E8D9",
          cardColor: "#F5EEE0",
          cardGradientStart: "#F5EEE0",
          cardGradientEnd: "#EADDCC",
          borderColor: "rgba(139, 115, 85, 0.2)",
          shadowColor: "rgba(139, 115, 85, 0.3)",
          statusBarStyle: "dark-content" as "dark-content" | "light-content",
          pattern: patterns.sepia,
          favoriteColor: "#B97451",
          favoriteIconColor: "#8B4513",
        };
      case "night":
        return {
          backgroundColor: "#121212",
          textColor: "#E1E1E1",
          accentColor: "#7B9EB3",
          secondaryAccentColor: "#506D7F",
          headerColor: "#1E1E1E",
          cardColor: "#262626",
          cardGradientStart: "#262626",
          cardGradientEnd: "#1E1E1E",
          borderColor: "rgba(150, 150, 150, 0.15)",
          shadowColor: "rgba(0, 0, 0, 0.5)",
          statusBarStyle: "light-content" as "dark-content" | "light-content",
          pattern: patterns.night,
          favoriteColor: "#5D8AA8",
          favoriteIconColor: "#A0C8E0",
        };
      case "paper":
      default:
        return {
          backgroundColor: "#FFFFFF",
          textColor: "#333333",
          accentColor: "#4A6FA5",
          secondaryAccentColor: "#6387BD",
          headerColor: "#FFFFFF",
          cardColor: "#F9F9F9",
          cardGradientStart: "#F9F9F9",
          cardGradientEnd: "#F0F0F0",
          borderColor: "rgba(0, 0, 0, 0.1)",
          shadowColor: "rgba(0, 0, 0, 0.15)",
          statusBarStyle: "dark-content" as "dark-content" | "light-content",
          pattern: patterns.paper,
          favoriteColor: "#E91E63",
          favoriteIconColor: "#E91E63",
        };
    }
  }, [readingTheme]);

  const themeStyles = useMemo(() => getThemeStyles(), [getThemeStyles]);

  const getFontSizeStyles = useCallback(() => {
    switch (fontSize) {
      case "small":
        return {
          verseText: 16,
          lineHeight: 24,
          headingSize: 20,
          subheadingSize: 18,
        };
      case "large":
        return {
          verseText: 20,
          lineHeight: 32,
          headingSize: 24,
          subheadingSize: 22,
        };
      case "xlarge":
        return {
          verseText: 22,
          lineHeight: 36,
          headingSize: 26,
          subheadingSize: 24,
        };
      case "medium":
      default:
        return {
          verseText: 18,
          lineHeight: 28,
          headingSize: 22,
          subheadingSize: 20,
        };
    }
  }, [fontSize]);

  const fontSizeStyles = useMemo(
    () => getFontSizeStyles(),
    [getFontSizeStyles]
  );

  // Increase/decrease font
  const increaseFontSize = () => {
    switch (fontSize) {
      case "small":
        setFontSize("medium");
        break;
      case "medium":
        setFontSize("large");
        break;
      case "large":
        setFontSize("xlarge");
        break;
      default:
        break;
    }
  };

  const decreaseFontSize = () => {
    switch (fontSize) {
      case "xlarge":
        setFontSize("large");
        break;
      case "large":
        setFontSize("medium");
        break;
      case "medium":
        setFontSize("small");
        break;
      default:
        break;
    }
  };

  // Toggle reading theme
  const toggleReadingTheme = () => {
    setShowThemeSelector(!showThemeSelector);
  };

  // Set specific reading theme
  const selectReadingTheme = (theme: ReadingTheme) => {
    setReadingTheme(theme);
    setShowThemeSelector(false);
  };

  // ---------------------
  // BIBLE VERSION
  // ---------------------
  const handleVersionSelect = (table: string) => {
    // If a book is selected and it's one of the CPDV‑exclusive ones,
    // prevent switching to a non‑CPDV bible version.
    if (
      selectedBook &&
      CPDVExclusiveBooks.has(selectedBook) &&
      table !== "CPDV_bible"
    ) {
      showFeedback(
        "This book is only available in the CPDV Bible version. Please continue reading on CPDV."
      );
      return;
    }

    setSelectedVersion(table);
    setShowVersionSelector(false);

    // If in verses view, reload verses with the new version.
    if (view === "verses" && selectedBook && selectedChapter) {
      fetchVerses(selectedBook, selectedChapter);
    }
  };

  // ---------------------
  // FILTERING & SEARCH
  // ---------------------
  const getFilteredBooks = useCallback(() => {
    let filteredBooks = allBooks;

    // Add deuterocanonical books for CPDV version only
    if (includesDeuterocanonical(selectedVersion)) {
      if (testament === "old") {
        filteredBooks = [...bibleBooks.oldTestament, ...deuterocanonicalBooks];
      } else if (testament === "new") {
        filteredBooks = bibleBooks.newTestament;
      } else {
        filteredBooks = [
          ...bibleBooks.oldTestament,
          ...deuterocanonicalBooks,
          ...bibleBooks.newTestament,
        ];
      }
    } else {
      // Original code for non-CPDV versions
      if (testament === "old") {
        filteredBooks = bibleBooks.oldTestament;
      } else if (testament === "new") {
        filteredBooks = bibleBooks.newTestament;
      }
    }

    if (searchText) {
      return filteredBooks.filter((book) =>
        book.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    return filteredBooks;
  }, [testament, searchText, selectedVersion]);

  // ---------------------
  // FETCHING CHAPTERS & VERSES
  // ---------------------
  // Get available chapters for a book
  const fetchChapters = async (book: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(selectedVersion)
        .select("chapter")
        .eq("book", book);

      if (error) throw error;

      // Ensure data exists and filter out any undefined/null chapter values
      const chaptersArray = data ? data.map((item: any) => item.chapter) : [];
      const uniqueChapters = Array.from(
        new Set(chaptersArray.filter((ch) => ch != null))
      );

      // Sort chapters numerically (assumes chapter values are numeric strings)
      uniqueChapters.sort((a, b) => parseInt(a) - parseInt(b));

      setChapters(uniqueChapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      showFeedback("Failed to load chapters. Check your connection.");
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  // Get verses for a specific book and chapter
  const fetchVerses = async (book: string, chapter: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(selectedVersion)
        .select("*")
        .eq("book", book)
        .eq("chapter", chapter);

      if (error) throw error;

      // Ensure data is an array and sort verses numerically
      const versesArray = data || [];
      const sortedVerses = versesArray.sort((a, b) => {
        const aNum = parseInt(a.verse) || 0;
        const bNum = parseInt(b.verse) || 0;
        return aNum - bNum;
      });

      setVerses(sortedVerses as BibleVerse[]);

      // Scroll to top when loading new verses
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    } catch (error) {
      console.error("Error fetching verses:", error);
      showFeedback("Failed to load verses. Check your connection.");
      setVerses([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse search queries like "Genesis" or "Genesis 1"
  const parseBookQuery = (query: string): { book: string; chapter?: string; verse?: string } | null => {
    query = query.trim();
    // Iterate over allBooks (defined earlier in your code)
    for (const book of allBooks) {
      if (query.toLowerCase().startsWith(book.toLowerCase())) {
        const remainder = query.substring(book.length).trim();
        if (remainder === "") {
          return { book };
        }
        // Look for chapter and possibly verse (separated by colon or whitespace)
        const parts = remainder.split(/[:\s]+/);
        if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
          const chapter = parts[0];
          let verse = "";
          if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
            verse = parts[1];
          }
          return { book, chapter, verse };
        }
        return { book };
      }
    }
    return null;
  };

  const searchBible = async (
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ): Promise<void> => {
    // First, check if the search query looks like a book/chapter search
    const parsed = parseBookQuery(searchText);
    if (parsed) {
      if (parsed.chapter) {
        // If a chapter is provided (e.g. "Genesis 1"), jump directly to that chapter
        setSelectedBook(parsed.book);
        setSelectedChapter(parsed.chapter);
        fetchVerses(parsed.book, parsed.chapter);
        setView("verses");
        setSearchResults([]); // Clear any verse search results
      } else {
        // If only the book is provided (e.g. "Genesis"), let the books view display it
        setSearchResults([]);
      }
      return;
    }

    // Otherwise, perform a normal verse text search
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from(selectedVersion)
        .select("*")
        .ilike("text", `%${searchText}%`);

      if (error) throw error;

      setSearchResults(data as BibleVerse[]);
    } catch (error) {
      console.error("Error searching Bible:", error);
      showFeedback("Failed to search. Check your connection.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ---------------------
  // HANDLERS
  // ---------------------
  // Handle book selection
  const handleBookSelect = (book: string): void => {
    setSelectedBook(book);
    fetchChapters(book);
    setView("chapters");
  };

  // Handle chapter selection
  const handleChapterSelect = (chapter: string): void => {
    setSelectedChapter(chapter);
    if (selectedBook) {
      fetchVerses(selectedBook, chapter);

      // Add to recently read
      const newRecent: RecentlyReadItem = {
        book: selectedBook,
        chapter: chapter,
        verse: "1",
        lastRead: new Date(),
      };

      // Update recently read, avoid duplicates
      const updatedRecents = [
        newRecent,
        ...recentlyRead.filter(
          (item) => !(item.book === selectedBook && item.chapter === chapter)
        ),
      ].slice(0, 5);

      setRecentlyRead(updatedRecents);
      saveRecentlyRead(updatedRecents);

      setView("verses");
    }
  };

  // Check if a verse is favorited
  const isFavorite = useCallback(
    (book: string, chapter: string, verse: string): boolean => {
      return favorites.some(
        (fav) =>
          fav.book === book && fav.chapter === chapter && fav.verse === verse
      );
    },
    [favorites]
  );

  // Check if a chapter is bookmarked (verse "0" represents entire chapter)
  const isChapterBookmarked = useCallback(
    (book: string, chapter: string): boolean => {
      return favorites.some(
        (fav) =>
          fav.book === book && fav.chapter === chapter && fav.verse === "0"
      );
    },
    [favorites]
  );

  // Go to next/previous chapter
  const goToNextChapter = () => {
    if (!selectedBook || !selectedChapter || chapters.length === 0) return;
    const currentIndex = chapters.indexOf(selectedChapter);
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      handleChapterSelect(nextChapter);
    }
  };

  const goToPrevChapter = () => {
    if (!selectedBook || !selectedChapter || chapters.length === 0) return;
    const currentIndex = chapters.indexOf(selectedChapter);
    if (currentIndex > 0) {
      const prevChapter = chapters[currentIndex - 1];
      handleChapterSelect(prevChapter);
    }
  };

  // Get book initials for chapter view background
  const getBookInitials = (book: string) => {
    return book
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  // Calculate the header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Show favorite details modal
  const openFavoriteDetails = (favorite: FavoriteItem) => {
    setSelectedFavorite(favorite);
    setFavoriteNote(favorite.note || "");
    setShowFavoriteModal(true);
  };

  // Save note and close modal
  const saveFavoriteNote = () => {
    if (selectedFavorite) {
      updateFavoriteNote(
        selectedFavorite.book,
        selectedFavorite.chapter,
        selectedFavorite.verse,
        favoriteNote
      );
    }
    setShowFavoriteModal(false);
  };

  // Group favorites by book or date
  const getGroupedFavorites = useCallback(() => {
    if (favoriteGrouping === "none") {
      return { "All Bookmarks": favorites };
    }

    if (favoriteGrouping === "date") {
      const grouped: { [key: string]: FavoriteItem[] } = {};

      // Group by month and year
      favorites.forEach((fav) => {
        const date = fav.dateAdded;
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        const key = `${month} ${year}`;

        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(fav);
      });

      return grouped;
    }

    // Group by book
    const grouped: { [key: string]: FavoriteItem[] } = {};

    favorites.forEach((fav) => {
      if (!grouped[fav.book]) {
        grouped[fav.book] = [];
      }
      grouped[fav.book].push(fav);
    });

    return grouped;
  }, [favorites, favoriteGrouping]);

  // ---------------------
  // RENDER HELPERS
  // ---------------------

  // Render modals
  const renderModals = () => (
    <>
      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <BlurView
          intensity={readingTheme === "night" ? 20 : 80}
          tint={readingTheme === "night" ? "dark" : "light"}
          style={styles.modal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowThemeSelector(false)}
            activeOpacity={1}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeStyles.cardColor,
                  borderColor: themeStyles.borderColor,
                  shadowColor: themeStyles.shadowColor,
                },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: themeStyles.textColor }]}
              >
                Select Theme
              </Text>
              <View style={styles.themeOptions}>
                {(["paper", "sepia", "night"] as ReadingTheme[]).map(
                  (theme) => (
                    <TouchableOpacity
                      key={theme}
                      style={[
                        styles.themeOption,
                        readingTheme === theme && [
                          styles.activeThemeOption,
                          { borderColor: themeStyles.accentColor },
                        ],
                      ]}
                      onPress={() => selectReadingTheme(theme)}
                    >
                      <View
                        style={[
                          styles.themeIconContainer,
                          {
                            backgroundColor:
                              theme === "night"
                                ? "#333"
                                : theme === "sepia"
                                ? "#E8D8BE"
                                : "#F0F0F0",
                            borderColor:
                              readingTheme === theme
                                ? theme === "night"
                                  ? "#7B9EB3"
                                  : theme === "sepia"
                                  ? "#8B7355"
                                  : "#4A6FA5"
                                : "transparent",
                          },
                        ]}
                      >
                        <Feather
                          name={themeIcons[theme]}
                          size={24}
                          color={
                            theme === "night"
                              ? "#E1E1E1"
                              : theme === "sepia"
                              ? "#5B4636"
                              : "#333333"
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.themeOptionText,
                          {
                            color:
                              readingTheme === theme
                                ? themeStyles.accentColor
                                : themeStyles.textColor,
                          },
                        ]}
                      >
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Version Selector Modal */}
      {showVersionSelector && (
        <BlurView
          intensity={readingTheme === "night" ? 20 : 80}
          tint={readingTheme === "night" ? "dark" : "light"}
          style={styles.modal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowVersionSelector(false)}
            activeOpacity={1}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeStyles.cardColor,
                  borderColor: themeStyles.borderColor,
                  shadowColor: themeStyles.shadowColor,
                },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: themeStyles.textColor }]}
              >
                Select Bible Version
              </Text>
              <View style={styles.themeOptions}>
                {bibleVersions.map((version) => (
                  <TouchableOpacity
                    key={version.table}
                    style={[
                      styles.themeOption,
                      selectedVersion === version.table && [
                        styles.activeThemeOption,
                        { borderColor: themeStyles.accentColor },
                      ],
                    ]}
                    onPress={() => handleVersionSelect(version.table)}
                  >
                    <View
                      style={[
                        styles.themeIconContainer,
                        {
                          backgroundColor: `${themeStyles.accentColor}15`,
                          borderColor:
                            selectedVersion === version.table
                              ? themeStyles.accentColor
                              : "transparent",
                        },
                      ]}
                    >
                      <Feather
                        name="book"
                        size={24}
                        color={
                          selectedVersion === version.table
                            ? themeStyles.accentColor
                            : themeStyles.textColor
                        }
                      />
                    </View>
                    <View style={styles.versionTextContainer}>
                      <Text
                        style={[
                          styles.themeOptionText,
                          {
                            color:
                              selectedVersion === version.table
                                ? themeStyles.accentColor
                                : themeStyles.textColor,
                          },
                        ]}
                      >
                        {version.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Favorite Note Modal */}
      {showFavoriteModal && selectedFavorite && (
        <BlurView
          intensity={readingTheme === "night" ? 20 : 80}
          tint={readingTheme === "night" ? "dark" : "light"}
          style={styles.modal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowFavoriteModal(false)}
            activeOpacity={1}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeStyles.cardColor,
                  borderColor: themeStyles.borderColor,
                  shadowColor: themeStyles.shadowColor,
                  padding: 20,
                  width: width * 0.9,
                },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: themeStyles.textColor }]}
              >
                {selectedFavorite.verse === "0"
                  ? `${selectedFavorite.book} ${selectedFavorite.chapter}`
                  : `${selectedFavorite.book} ${selectedFavorite.chapter}:${selectedFavorite.verse}`}
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,
                  { color: themeStyles.textColor, opacity: 0.7 },
                ]}
              >
                Added on {selectedFavorite.dateAdded.toLocaleDateString()}
              </Text>

              <View
                style={[
                  styles.noteContainer,
                  {
                    backgroundColor: `${themeStyles.cardColor}80`,
                    borderColor: themeStyles.borderColor,
                  },
                ]}
              >
                <Text
                  style={[styles.noteLabel, { color: themeStyles.textColor }]}
                >
                  Note:
                </Text>
                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      color: themeStyles.textColor,
                      backgroundColor:
                        readingTheme === "night" ? "#1A1A1A" : "#F5F5F5",
                    },
                  ]}
                  placeholder="Add a note to this bookmark..."
                  placeholderTextColor={
                    readingTheme === "night"
                      ? "rgba(255, 255, 255, 0.5)"
                      : "rgba(0, 0, 0, 0.5)"
                  }
                  value={favoriteNote}
                  onChangeText={setFavoriteNote}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: "transparent",
                      borderColor: themeStyles.borderColor,
                    },
                  ]}
                  onPress={() => setShowFavoriteModal(false)}
                >
                  <Text style={{ color: themeStyles.textColor }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: themeStyles.favoriteColor,
                    },
                  ]}
                  onPress={saveFavoriteNote}
                >
                  <Text style={{ color: "#FFFFFF" }}>Save Note</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.removeButton,
                  {
                    borderColor: themeStyles.borderColor,
                  },
                ]}
                onPress={() => {
                  removeFavorite(
                    selectedFavorite.book,
                    selectedFavorite.chapter,
                    selectedFavorite.verse
                  );
                  setShowFavoriteModal(false);
                }}
              >
                <Feather name="trash-2" size={16} color="#FF5252" />
                <Text style={{ color: "#FF5252", marginLeft: 8 }}>
                  Remove Bookmark
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </BlurView>
      )}
    </>
  );

  // Render favorites view
  const renderFavoritesView = () => (
    <View style={styles.favoritesContainer}>
      {favoriteLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyles.favoriteColor} />
          <Text style={[styles.loadingText, { color: themeStyles.textColor }]}>
            Loading your bookmarks...
          </Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyFavoritesContainer}>
          <Feather
            name="bookmark"
            size={64}
            color={`${themeStyles.textColor}40`}
            style={styles.emptyFavoritesIcon}
          />
          <Text
            style={[
              styles.emptyFavoritesText,
              { color: themeStyles.textColor },
            ]}
          >
            You don't have any bookmarks yet
          </Text>
          <Text
            style={[
              styles.emptyFavoritesSubtext,
              { color: `${themeStyles.textColor}80` },
            ]}
          >
            Add bookmarks by tapping the bookmark icon while reading
          </Text>
          <TouchableOpacity
            style={[
              styles.emptyFavoritesButton,
              {
                backgroundColor: themeStyles.favoriteColor,
              },
            ]}
            onPress={() => setView("books")}
          >
            <Text style={styles.emptyFavoritesButtonText}>Browse Bible</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Favorites List (Grouped) */}
          {Object.entries(getGroupedFavorites()).map(([group, items]) => (
            <View key={group} style={styles.favoriteGroup}>
              <Text
                style={[
                  styles.favoriteGroupTitle,
                  {
                    color: themeStyles.textColor,
                    fontSize: fontSizeStyles.headingSize - 2,
                  },
                ]}
              >
                {group} ({items.length})
              </Text>

              {items.map((favorite, index) => (
                <TouchableOpacity
                  key={`${favorite.book}-${favorite.chapter}-${favorite.verse}-${index}`}
                  style={[
                    styles.favoriteItem,
                    {
                      backgroundColor: themeStyles.cardColor,
                      borderColor: themeStyles.borderColor,
                      shadowColor: themeStyles.shadowColor,
                    },
                  ]}
                  onPress={() => {
                    // If it's a chapter bookmark (verse "0")
                    if (favorite.verse === "0") {
                      setSelectedBook(favorite.book);
                      setSelectedChapter(favorite.chapter);
                      fetchVerses(favorite.book, favorite.chapter);
                      setView("verses");
                    } else {
                      // If it's a verse bookmark
                      setSelectedBook(favorite.book);
                      setSelectedChapter(favorite.chapter);
                      fetchVerses(favorite.book, favorite.chapter);
                      setView("verses");
                      // We could scroll to the specific verse here if needed
                    }
                  }}
                >
                  <View style={styles.favoriteItemLeft}>
                    <View
                      style={[
                        styles.favoriteIconContainer,
                        {
                          backgroundColor: `${themeStyles.favoriteColor}15`,
                        },
                      ]}
                    >
                      <Feather
                        name={favorite.verse === "0" ? "bookmark" : "heart"}
                        size={20}
                        color={themeStyles.favoriteColor}
                      />
                    </View>
                  </View>

                  <View style={styles.favoriteItemContent}>
                    <Text
                      style={[
                        styles.favoriteItemTitle,
                        {
                          color: themeStyles.textColor,
                          fontSize: fontSizeStyles.subheadingSize - 2,
                        },
                      ]}
                    >
                      {favorite.book} {favorite.chapter}
                      {favorite.verse !== "0" && `:${favorite.verse}`}
                    </Text>

                    {favorite.note ? (
                      <Text
                        style={[
                          styles.favoriteItemNote,
                          {
                            color: `${themeStyles.textColor}80`,
                          },
                        ]}
                      >
                        {favorite.note.length > 50
                          ? favorite.note.substring(0, 47) + "..."
                          : favorite.note}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.favoriteItemDate,
                          {
                            color: `${themeStyles.textColor}60`,
                          },
                        ]}
                      >
                        Added {favorite.dateAdded.toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  <View style={styles.favoriteItemActions}>
                    <TouchableOpacity
                      style={[
                        styles.favoriteAction,
                        {
                          backgroundColor: `${themeStyles.accentColor}10`,
                        },
                      ]}
                      onPress={() => openFavoriteDetails(favorite)}
                    >
                      <Feather
                        name="edit-2"
                        size={16}
                        color={themeStyles.accentColor}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.favoriteAction,
                        {
                          backgroundColor: `${themeStyles.favoriteColor}10`,
                          marginLeft: 8,
                        },
                      ]}
                      onPress={() =>
                        removeFavorite(
                          favorite.book,
                          favorite.chapter,
                          favorite.verse
                        )
                      }
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={themeStyles.favoriteColor}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Render books view
  const renderBooksView = () => (
    <>
      {/* Highlighted Bookmarks Section */}
      {favorites.length > 0 && (
        <View style={styles.highlightedBookmarksSection}>
          <View style={styles.sectionTitleContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: themeStyles.textColor,
                  fontSize: fontSizeStyles.headingSize,
                },
              ]}
            >
              Your Bookmarks
            </Text>

            <TouchableOpacity
              style={[
                styles.viewAllButton,
                { borderColor: themeStyles.borderColor },
              ]}
              onPress={() => setView("favorites")}
            >
              <Text
                style={[
                  styles.viewAllText,
                  { color: themeStyles.favoriteColor },
                ]}
              >
                View All
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={themeStyles.favoriteColor}
              />
            </TouchableOpacity>
          </View>

          <FlatList<FavoriteItem>
            data={favorites.slice(0, 5)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.highlightedBookmark,
                  {
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                    shadowColor: themeStyles.shadowColor,
                  },
                ]}
                onPress={() => {
                  setSelectedBook(item.book);
                  setSelectedChapter(item.chapter);
                  fetchVerses(item.book, item.chapter);
                  setView("verses");
                }}
              >
                <View
                  style={[
                    styles.bookmarkIconContainer,
                    { backgroundColor: `${themeStyles.favoriteColor}15` },
                  ]}
                >
                  <Feather
                    name={item.verse === "0" ? "bookmark" : "heart"}
                    size={18}
                    color={themeStyles.favoriteColor}
                  />
                </View>
                <View style={styles.bookmarkTextContainer}>
                  <Text
                    style={[
                      styles.bookmarkTitle,
                      {
                        color: themeStyles.textColor,
                        fontSize: fontSizeStyles.subheadingSize - 4,
                      },
                    ]}
                  >
                    {item.book} {item.chapter}
                    {item.verse !== "0" && `:${item.verse}`}
                  </Text>

                  {item.note ? (
                    <Text
                      style={[
                        styles.bookmarkNote,
                        { color: `${themeStyles.textColor}80` },
                      ]}
                      numberOfLines={1}
                    >
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.bookmarkArrow,
                    { backgroundColor: themeStyles.favoriteColor },
                  ]}
                >
                  <Feather name="chevron-right" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) =>
              `bookmark-${item.book}-${item.chapter}-${item.verse}-${index}`
            }
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.highlightedBookmarksList}
          />
        </View>
      )}

      {/* Recently Read Section */}
      {recentlyRead.length > 0 && (
        <View style={styles.recentlyReadSection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: themeStyles.textColor,
                fontSize: fontSizeStyles.headingSize,
              },
            ]}
          >
            Continue Reading
          </Text>
          <FlatList<RecentlyReadItem>
            data={recentlyRead}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.recentItem,
                  {
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                    shadowColor: themeStyles.shadowColor,
                  },
                ]}
                onPress={() => {
                  setSelectedBook(item.book);
                  setSelectedChapter(item.chapter);
                  fetchVerses(item.book, item.chapter);
                  setView("verses");
                }}
              >
                <View
                  style={[
                    styles.recentItemIconContainer,
                    {
                      backgroundColor: `${getBookColor(
                        item.book,
                        readingTheme
                      )}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.recentItemIconText,
                      { color: getBookColor(item.book, readingTheme) },
                    ]}
                  >
                    {getBookInitials(item.book)}
                  </Text>
                </View>
                <View style={styles.recentItemContent}>
                  <Text
                    style={[
                      styles.recentItemTitle,
                      {
                        color: themeStyles.textColor,
                        fontSize: fontSizeStyles.subheadingSize - 2,
                      },
                    ]}
                  >
                    {item.book} {item.chapter}
                  </Text>
                  <Text
                    style={[
                      styles.recentItemSubtitle,
                      {
                        color:
                          readingTheme === "night"
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.6)",
                      },
                    ]}
                  >
                    Continue reading
                  </Text>
                </View>
                <View style={styles.recentItemActions}>
                  {isChapterBookmarked(item.book, item.chapter) ? (
                    <TouchableOpacity
                      style={[
                        styles.bookmarkedRecentButton,
                        {
                          backgroundColor: `${themeStyles.favoriteColor}15`,
                        },
                      ]}
                      onPress={() =>
                        toggleFavorite(item.book, item.chapter, "0")
                      }
                    >
                      <Feather
                        name="bookmark"
                        size={16}
                        color={themeStyles.favoriteColor}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.bookmarkRecentButton,
                        {
                          borderColor: themeStyles.borderColor,
                        },
                      ]}
                      onPress={() => bookmarkChapter(item.book, item.chapter)}
                    >
                      <Feather
                        name="bookmark"
                        size={16}
                        color={themeStyles.textColor}
                      />
                    </TouchableOpacity>
                  )}

                  <View
                    style={[
                      styles.recentItemArrow,
                      {
                        backgroundColor: getBookColor(item.book, readingTheme),
                      },
                    ]}
                  >
                    <Feather name="chevron-right" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) =>
              `recent-${item.book}-${item.chapter}-${index}`
            }
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentlyReadList}
          />
        </View>
      )}

      {/* Testament Selector & Books */}
      <View style={styles.booksSection}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: themeStyles.textColor,
              fontSize: fontSizeStyles.headingSize,
            },
          ]}
        >
          Bible Books
        </Text>
        <View style={styles.testamentTabs}>
          <TouchableOpacity
            style={[
              styles.testamentTab,
              testament === "all" && [
                styles.activeTestamentTab,
                { borderColor: themeStyles.accentColor },
              ],
              {
                backgroundColor:
                  testament === "all"
                    ? `${themeStyles.accentColor}20`
                    : themeStyles.cardColor,
                borderColor: themeStyles.borderColor,
              },
            ]}
            onPress={() => setTestament("all")}
          >
            <Text
              style={[
                styles.testamentTabText,
                {
                  color:
                    testament === "all"
                      ? themeStyles.accentColor
                      : themeStyles.textColor,
                  fontWeight: testament === "all" ? "600" : "400",
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.testamentTab,
              testament === "old" && [
                styles.activeTestamentTab,
                { borderColor: themeStyles.accentColor },
              ],
              {
                backgroundColor:
                  testament === "old"
                    ? `${themeStyles.accentColor}20`
                    : themeStyles.cardColor,
                borderColor: themeStyles.borderColor,
              },
            ]}
            onPress={() => setTestament("old")}
          >
            <Text
              style={[
                styles.testamentTabText,
                {
                  color:
                    testament === "old"
                      ? themeStyles.accentColor
                      : themeStyles.textColor,
                  fontWeight: testament === "old" ? "600" : "400",
                },
              ]}
            >
              Old Testament
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.testamentTab,
              testament === "new" && [
                styles.activeTestamentTab,
                { borderColor: themeStyles.accentColor },
              ],
              {
                backgroundColor:
                  testament === "new"
                    ? `${themeStyles.accentColor}20`
                    : themeStyles.cardColor,
                borderColor: themeStyles.borderColor,
              },
            ]}
            onPress={() => setTestament("new")}
          >
            <Text
              style={[
                styles.testamentTabText,
                {
                  color:
                    testament === "new"
                      ? themeStyles.accentColor
                      : themeStyles.textColor,
                  fontWeight: testament === "new" ? "600" : "400",
                },
              ]}
            >
              New Testament
            </Text>
          </TouchableOpacity>
        </View>

        {/* Books List */}
        <FlatList<string>
          data={getFilteredBooks()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.bookItem,
                {
                  backgroundColor: themeStyles.cardColor,
                  borderLeftColor: getBookColor(item, readingTheme),
                  shadowColor: themeStyles.shadowColor,
                },
              ]}
              onPress={() => handleBookSelect(item)}
            >
              <View
                style={[
                  styles.bookItemContent,
                  { borderRightColor: themeStyles.borderColor },
                ]}
              >
                <Text
                  style={[
                    styles.bookItemText,
                    {
                      color: themeStyles.textColor,
                      fontSize: fontSizeStyles.subheadingSize - 2,
                    },
                  ]}
                >
                  {item}
                </Text>
                <Text
                  style={[
                    styles.bookItemCategory,
                    { color: getBookColor(item, readingTheme) },
                  ]}
                >
                  {getBookCategory(item).charAt(0).toUpperCase() +
                    getBookCategory(item).slice(1)}
                </Text>
              </View>
              <View
                style={[
                  styles.bookItemArrow,
                  { backgroundColor: getBookColor(item, readingTheme) },
                ]}
              >
                <Feather name="chevron-right" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `book-${item}`}
          scrollEnabled={false}
          contentContainerStyle={styles.booksList}
        />
      </View>
    </>
  );

  // Render chapters view
  const renderChaptersView = () => (
    <View style={styles.chaptersSection}>
      <View style={styles.chapterHeader}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: themeStyles.textColor,
              fontSize: fontSizeStyles.headingSize,
            },
          ]}
        >
          {selectedBook} - Chapters
        </Text>

        <View
          style={[
            styles.bookIconLarge,
            {
              backgroundColor: `${getBookColor(selectedBook!, readingTheme)}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.bookIconLargeText,
              { color: getBookColor(selectedBook!, readingTheme) },
            ]}
          >
            {getBookInitials(selectedBook!)}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          color={themeStyles.accentColor}
          size="large"
          style={styles.loader}
        />
      ) : (
        <View style={styles.chaptersGrid}>
          {chapters.map((chapter) => (
            <TouchableOpacity
              key={`chapter-${chapter}`}
              style={[
                styles.chapterItem,
                {
                  backgroundColor: themeStyles.cardColor,
                  borderColor: themeStyles.borderColor,
                  shadowColor: themeStyles.shadowColor,
                },
                isChapterBookmarked(selectedBook!, chapter) && {
                  borderColor: themeStyles.favoriteColor,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleChapterSelect(chapter)}
            >
              <Text
                style={[
                  styles.chapterItemText,
                  {
                    color: themeStyles.textColor,
                    fontSize: fontSizeStyles.subheadingSize,
                  },
                  isChapterBookmarked(selectedBook!, chapter) && {
                    color: themeStyles.favoriteColor,
                  },
                ]}
              >
                {chapter}
              </Text>
              {isChapterBookmarked(selectedBook!, chapter) && (
                <View
                  style={[
                    styles.chapterBookmarkIndicator,
                    {
                      backgroundColor: themeStyles.favoriteColor,
                    },
                  ]}
                >
                  <Feather name="bookmark" size={10} color="#FFFFFF" />
                </View>
              )}
              <View
                style={[
                  styles.chapterItemDot,
                  {
                    backgroundColor: isChapterBookmarked(selectedBook!, chapter)
                      ? themeStyles.favoriteColor
                      : getBookColor(selectedBook!, readingTheme),
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Render verses view
  const renderVersesView = () => (
    <View style={styles.versesSection}>
      <View style={styles.versesHeader}>
        <View style={styles.verseNavigation}>
          <TouchableOpacity
            style={[
              styles.verseNavButton,
              {
                opacity: chapters.indexOf(selectedChapter!) > 0 ? 1 : 0.5,
                backgroundColor:
                  chapters.indexOf(selectedChapter!) > 0
                    ? `${themeStyles.accentColor}15`
                    : "transparent",
                borderColor: themeStyles.borderColor,
              },
            ]}
            onPress={goToPrevChapter}
            disabled={chapters.indexOf(selectedChapter!) <= 0}
          >
            <Feather
              name="chevron-left"
              size={20}
              color={themeStyles.accentColor}
            />
            <Text
              style={[styles.verseNavText, { color: themeStyles.accentColor }]}
            >
              Prev
            </Text>
          </TouchableOpacity>

          <View style={styles.fontSizeControls}>
            <TouchableOpacity
              style={[
                styles.fontSizeButton,
                {
                  opacity: fontSize === "small" ? 0.5 : 1,
                  backgroundColor:
                    fontSize !== "small"
                      ? `${themeStyles.accentColor}15`
                      : "transparent",
                  borderColor: themeStyles.borderColor,
                },
              ]}
              onPress={decreaseFontSize}
              disabled={fontSize === "small"}
            >
              <Text
                style={[
                  styles.fontSizeButtonText,
                  { color: themeStyles.accentColor },
                ]}
              >
                A-
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.fontSizeButton,
                {
                  opacity: fontSize === "xlarge" ? 0.5 : 1,
                  backgroundColor:
                    fontSize !== "xlarge"
                      ? `${themeStyles.accentColor}15`
                      : "transparent",
                  borderColor: themeStyles.borderColor,
                },
              ]}
              onPress={increaseFontSize}
              disabled={fontSize === "xlarge"}
            >
              <Text
                style={[
                  styles.fontSizeButtonText,
                  { color: themeStyles.accentColor },
                ]}
              >
                A+
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.verseNavButton,
              {
                opacity:
                  chapters.indexOf(selectedChapter!) < chapters.length - 1
                    ? 1
                    : 0.5,
                backgroundColor:
                  chapters.indexOf(selectedChapter!) < chapters.length - 1
                    ? `${themeStyles.accentColor}15`
                    : "transparent",
                borderColor: themeStyles.borderColor,
              },
            ]}
            onPress={goToNextChapter}
            disabled={chapters.indexOf(selectedChapter!) >= chapters.length - 1}
          >
            <Text
              style={[styles.verseNavText, { color: themeStyles.accentColor }]}
            >
              Next
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={themeStyles.accentColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          color={themeStyles.accentColor}
          size="large"
          style={styles.loader}
        />
      ) : (
        <View style={styles.versesContent}>
          <View
            style={[
              styles.verseDivider,
              { backgroundColor: getBookColor(selectedBook!, readingTheme) },
            ]}
          />

          {verses.map((item) => (
            <View key={`verse-${item.verse}`} style={styles.verseRow}>
              <View
                style={[
                  styles.verseNumberCircle,
                  {
                    backgroundColor: isFavorite(
                      selectedBook!,
                      selectedChapter!,
                      item.verse
                    )
                      ? `${themeStyles.favoriteColor}20`
                      : `${getBookColor(item.book, readingTheme)}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.verseNumber,
                    {
                      color: isFavorite(
                        selectedBook!,
                        selectedChapter!,
                        item.verse
                      )
                        ? themeStyles.favoriteColor
                        : getBookColor(item.book, readingTheme),
                      fontSize: fontSizeStyles.verseText - 4,
                    },
                  ]}
                >
                  {item.verse}
                </Text>
              </View>
              <View style={styles.verseTextContainer}>
                <Text
                  style={[
                    styles.verseText,
                    {
                      color: themeStyles.textColor,
                      fontSize: fontSizeStyles.verseText,
                      lineHeight: fontSizeStyles.lineHeight,
                    },
                  ]}
                  selectable={true}
                >
                  {item.text}
                </Text>
                <Animated.View
                  style={{ transform: [{ scale: favoriteScale }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.favoriteButton,
                      isFavorite(item.book, item.chapter, item.verse) && {
                        backgroundColor: `${themeStyles.favoriteColor}20`,
                      },
                    ]}
                    onPress={() =>
                      toggleFavorite(item.book, item.chapter, item.verse)
                    }
                  >
                    <Feather
                      name="heart"
                      size={16}
                      color={
                        isFavorite(item.book, item.chapter, item.verse)
                          ? themeStyles.favoriteColor
                          : themeStyles.textColor
                      }
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          ))}

          {verses.length > 0 && (
            <View style={styles.chapterEndNavigationContainer}>
              <TouchableOpacity
                style={[
                  styles.chapterEndNavButton,
                  {
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                  },
                ]}
                onPress={goToPrevChapter}
                disabled={chapters.indexOf(selectedChapter!) <= 0}
              >
                <Feather
                  name="chevron-left"
                  size={20}
                  color={
                    chapters.indexOf(selectedChapter!) > 0
                      ? themeStyles.accentColor
                      : `${themeStyles.textColor}40`
                  }
                />
                <Text
                  style={[
                    styles.chapterEndNavText,
                    {
                      color:
                        chapters.indexOf(selectedChapter!) > 0
                          ? themeStyles.accentColor
                          : `${themeStyles.textColor}40`,
                    },
                  ]}
                >
                  Previous Chapter
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chapterEndNavButton,
                  {
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                  },
                ]}
                onPress={goToNextChapter}
                disabled={
                  chapters.indexOf(selectedChapter!) >= chapters.length - 1
                }
              >
                <Text
                  style={[
                    styles.chapterEndNavText,
                    {
                      color:
                        chapters.indexOf(selectedChapter!) < chapters.length - 1
                          ? themeStyles.accentColor
                          : `${themeStyles.textColor}40`,
                    },
                  ]}
                >
                  Next Chapter
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={
                    chapters.indexOf(selectedChapter!) < chapters.length - 1
                      ? themeStyles.accentColor
                      : `${themeStyles.textColor}40`
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Render search results
  const renderSearchResults = () => (
    <View style={styles.searchResultsContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: themeStyles.textColor,
            fontSize: fontSizeStyles.headingSize,
          },
        ]}
      >
        Search Results
      </Text>
      {searching ? (
        <ActivityIndicator color={themeStyles.accentColor} />
      ) : (
        <FlatList<BibleVerse>
          data={searchResults}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.searchResultItem,
                {
                  backgroundColor: themeStyles.cardColor,
                  borderLeftColor: getBookColor(item.book, readingTheme),
                  shadowColor: themeStyles.shadowColor,
                },
              ]}
              onPress={() => {
                setSelectedBook(item.book);
                setSelectedChapter(item.chapter);
                fetchVerses(item.book, item.chapter);
                setView("verses");
              }}
            >
              <View
                style={[
                  styles.searchResultHeader,
                  { borderBottomColor: themeStyles.borderColor },
                ]}
              >
                <Text
                  style={[
                    styles.searchResultLocation,
                    { color: getBookColor(item.book, readingTheme) },
                  ]}
                >
                  {item.book} {item.chapter}:{item.verse}
                </Text>
                <Animated.View
                  style={{ transform: [{ scale: favoriteScale }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.favoriteButton,
                      isFavorite(item.book, item.chapter, item.verse) && {
                        backgroundColor: `${themeStyles.favoriteColor}20`,
                      },
                    ]}
                    onPress={() =>
                      toggleFavorite(item.book, item.chapter, item.verse)
                    }
                  >
                    <Feather
                      name="heart"
                      size={18}
                      color={
                        isFavorite(item.book, item.chapter, item.verse)
                          ? themeStyles.favoriteColor
                          : themeStyles.textColor
                      }
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Text
                style={[
                  styles.searchResultText,
                  {
                    color: themeStyles.textColor,
                    fontSize: fontSizeStyles.verseText,
                    lineHeight: fontSizeStyles.lineHeight,
                  },
                ]}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) =>
            `search-${item.book}-${item.chapter}-${item.verse}-${index}`
          }
          contentContainerStyle={styles.searchResultsList}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  // ---------------------
  // MAIN RENDER
  // ---------------------
  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: themeStyles.backgroundColor },
      ]}
    >
      <StatusBar barStyle={themeStyles.statusBarStyle} />

      {/* Background Pattern */}
      <Image
        source={{ uri: themeStyles.pattern }}
        style={styles.backgroundPattern}
        resizeMode="repeat"
      />

      <View style={[styles.container, { backgroundColor: "transparent" }]}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              backgroundColor: themeStyles.headerColor,
              borderBottomColor: themeStyles.borderColor,
              shadowColor: themeStyles.shadowColor,
            },
            view === "verses" && {
              shadowOpacity: headerOpacity,
              borderBottomWidth: 0,
            },
          ]}
        >
          <View style={styles.headerContent}>
            {/* Back or Bible icon */}
            {view !== "books" ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut
                  );
                  if (view === "verses") {
                    setView("chapters");
                  } else if (view === "favorites") {
                    setView("books");
                  } else {
                    setView("books");
                    setSelectedBook(null);
                  }
                }}
              >
                <Feather
                  name="arrow-left"
                  size={24}
                  color={themeStyles.accentColor}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.bibleIcon}>
                <Feather
                  name="book-open"
                  size={24}
                  color={themeStyles.accentColor}
                />
              </View>
            )}

            <Text
              style={[
                styles.headerTitle,
                {
                  color: themeStyles.textColor,
                  fontSize: fontSizeStyles.headingSize,
                },
              ]}
            >
              {view === "books"
                ? "Bible"
                : view === "chapters"
                ? selectedBook
                : view === "favorites"
                ? "My Bookmarks"
                : `${selectedBook} ${selectedChapter}`}
            </Text>

            <View style={styles.headerButtons}>
              {/* If in verses view, show a bookmark button for the chapter */}
              {view === "verses" && (
                <Animated.View
                  style={{ transform: [{ scale: bookmarkPulse }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.headerButton,
                      isChapterBookmarked(selectedBook!, selectedChapter!) && [
                        styles.activeHeaderButton,
                        { backgroundColor: `${themeStyles.favoriteColor}20` },
                      ],
                    ]}
                    onPress={() =>
                      bookmarkChapter(selectedBook!, selectedChapter!)
                    }
                  >
                    <Feather
                      name="bookmark"
                      size={22}
                      color={
                        isChapterBookmarked(selectedBook!, selectedChapter!)
                          ? themeStyles.favoriteColor
                          : themeStyles.textColor
                      }
                    />
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Favorites Button - Show in all views except favorites view */}
              {view !== "favorites" && (
                <TouchableOpacity
                  style={[
                    styles.headerButton,
                    { backgroundColor: `${themeStyles.favoriteColor}10` },
                  ]}
                  onPress={() => {
                    // Save current view state if needed
                    setView("favorites");
                  }}
                >
                  <Feather
                    name="bookmark"
                    size={22}
                    color={themeStyles.favoriteColor}
                  />
                </TouchableOpacity>
              )}

              {/* Version Selector Button */}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowVersionSelector(true)}
              >
                <Feather
                  name="layers"
                  size={22}
                  color={themeStyles.accentColor}
                />
              </TouchableOpacity>

              {/* Theme Selector Button */}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleReadingTheme}
              >
                <Feather
                  name={readingTheme === "night" ? "moon" : "sun"}
                  size={22}
                  color={themeStyles.accentColor}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Render Modals */}
        {renderModals()}

        {/* Search Bar (only visible in books view) */}
        {view === "books" && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: themeStyles.cardColor,
                borderColor: themeStyles.borderColor,
                shadowColor: themeStyles.shadowColor,
              },
            ]}
          >
            <Feather
              name="search"
              size={20}
              color={themeStyles.accentColor}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: themeStyles.textColor }]}
              placeholder="Search books or verses..."
              placeholderTextColor={
                readingTheme === "night"
                  ? "rgba(255, 255, 255, 0.5)"
                  : "rgba(0, 0, 0, 0.5)"
              }
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={searchBible}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchText("");
                  setSearchResults([]);
                }}
              >
                <Feather name="x" size={20} color={themeStyles.textColor} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Favorites View Header with Filter Options */}
        {view === "favorites" && (
          <View
            style={[
              styles.favoritesFilterContainer,
              {
                backgroundColor: themeStyles.cardColor,
                borderColor: themeStyles.borderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.favoritesFilterLabel,
                { color: themeStyles.textColor },
              ]}
            >
              Group by:
            </Text>
            <View style={styles.favoritesFilterButtons}>
              <TouchableOpacity
                style={[
                  styles.favoritesFilterButton,
                  favoriteGrouping === "book" && [
                    styles.activeFavoritesFilterButton,
                    { backgroundColor: `${themeStyles.favoriteColor}20` },
                  ],
                ]}
                onPress={() => setFavoriteGrouping("book")}
              >
                <Text
                  style={[
                    styles.favoritesFilterButtonText,
                    {
                      color:
                        favoriteGrouping === "book"
                          ? themeStyles.favoriteColor
                          : themeStyles.textColor,
                    },
                  ]}
                >
                  Book
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.favoritesFilterButton,
                  favoriteGrouping === "date" && [
                    styles.activeFavoritesFilterButton,
                    { backgroundColor: `${themeStyles.favoriteColor}20` },
                  ],
                ]}
                onPress={() => setFavoriteGrouping("date")}
              >
                <Text
                  style={[
                    styles.favoritesFilterButtonText,
                    {
                      color:
                        favoriteGrouping === "date"
                          ? themeStyles.favoriteColor
                          : themeStyles.textColor,
                    },
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.favoritesFilterButton,
                  favoriteGrouping === "none" && [
                    styles.activeFavoritesFilterButton,
                    { backgroundColor: `${themeStyles.favoriteColor}20` },
                  ],
                ]}
                onPress={() => setFavoriteGrouping("none")}
              >
                <Text
                  style={[
                    styles.favoritesFilterButtonText,
                    {
                      color:
                        favoriteGrouping === "none"
                          ? themeStyles.favoriteColor
                          : themeStyles.textColor,
                    },
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Animated.ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {/* Search Results */}
          {searchResults.length > 0 &&
            view === "books" &&
            renderSearchResults()}

          {/* FAVORITES VIEW */}
          {view === "favorites" && renderFavoritesView()}

          {/* BOOKS VIEW */}
          {view === "books" && searchResults.length === 0 && renderBooksView()}

          {/* CHAPTERS VIEW */}
          {view === "chapters" && renderChaptersView()}

          {/* VERSES VIEW */}
          {view === "verses" && renderVersesView()}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    padding: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  bibleIcon: {
    padding: 8,
  },
  headerTitle: {
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
  },
  activeHeaderButton: {
    borderWidth: 1,
  },
  modal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  themeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  themeOption: {
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    width: "30%",
  },
  activeThemeOption: {
    borderWidth: 2,
  },
  themeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  versionTextContainer: {
    alignItems: "center",
    position: "relative",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
  },
  clearButton: {
    padding: 8,
  },
  newBadge: {
    position: "absolute",
    top: -8,
    right: -15,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#E91E63",
  },
  newBadgeText: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
  },
  favoritesFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  favoritesFilterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  favoritesFilterButtons: {
    flexDirection: "row",
  },
  favoritesFilterButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  activeFavoritesFilterButton: {
    borderWidth: 2,
  },
  favoritesFilterButtonText: {
    fontSize: 14,
  },
  searchResultsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  searchResultsList: {
    paddingBottom: 10,
  },
  searchResultItem: {
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  searchResultLocation: {
    fontWeight: "bold",
  },
  searchResultText: {
    fontSize: 16,
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 8,
  },
  favoritesContainer: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyFavoritesContainer: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyFavoritesIcon: {
    marginBottom: 20,
  },
  emptyFavoritesText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptyFavoritesSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  emptyFavoritesButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyFavoritesButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  favoriteGroup: {
    marginBottom: 20,
  },
  favoriteGroupTitle: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteItemLeft: {
    marginRight: 10,
  },
  favoriteIconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  favoriteItemContent: {
    flex: 1,
  },
  favoriteItemTitle: {
    fontWeight: "bold",
  },
  favoriteItemNote: {
    marginTop: 2,
    fontSize: 14,
  },
  favoriteItemDate: {
    marginTop: 2,
    fontSize: 12,
  },
  favoriteItemActions: {
    flexDirection: "row",
  },
  favoriteAction: {
    padding: 8,
    borderRadius: 8,
  },
  highlightedBookmarksSection: {
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewAllText: {
    marginRight: 4,
  },
  highlightedBookmarksList: {
    paddingBottom: 10,
  },
  highlightedBookmark: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    width: 220,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookmarkIconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  bookmarkTextContainer: {
    flex: 1,
  },
  bookmarkTitle: {
    fontWeight: "bold",
  },
  bookmarkNote: {
    fontSize: 14,
  },
  bookmarkArrow: {
    padding: 8,
    borderRadius: 8,
  },
  recentlyReadSection: {
    padding: 16,
  },
  recentlyReadList: {
    paddingRight: 16,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    width: 250,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentItemIconContainer: {
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  recentItemIconText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontWeight: "bold",
  },
  recentItemSubtitle: {
    fontSize: 14,
  },
  recentItemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarkedRecentButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  bookmarkRecentButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
  },
  recentItemArrow: {
    padding: 8,
    borderRadius: 8,
  },
  booksSection: {
    padding: 16,
  },
  testamentTabs: {
    flexDirection: "row",
    marginBottom: 10,
  },
  testamentTab: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    marginRight: 10,
  },
  activeTestamentTab: {
    borderWidth: 2,
  },
  testamentTabText: {
    fontSize: 14,
  },
  booksList: {
    paddingBottom: 10,
  },
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookItemContent: {
    flex: 1,
    borderRightWidth: 1,
    paddingRight: 10,
  },
  bookItemText: {
    fontWeight: "bold",
  },
  bookItemCategory: {
    fontSize: 14,
  },
  bookItemArrow: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  chaptersSection: {
    padding: 16,
  },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bookIconLarge: {
    padding: 16,
    borderRadius: 8,
  },
  bookIconLargeText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  loader: {
    marginTop: 20,
    marginBottom: 20,
  },
  chaptersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  chapterItem: {
    width: "30%",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: "center",
    position: "relative",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chapterItemText: {
    fontWeight: "bold",
  },
  chapterBookmarkIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 8,
  },
  chapterItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  versesSection: {
    padding: 16,
  },
  versesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  verseNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  verseNavButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  verseNavText: {
    fontWeight: "bold",
    marginLeft: 4,
    marginRight: 4,
  },
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  fontSizeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
  },
  fontSizeButtonText: {
    fontWeight: "bold",
  },
  versesContent: {
    paddingBottom: 40,
  },
  verseDivider: {
    height: 2,
    marginBottom: 10,
  },
  verseRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  verseNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  verseNumber: {
    fontWeight: "bold",
  },
  verseTextContainer: {
    flex: 1,
    flexDirection: "row",
  },
  verseText: {
    flex: 1,
    marginRight: 8,
  },
  noteContainer: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  noteLabel: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  noteInput: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 20,
  },
  chapterEndNavigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  chapterEndNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 5,
  },
  chapterEndNavText: {
    fontWeight: "500",
    marginHorizontal: 4,
  },
});
