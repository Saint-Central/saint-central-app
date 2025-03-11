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
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient"; // Updated path to Supabase client

const { width } = Dimensions.get("window");

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

export default function BibleScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

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
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadItem[]>([
    { book: "John", chapter: "3", verse: "16", lastRead: new Date() },
    { book: "Psalms", chapter: "23", verse: "1", lastRead: new Date(Date.now() - 86400000) }
  ]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    { book: "Philippians", chapter: "4", verse: "13", dateAdded: new Date() }
  ]);

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (readingTheme) {
      case 'sepia':
        return {
          backgroundColor: "#F8F1E3",
          textColor: "#5B4636",
          accentColor: "#8B7355",
          headerColor: "#F2E8D9",
          cardColor: "#F5EEE0",
          borderColor: "rgba(139, 115, 85, 0.2)",
          statusBarStyle: "dark-content" as "dark-content" | "light-content"
        };
      case 'night':
        return {
          backgroundColor: "#121212",
          textColor: "#E1E1E1",
          accentColor: "#7B9EB3",
          headerColor: "#1E1E1E",
          cardColor: "#262626",
          borderColor: "rgba(150, 150, 150, 0.15)",
          statusBarStyle: "light-content" as "dark-content" | "light-content"
        };
      case 'paper':
      default:
        return {
          backgroundColor: "#FFFFFF",
          textColor: "#333333",
          accentColor: "#4A6FA5",
          headerColor: "#FFFFFF",
          cardColor: "#F9F9F9",
          borderColor: "rgba(0, 0, 0, 0.1)",
          statusBarStyle: "dark-content" as "dark-content" | "light-content"
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
    if (readingTheme === 'paper') {
      setReadingTheme('sepia');
    } else if (readingTheme === 'sepia') {
      setReadingTheme('night');
    } else {
      setReadingTheme('paper');
    }
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.backgroundColor }]}>
      <StatusBar barStyle={themeStyles.statusBarStyle} />
      <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeStyles.headerColor, borderBottomColor: themeStyles.borderColor }]}>
          {view !== "books" ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (view === "verses") {
                  setView("chapters");
                } else {
                  setView("books");
                  setSelectedBook(null);
                }
              }}
            >
              <Feather name="arrow-left" size={24} color={themeStyles.textColor} />
            </TouchableOpacity>
          ) : null}
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
                style={styles.headerButton}
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
                color={themeStyles.textColor} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar (only visible in books view) */}
        {view === "books" && (
          <View style={[styles.searchContainer, { 
            backgroundColor: themeStyles.cardColor, 
            borderColor: themeStyles.borderColor 
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

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={(event) => {
            // Manual update of the animated value
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollY.setValue(offsetY);
          }}
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
                        borderLeftColor: themeStyles.accentColor
                      }]}
                      onPress={() => {
                        setSelectedBook(item.book);
                        setSelectedChapter(item.chapter);
                        fetchVerses(item.book, item.chapter);
                        setView("verses");
                      }}
                    >
                      <View style={[styles.searchResultHeader, { borderBottomColor: themeStyles.borderColor }]}>
                        <Text style={[styles.searchResultLocation, { color: themeStyles.accentColor }]}>
                          {item.book} {item.chapter}:{item.verse}
                        </Text>
                        <TouchableOpacity onPress={() => toggleFavorite(item.book, item.chapter, item.verse)}>
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
                          borderColor: themeStyles.borderColor
                        }]}
                        onPress={() => {
                          setSelectedBook(item.book);
                          setSelectedChapter(item.chapter);
                          fetchVerses(item.book, item.chapter);
                          setView("verses");
                        }}
                      >
                        <View style={[styles.recentItemIconContainer, { backgroundColor: `${themeStyles.accentColor}30` }]}>
                          <Feather name="book-open" size={18} color={themeStyles.accentColor} />
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
                        <Feather name="chevron-right" size={18} color={themeStyles.accentColor} />
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
                        borderLeftColor: themeStyles.accentColor
                      }]}
                      onPress={() => handleBookSelect(item)}
                    >
                      <Text style={[styles.bookItemText, { 
                        color: themeStyles.textColor,
                        fontSize: fontSizeStyles.subheadingSize - 2
                      }]}>
                        {item}
                      </Text>
                      <Feather name="chevron-right" size={18} color={themeStyles.accentColor} />
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
              <Text style={[styles.sectionTitle, { 
                color: themeStyles.textColor,
                fontSize: fontSizeStyles.headingSize
              }]}>
                {selectedBook} - Chapters
              </Text>
              {loading ? (
                <ActivityIndicator color={themeStyles.accentColor} size="large" style={styles.loader} />
              ) : (
                <View style={styles.chaptersGrid}>
                  {chapters.map((chapter) => (
                    <TouchableOpacity
                      key={`chapter-${chapter}`}
                      style={[styles.chapterItem, { 
                        backgroundColor: themeStyles.cardColor,
                        borderColor: themeStyles.borderColor
                      }]}
                      onPress={() => handleChapterSelect(chapter)}
                    >
                      <Text style={[styles.chapterItemText, { 
                        color: themeStyles.textColor,
                        fontSize: fontSizeStyles.subheadingSize
                      }]}>
                        {chapter}
                      </Text>
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
                    style={[styles.verseNavButton, { opacity: chapters.indexOf(selectedChapter!) > 0 ? 1 : 0.5 }]}
                    onPress={goToPrevChapter}
                    disabled={chapters.indexOf(selectedChapter!) <= 0}
                  >
                    <Feather name="chevron-left" size={20} color={themeStyles.accentColor} />
                    <Text style={[styles.verseNavText, { color: themeStyles.accentColor }]}>Prev</Text>
                  </TouchableOpacity>
                  <View style={styles.fontSizeControls}>
                    <TouchableOpacity 
                      style={[styles.fontSizeButton, { opacity: fontSize === 'small' ? 0.5 : 1 }]}
                      onPress={decreaseFontSize}
                      disabled={fontSize === 'small'}
                    >
                      <Text style={[styles.fontSizeButtonText, { color: themeStyles.accentColor }]}>A-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.fontSizeButton, { opacity: fontSize === 'xlarge' ? 0.5 : 1 }]}
                      onPress={increaseFontSize}
                      disabled={fontSize === 'xlarge'}
                    >
                      <Text style={[styles.fontSizeButtonText, { color: themeStyles.accentColor }]}>A+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={[styles.verseNavButton, { opacity: chapters.indexOf(selectedChapter!) < chapters.length - 1 ? 1 : 0.5 }]}
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
                  {verses.map((item) => (
                    <View key={`verse-${item.verse}`} style={styles.verseRow}>
                      <Text style={[styles.verseNumber, { 
                        color: themeStyles.accentColor,
                        fontSize: fontSizeStyles.verseText - 4
                      }]}>
                        {item.verse}
                      </Text>
                      <View style={styles.verseTextContainer}>
                        <Text style={[styles.verseText, { 
                          color: themeStyles.textColor,
                          fontSize: fontSizeStyles.verseText,
                          lineHeight: fontSizeStyles.lineHeight
                        }]}>
                          {item.text}
                        </Text>
                        <TouchableOpacity 
                          style={styles.favoriteButton}
                          onPress={() => toggleFavorite(item.book, item.chapter, item.verse)}
                        >
                          <Feather 
                            name={isFavorite(item.book, item.chapter, item.verse) ? "heart" : "heart"} 
                            size={16} 
                            color={isFavorite(item.book, item.chapter, item.verse) ? themeStyles.accentColor : "transparent"} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontWeight: "500",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
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
    fontWeight: "500",
    marginBottom: 18,
    letterSpacing: 0.2,
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
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 250,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recentItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontWeight: "500",
    marginBottom: 4,
  },
  recentItemSubtitle: {
    fontSize: 13,
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
    borderRadius: 10,
    overflow: "hidden",
  },
  bookItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookItemText: {
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  chaptersSection: {
    marginHorizontal: 20,
    marginBottom: 30,
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
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    elevation: 1,
  },
  chapterItemText: {
    fontWeight: "500",
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
  },
  verseNavText: {
    fontWeight: "500",
    fontSize: 14,
  },
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  fontSizeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  fontSizeButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  versesContent: {
    paddingVertical: 10,
  },
  verseRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  verseNumber: {
    width: 30,
    fontWeight: "600",
    paddingTop: 2,
  },
  verseTextContainer: {
    flex: 1,
    flexDirection: "row",
  },
  verseText: {
    flex: 1,
    letterSpacing: 0.3,
    paddingRight: 20,
  },
  favoriteButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 4,
  },
  searchResultsContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
  },
  searchResultsList: {},
  searchResultItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
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
});