import React, { useState, useEffect, useRef } from "react";
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
  UIManager
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient"; // Updated path to Supabase client
import { BlurView } from 'expo-blur'; // You'll need to install this package

// Enable layout animation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
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
  book: string;
  chapter: string;
  verse: string;
  dateAdded: Date;
}

// Bible view types
type BibleView = "books" | "chapters" | "verses";

// Reading theme types
type ReadingTheme = "paper" | "sepia" | "night";

// Font size options
type FontSize = "small" | "medium" | "large" | "xlarge";

// Biblical books in order with testament grouping
const bibleBooks = {
  oldTestament: [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", 
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", 
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
    "Haggai", "Zechariah", "Malachi"
  ],
  newTestament: [
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
    "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
    "Jude", "Revelation"
  ]
};

// All books combined for search and display
const allBooks = [...bibleBooks.oldTestament, ...bibleBooks.newTestament];

// Background patterns for each theme (SVG patterns)
const patterns = {
  paper: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBmaWxsPSIjRjVGNUY1IiBkPSJNMCAwaDIwdjIwSDB6Ii8+PHBhdGggZmlsbD0iI0Y1RjVGNSIgZD0iTTIwIDIwaDIwdjIwSDIweiIvPjwvZz48L3N2Zz4=',
  sepia: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiNGOEYxRTMiIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBmaWxsPSIjRjFFOUQ2IiBkPSJNMCAwaDIwdjIwSDB6Ii8+PHBhdGggZmlsbD0iI0YxRTlENiIgZD0iTTIwIDIwaDIwdjIwSDIweiIvPjwvZz48L3N2Zz4=',
  night: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiMxMjEyMTIiIGQ9Ik0wIDBoMjB2MjBIMHoiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIwLjUiIGZpbGw9IiMyQTJBMkEiLz48L2c+PC9zdmc+'
};

// Theme icons from Feather
const themeIcons: { [key in ReadingTheme]: "sun" | "book-open" | "moon" } = {
  paper: "sun",
  sepia: "book-open",
  night: "moon"
};

// Book category icons from Feather
const categoryIcons = {
  law: "book",
  history: "archive",
  wisdom: "feather",
  prophets: "message-circle",
  gospels: "heart",
  letters: "mail"
};

// Get book category
const getBookCategory = (book: string) => {
  const lawBooks = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"];
  const historyBooks = ["Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", 
                     "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther"];
  const wisdomBooks = ["Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon"];
  const prophetBooks = ["Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", 
                     "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", 
                     "Zephaniah", "Haggai", "Zechariah", "Malachi"];
  const gospelsAndActs = ["Matthew", "Mark", "Luke", "John", "Acts"];
  
  if (lawBooks.includes(book)) return "law";
  if (historyBooks.includes(book)) return "history";
  if (wisdomBooks.includes(book)) return "wisdom";
  if (prophetBooks.includes(book)) return "prophets";
  if (gospelsAndActs.includes(book)) return "gospels";
  return "letters";
};

// Get color for book category
const getBookColor = (book: string, theme: ReadingTheme) => {
  const category = getBookCategory(book);
  
  const colors = {
    paper: {
      law: '#4A6FA5',
      history: '#3D7D91',
      wisdom: '#6A8A39',
      prophets: '#8E5B4F',
      gospels: '#6A478F',
      letters: '#92624D'
    },
    sepia: {
      law: '#8B5A2B',
      history: '#7F693B',
      wisdom: '#6B5D39',
      prophets: '#7D513A',
      gospels: '#7A503E',
      letters: '#6F5746'
    },
    night: {
      law: '#7B9EB3',
      history: '#7BA3A3',
      wisdom: '#8B9E7B',
      prophets: '#A48999',
      gospels: '#8F8CB3',
      letters: '#9A9283'
    }
  };
  
  return colors[theme][category];
};

export default function BibleScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State management
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [view, setView] = useState<BibleView>("books");
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("paper");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [testament, setTestament] = useState<"all" | "old" | "new">("all");
  const [showThemeSelector, setShowThemeSelector] = useState<boolean>(false);
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadItem[]>([
    { book: "John", chapter: "3", verse: "16", lastRead: new Date() },
    { book: "Psalms", chapter: "23", verse: "1", lastRead: new Date(Date.now() - 86400000) }
  ]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    { book: "Philippians", chapter: "4", verse: "13", dateAdded: new Date() }
  ]);

  // Animation for view transitions
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

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (readingTheme) {
      case 'sepia':
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
          pattern: patterns.sepia
        };
      case 'night':
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
          pattern: patterns.night
        };
      case 'paper':
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
          pattern: patterns.paper
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Font size styles
  const getFontSizeStyles = () => {
    switch (fontSize) {
      case 'small':
        return {
          verseText: 16,
          lineHeight: 24,
          headingSize: 20,
          subheadingSize: 18
        };
      case 'large':
        return {
          verseText: 20,
          lineHeight: 32,
          headingSize: 24,
          subheadingSize: 22
        };
      case 'xlarge':
        return {
          verseText: 22,
          lineHeight: 36,
          headingSize: 26,
          subheadingSize: 24
        };
      case 'medium':
      default:
        return {
          verseText: 18,
          lineHeight: 28,
          headingSize: 22,
          subheadingSize: 20
        };
    }
  };

  const fontSizeStyles = getFontSizeStyles();

  // Increment font size
  const increaseFontSize = () => {
    switch (fontSize) {
      case 'small':
        setFontSize('medium');
        break;
      case 'medium':
        setFontSize('large');
        break;
      case 'large':
        setFontSize('xlarge');
        break;
      default:
        break;
    }
  };

  // Decrement font size
  const decreaseFontSize = () => {
    switch (fontSize) {
      case 'xlarge':
        setFontSize('large');
        break;
      case 'large':
        setFontSize('medium');
        break;
      case 'medium':
        setFontSize('small');
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

  // Filter books based on testament and search
  const getFilteredBooks = () => {
    let filteredBooks = allBooks;
    
    if (testament === "old") {
      filteredBooks = bibleBooks.oldTestament;
    } else if (testament === "new") {
      filteredBooks = bibleBooks.newTestament;
    }
    
    if (searchText) {
      return filteredBooks.filter(book => 
        book.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    return filteredBooks;
  };

  // Get available chapters for a book
  const fetchChapters = async (book: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ASV_bible')
        .select('chapter')
        .eq('book', book);
      
      if (error) throw error;
      
      // Get unique chapters
      const uniqueChapters = [...new Set(data.map(item => item.chapter))];
      
      // Sort chapters numerically
      uniqueChapters.sort((a, b) => parseInt(a) - parseInt(b));
      
      setChapters(uniqueChapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get verses for a specific book and chapter
  const fetchVerses = async (book: string, chapter: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ASV_bible')
        .select('*')
        .eq('book', book)
        .eq('chapter', chapter);
      
      if (error) throw error;
      
      // Sort verses numerically
      const sortedVerses = [...data].sort((a, b) => parseInt(a.verse) - parseInt(b.verse));
      
      setVerses(sortedVerses as BibleVerse[]);
      
      // Scroll to top when loading new verses
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    } catch (error) {
      console.error('Error fetching verses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search the Bible
  const searchBible = async (): Promise<void> => {
    if (!searchText || searchText.length < 2) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('ASV_bible')
        .select('*')
        .textSearch('text', searchText)
        .limit(20);
      
      if (error) throw error;
      
      setSearchResults(data as BibleVerse[]);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

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
        lastRead: new Date()
      };
      
      // Update recently read, avoid duplicates
      setRecentlyRead(prev => {
        const filteredList = prev.filter(item => 
          !(item.book === selectedBook && item.chapter === chapter)
        );
        return [newRecent, ...filteredList].slice(0, 5);
      });
      
      setView("verses");
    }
  };

  // Toggle favorite
  const toggleFavorite = (book: string, chapter: string, verse: string): void => {
    const existingIndex = favorites.findIndex(
      fav => fav.book === book && fav.chapter === chapter && fav.verse === verse
    );
    
    if (existingIndex >= 0) {
      setFavorites(favorites.filter((_, i) => i !== existingIndex));
    } else {
      setFavorites([
        ...favorites, 
        { book, chapter, verse, dateAdded: new Date() }
      ]);
    }
  };

  // Check if a verse is favorited
  const isFavorite = (book: string, chapter: string, verse: string): boolean => {
    return favorites.some(
      fav => fav.book === book && fav.chapter === chapter && fav.verse === verse
    );
  };

  // Go to the next chapter
  const goToNextChapter = () => {
    if (!selectedBook || !selectedChapter || chapters.length === 0) return;
    
    const currentIndex = chapters.indexOf(selectedChapter);
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      handleChapterSelect(nextChapter);
    }
  };

  // Go to the previous chapter
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
    return book.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Calculate the header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.backgroundColor }]}>
      <StatusBar barStyle={themeStyles.statusBarStyle} />
      
      {/* Background Pattern */}
      <Image 
        source={{ uri: themeStyles.pattern }}
        style={styles.backgroundPattern}
        resizeMode="repeat"
      />
      
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header, 
            { 
              backgroundColor: themeStyles.headerColor,
              borderBottomColor: themeStyles.borderColor,
              shadowColor: themeStyles.shadowColor
            },
            view === "verses" && { 
              shadowOpacity: headerOpacity, 
              borderBottomWidth: 0
            }
          ]}
        >
          <View style={styles.headerContent}>
            {view !== "books" ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  if (view === "verses") {
                    setView("chapters");
                  } else {
                    setView("books");
                    setSelectedBook(null);
                  }
                }}
              >
                <Feather name="arrow-left" size={24} color={themeStyles.accentColor} />
              </TouchableOpacity>
            ) : (
              <View style={styles.bibleIcon}>
                <Feather name="book-open" size={24} color={themeStyles.accentColor} />
              </View>
            )}
            
            <Text style={[styles.headerTitle, { 
              color: themeStyles.textColor, 
              fontSize: fontSizeStyles.headingSize
            }]}>
              {view === "books" 
                ? "ASV Bible" 
                : view === "chapters" 
                  ? selectedBook 
                  : `${selectedBook} ${selectedChapter}`}
            </Text>
            
            <View style={styles.headerButtons}>
              {view === "verses" && (
                <TouchableOpacity 
                  style={[
                    styles.headerButton,
                    isFavorite(selectedBook!, selectedChapter!, "1") && 
                      [styles.activeHeaderButton, { backgroundColor: `${themeStyles.accentColor}20` }]
                  ]}
                  onPress={() => toggleFavorite(selectedBook!, selectedChapter!, "1")}
                >
                  <Feather 
                    name={isFavorite(selectedBook!, selectedChapter!, "1") ? "bookmark" : "bookmark"} 
                    size={22} 
                    color={isFavorite(selectedBook!, selectedChapter!, "1") ? themeStyles.accentColor : themeStyles.textColor} 
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleReadingTheme}
              >
                <Feather 
                  name={readingTheme === 'night' ? 'moon' : 'sun'} 
                  size={22} 
                  color={themeStyles.accentColor} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Theme Selector Modal */}
        {showThemeSelector && (
          <BlurView
            intensity={readingTheme === 'night' ? 20 : 80}
            tint={readingTheme === 'night' ? 'dark' : 'light'}
            style={styles.themeModal}
          >
            <TouchableOpacity 
              style={styles.themeModalOverlay}
              onPress={() => setShowThemeSelector(false)}
              activeOpacity={1}
            >
              <View 
                style={[
                  styles.themeModalContent,
                  { 
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                    shadowColor: themeStyles.shadowColor
                  }
                ]}
              >
                <Text style={[styles.themeModalTitle, { color: themeStyles.textColor }]}>
                  Select Theme
                </Text>
                <View style={styles.themeOptions}>
                  {['paper', 'sepia', 'night'].map((theme) => (
                    <TouchableOpacity
                      key={theme}
                      style={[
                        styles.themeOption,
                        readingTheme === theme && [
                          styles.activeThemeOption, 
                          { borderColor: themeStyles.accentColor }
                        ]
                      ]}
                      onPress={() => selectReadingTheme(theme as ReadingTheme)}
                    >
                      <View style={[styles.themeIconContainer, { 
                        backgroundColor: theme === 'night' ? '#333' : theme === 'sepia' ? '#E8D8BE' : '#F0F0F0',
                        borderColor: readingTheme === theme ? 
                          (theme === 'night' ? '#7B9EB3' : theme === 'sepia' ? '#8B7355' : '#4A6FA5') : 'transparent'
                      }]}>
                        <Feather 
                          name={themeIcons[theme as ReadingTheme]} 
                          size={24} 
                          color={theme === 'night' ? '#E1E1E1' : theme === 'sepia' ? '#5B4636' : '#333333'} 
                        />
                      </View>
                      <Text style={[
                        styles.themeOptionText, 
                        { 
                          color: readingTheme === theme 
                            ? themeStyles.accentColor 
                            : themeStyles.textColor 
                        }
                      ]}>
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Search Bar (only visible in books view) */}
        {view === "books" && (
          <View style={[styles.searchContainer, { 
            backgroundColor: themeStyles.cardColor, 
            borderColor: themeStyles.borderColor,
            shadowColor: themeStyles.shadowColor
          }]}>
            <Feather name="search" size={20} color={themeStyles.accentColor} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: themeStyles.textColor }]}
              placeholder="Search books or verses..."
              placeholderTextColor={readingTheme === 'night' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
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
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={[styles.sectionTitle, { 
                color: themeStyles.textColor,
                fontSize: fontSizeStyles.headingSize
              }]}>
                Search Results
              </Text>
              {searching ? (
                <ActivityIndicator color={themeStyles.accentColor} />
              ) : (
                <FlatList<BibleVerse>
                  data={searchResults}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.searchResultItem, { 
                        backgroundColor: themeStyles.cardColor,
                        borderLeftColor: getBookColor(item.book, readingTheme),
                        shadowColor: themeStyles.shadowColor
                      }]}
                      onPress={() => {
                        setSelectedBook(item.book);
                        setSelectedChapter(item.chapter);
                        fetchVerses(item.book, item.chapter);
                        setView("verses");
                      }}
                    >
                      <View style={[styles.searchResultHeader, { borderBottomColor: themeStyles.borderColor }]}>
                        <Text style={[styles.searchResultLocation, { color: getBookColor(item.book, readingTheme) }]}>
                          {item.book} {item.chapter}:{item.verse}
                        </Text>
                        <TouchableOpacity 
                          style={[
                            styles.favoriteButton,
                            isFavorite(item.book, item.chapter, item.verse) && 
                              { backgroundColor: `${themeStyles.accentColor}20` }
                          ]}
                          onPress={() => toggleFavorite(item.book, item.chapter, item.verse)}
                        >
                          <Feather 
                            name={isFavorite(item.book, item.chapter, item.verse) ? "heart" : "heart"} 
                            size={18} 
                            color={isFavorite(item.book, item.chapter, item.verse) ? themeStyles.accentColor : themeStyles.textColor} 
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.searchResultText, { 
                        color: themeStyles.textColor,
                        fontSize: fontSizeStyles.verseText,
                        lineHeight: fontSizeStyles.lineHeight,
                      }]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item, index) => `search-${item.book}-${item.chapter}-${item.verse}-${index}`}
                  contentContainerStyle={styles.searchResultsList}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}

          {/* Content based on current view */}
          {view === "books" && searchResults.length === 0 && (
            <>
              {/* Recently Read Section */}
              {recentlyRead.length > 0 && (
                <View style={styles.recentlyReadSection}>
                  <Text style={[styles.sectionTitle, { 
                    color: themeStyles.textColor,
                    fontSize: fontSizeStyles.headingSize
                  }]}>
                    Continue Reading
                  </Text>
                  <FlatList<RecentlyReadItem>
                    data={recentlyRead}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.recentItem, { 
                          backgroundColor: themeStyles.cardColor,
                          borderColor: themeStyles.borderColor,
                          shadowColor: themeStyles.shadowColor
                        }]}
                        onPress={() => {
                          setSelectedBook(item.book);
                          setSelectedChapter(item.chapter);
                          fetchVerses(item.book, item.chapter);
                          setView("verses");
                        }}
                      >
                        <View style={[
                          styles.recentItemIconContainer, 
                          { backgroundColor: `${getBookColor(item.book, readingTheme)}20` }
                        ]}>
                          <Text style={[
                            styles.recentItemIconText, 
                            { color: getBookColor(item.book, readingTheme) }
                          ]}>
                            {getBookInitials(item.book)}
                          </Text>
                        </View>
                        <View style={styles.recentItemContent}>
                          <Text style={[styles.recentItemTitle, { 
                            color: themeStyles.textColor,
                            fontSize: fontSizeStyles.subheadingSize - 2
                          }]}>
                            {item.book} {item.chapter}
                          </Text>
                          <Text style={[styles.recentItemSubtitle, { 
                            color: readingTheme === 'night' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)" 
                          }]}>
                            Continue reading
                          </Text>
                        </View>
                        <View style={[styles.recentItemArrow, { backgroundColor: getBookColor(item.book, readingTheme) }]}>
                          <Feather name="chevron-right" size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item, index) => `recent-${item.book}-${item.chapter}-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentlyReadList}
                  />
                </View>
              )}

              {/* Testament Selector */}
              <View style={styles.booksSection}>
                <Text style={[styles.sectionTitle, { 
                  color: themeStyles.textColor,
                  fontSize: fontSizeStyles.headingSize 
                }]}>
                  Bible Books
                </Text>
                <View style={styles.testamentTabs}>
                  <TouchableOpacity 
                    style={[
                      styles.testamentTab, 
                      testament === "all" && [styles.activeTestamentTab, { borderColor: themeStyles.accentColor }],
                      { 
                        backgroundColor: testament === "all" 
                          ? `${themeStyles.accentColor}20`
                          : themeStyles.cardColor,
                        borderColor: themeStyles.borderColor
                      }
                    ]}
                    onPress={() => setTestament("all")}
                  >
                    <Text style={[
                      styles.testamentTabText, 
                      { 
                        color: testament === "all" ? themeStyles.accentColor : themeStyles.textColor,
                        fontWeight: testament === "all" ? "600" : "400"
                      }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.testamentTab, 
                      testament === "old" && [styles.activeTestamentTab, { borderColor: themeStyles.accentColor }],
                      { 
                        backgroundColor: testament === "old" 
                          ? `${themeStyles.accentColor}20`
                          : themeStyles.cardColor,
                        borderColor: themeStyles.borderColor
                      }
                    ]}
                    onPress={() => setTestament("old")}
                  >
                    <Text style={[
                      styles.testamentTabText, 
                      { 
                        color: testament === "old" ? themeStyles.accentColor : themeStyles.textColor,
                        fontWeight: testament === "old" ? "600" : "400"
                      }
                    ]}>
                      Old Testament
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.testamentTab, 
                      testament === "new" && [styles.activeTestamentTab, { borderColor: themeStyles.accentColor }],
                      { 
                        backgroundColor: testament === "new" 
                          ? `${themeStyles.accentColor}20`
                          : themeStyles.cardColor,
                        borderColor: themeStyles.borderColor
                      }
                    ]}
                    onPress={() => setTestament("new")}
                  >
                    <Text style={[
                      styles.testamentTabText, 
                      { 
                        color: testament === "new" ? themeStyles.accentColor : themeStyles.textColor,
                        fontWeight: testament === "new" ? "600" : "400"
                      }
                    ]}>
                      New Testament
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Books List */}
                <FlatList<string>
                  data={getFilteredBooks()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.bookItem, { 
                        backgroundColor: themeStyles.cardColor,
                        borderLeftColor: getBookColor(item, readingTheme),
                        shadowColor: themeStyles.shadowColor
                      }]}
                      onPress={() => handleBookSelect(item)}
                    >
                      <View style={[styles.bookItemContent, { borderRightColor: themeStyles.borderColor }]}>
                        <Text style={[styles.bookItemText, { 
                          color: themeStyles.textColor,
                          fontSize: fontSizeStyles.subheadingSize - 2
                        }]}>
                          {item}
                        </Text>
                        <Text style={[styles.bookItemCategory, { color: getBookColor(item, readingTheme) }]}>
                          {getBookCategory(item).charAt(0).toUpperCase() + getBookCategory(item).slice(1)}
                        </Text>
                      </View>
                      <View style={[styles.bookItemArrow, { backgroundColor: getBookColor(item, readingTheme) }]}>
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
          )}

          {/* Chapters Grid */}
          {view === "chapters" && (
            <View style={styles.chaptersSection}>
              <View style={styles.chapterHeader}>
                <Text style={[styles.sectionTitle, { 
                  color: themeStyles.textColor,
                  fontSize: fontSizeStyles.headingSize
                }]}>
                  {selectedBook} - Chapters
                </Text>
                
                <View style={[styles.bookIconLarge, { backgroundColor: `${getBookColor(selectedBook!, readingTheme)}20` }]}>
                  <Text style={[styles.bookIconLargeText, { color: getBookColor(selectedBook!, readingTheme) }]}>
                    {getBookInitials(selectedBook!)}
                  </Text>
                </View>
              </View>
              
              {loading ? (
                <ActivityIndicator color={themeStyles.accentColor} size="large" style={styles.loader} />
              ) : (
                <View style={styles.chaptersGrid}>
                  {chapters.map((chapter) => (
                    <TouchableOpacity
                      key={`chapter-${chapter}`}
                      style={[styles.chapterItem, { 
                        backgroundColor: themeStyles.cardColor,
                        borderColor: themeStyles.borderColor,
                        shadowColor: themeStyles.shadowColor
                      }]}
                      onPress={() => handleChapterSelect(chapter)}
                    >
                      <Text style={[styles.chapterItemText, { 
                        color: themeStyles.textColor,
                        fontSize: fontSizeStyles.subheadingSize
                      }]}>
                        {chapter}
                      </Text>
                      <View style={[styles.chapterItemDot, { backgroundColor: getBookColor(selectedBook!, readingTheme) }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Verses List */}
          {view === "verses" && (
            <View style={styles.versesSection}>
              <View style={styles.versesHeader}>
                <View style={styles.verseNavigation}>
                  <TouchableOpacity 
                    style={[styles.verseNavButton, { 
                      opacity: chapters.indexOf(selectedChapter!) > 0 ? 1 : 0.5,
                      backgroundColor: chapters.indexOf(selectedChapter!) > 0 
                        ? `${themeStyles.accentColor}15` 
                        : 'transparent',
                      borderColor: themeStyles.borderColor
                    }]}
                    onPress={goToPrevChapter}
                    disabled={chapters.indexOf(selectedChapter!) <= 0}
                  >
                    <Feather name="chevron-left" size={20} color={themeStyles.accentColor} />
                    <Text style={[styles.verseNavText, { color: themeStyles.accentColor }]}>Prev</Text>
                  </TouchableOpacity>
                  <View style={styles.fontSizeControls}>
                    <TouchableOpacity 
                      style={[styles.fontSizeButton, { 
                        opacity: fontSize === 'small' ? 0.5 : 1,
                        backgroundColor: fontSize !== 'small' ? `${themeStyles.accentColor}15` : 'transparent',
                        borderColor: themeStyles.borderColor
                      }]}
                      onPress={decreaseFontSize}
                      disabled={fontSize === 'small'}
                    >
                      <Text style={[styles.fontSizeButtonText, { color: themeStyles.accentColor }]}>A-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.fontSizeButton, { 
                        opacity: fontSize === 'xlarge' ? 0.5 : 1,
                        backgroundColor: fontSize !== 'xlarge' ? `${themeStyles.accentColor}15` : 'transparent',
                        borderColor: themeStyles.borderColor
                      }]}
                      onPress={increaseFontSize}
                      disabled={fontSize === 'xlarge'}
                    >
                      <Text style={[styles.fontSizeButtonText, { color: themeStyles.accentColor }]}>A+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={[styles.verseNavButton, { 
                      opacity: chapters.indexOf(selectedChapter!) < chapters.length - 1 ? 1 : 0.5,
                      backgroundColor: chapters.indexOf(selectedChapter!) < chapters.length - 1 
                        ? `${themeStyles.accentColor}15` 
                        : 'transparent',
                      borderColor: themeStyles.borderColor
                    }]}
                    onPress={goToNextChapter}
                    disabled={chapters.indexOf(selectedChapter!) >= chapters.length - 1}
                  >
                    <Text style={[styles.verseNavText, { color: themeStyles.accentColor }]}>Next</Text>
                    <Feather name="chevron-right" size={20} color={themeStyles.accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {loading ? (
                <ActivityIndicator color={themeStyles.accentColor} size="large" style={styles.loader} />
              ) : (
                <View style={styles.versesContent}>
                  <View style={[styles.verseDivider, { backgroundColor: getBookColor(selectedBook!, readingTheme) }]} />
                  
                  {verses.map((item) => (
                    <View key={`verse-${item.verse}`} style={styles.verseRow}>
                      <View style={[styles.verseNumberCircle, { backgroundColor: `${getBookColor(item.book, readingTheme)}15` }]}>
                        <Text style={[styles.verseNumber, { 
                          color: getBookColor(item.book, readingTheme),
                          fontSize: fontSizeStyles.verseText - 4
                        }]}>
                          {item.verse}
                        </Text>
                      </View>
                      <View style={styles.verseTextContainer}>
                        <Text 
                          style={[styles.verseText, { 
                            color: themeStyles.textColor,
                            fontSize: fontSizeStyles.verseText,
                            lineHeight: fontSizeStyles.lineHeight
                          }]}
                          selectable={true}
                        >
                          {item.text}
                        </Text>
                        <TouchableOpacity 
                          style={[
                            styles.favoriteButton,
                            isFavorite(item.book, item.chapter, item.verse) && 
                              { backgroundColor: `${themeStyles.accentColor}20` }
                          ]}
                          onPress={() => toggleFavorite(item.book, item.chapter, item.verse)}
                        >
                          <Feather 
                            name="heart" 
                            size={16} 
                            color={isFavorite(item.book, item.chapter, item.verse) ? themeStyles.accentColor : themeStyles.textColor} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create<{[key: string]: any}>({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    width: '100%',
    paddingTop: 15,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    justifyContent: "space-between",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 20,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeHeaderButton: {
    borderRadius: 20,
  },
  backButton: {
    marginRight: 15,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bibleIcon: {
    marginRight: 15,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: "600",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  recentlyReadSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
  },
  recentlyReadList: {
    paddingRight: 20,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    width: 280,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  recentItemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  recentItemIconText: {
    fontWeight: "700",
    fontSize: 18,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  recentItemSubtitle: {
    fontSize: 13,
  },
  recentItemArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  booksSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  testamentTabs: {
    flexDirection: "row",
    marginBottom: 18,
    flexWrap: "wrap",
  },
  testamentTab: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeTestamentTab: {
    borderWidth: 1,
  },
  testamentTabText: {
    fontSize: 14,
  },
  booksList: {
    borderRadius: 16,
    overflow: "hidden",
  },
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  bookItemContent: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRightWidth: 1,
  },
  bookItemText: {
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  bookItemCategory: {
    fontSize: 12,
    fontWeight: "500",
  },
  bookItemArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  chaptersSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bookIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookIconLargeText: {
    fontWeight: '700',
    fontSize: 24,
  },
  chaptersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  chapterItem: {
    width: "23%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    elevation: 2,
    position: 'relative',
  },
  chapterItemText: {
    fontWeight: "600",
  },
  chapterItemDot: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  versesSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  versesHeader: {
    marginBottom: 15,
  },
  verseNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  verseNavButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
  },
  verseNavText: {
    fontWeight: "500",
    fontSize: 14,
    marginHorizontal: 4,
  },
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  fontSizeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  versesContent: {
    paddingVertical: 10,
    position: 'relative',
  },
  verseDivider: {
    position: 'absolute',
    left: 15,
    top: 30,
    bottom: 20,
    width: 2,
    borderRadius: 1,
    opacity: 0.2,
  },
  verseRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  verseNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  verseNumber: {
    fontWeight: "600",
  },
  verseTextContainer: {
    flex: 1,
    flexDirection: "row",
    paddingTop: 6,
  },
  verseText: {
    flex: 1,
    letterSpacing: 0.3,
    paddingRight: 30,
  },
  favoriteButton: {
    position: "absolute",
    right: 0,
    top: 6,
    padding: 6,
    borderRadius: 16,
  },
  searchResultsContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
  },
  searchResultsList: {},
  searchResultItem: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 16,
    borderLeftWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchResultLocation: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultText: {
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 20,
  },
  themeModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeModalOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeModalContent: {
    width: width * 0.85,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  themeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeOption: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    width: width * 0.25,
  },
  activeThemeOption: {
    borderWidth: 2,
  },
  themeIconContainer: {
    width: 50,
    height: 50,
    marginBottom: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  themeOptionText: {
    fontWeight: '500',
  }
});