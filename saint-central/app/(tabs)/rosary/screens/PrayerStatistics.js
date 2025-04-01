import React, { useState, useEffect } from "react";
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
} from "react-native";
import { AntDesign, FontAwesome5, Feather, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { useCallback } from "react";

const { width, height } = Dimensions.get("window");

// Mystery types
const MYSTERY_TYPES = {
  JOYFUL: "Joyful Mysteries",
  SORROWFUL: "Sorrowful Mysteries",
  GLORIOUS: "Glorious Mysteries",
  LUMINOUS: "Luminous Mysteries",
};

// Get mystery theme color
const getMysteryTheme = (mysteryKey) => {
  switch (mysteryKey) {
    case "JOYFUL":
      return {
        primary: "#0ACF83",
        secondary: "#07A866",
        accent: "#E8FFF4",
        gradientStart: "#0ACF83",
        gradientEnd: "#07A866",
        icon: "leaf",
      };
    case "SORROWFUL":
      return {
        primary: "#FF4757", 
        secondary: "#D63031",
        accent: "#FFE9EB",
        gradientStart: "#FF4757",
        gradientEnd: "#D63031",
        icon: "heart-broken",
      };
    case "GLORIOUS":
      return {
        primary: "#7158e2",
        secondary: "#5F45C2",
        accent: "#F0ECFF",
        gradientStart: "#7158e2",
        gradientEnd: "#5F45C2",
        icon: "crown",
      };
    case "LUMINOUS":
      return {
        primary: "#18DCFF",
        secondary: "#0ABDE3",
        accent: "#E4F9FF",
        gradientStart: "#18DCFF",
        gradientEnd: "#0ABDE3",
        icon: "star",
      };
    default:
      return {
        primary: "#7158e2",
        secondary: "#5F45C2",
        accent: "#F0ECFF",
        gradientStart: "#7158e2",
        gradientEnd: "#5F45C2",
        icon: "crown",
      };
  }
};

// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
};

// Format time for display
const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

// Check if two dates are the same day
const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Check if two dates are consecutive days
const isConsecutiveDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Set to midnight to compare just the dates
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  // Check if d2 is one day after d1
  const oneDayInMs = 24 * 60 * 60 * 1000;
  return d2.getTime() - d1.getTime() === oneDayInMs;
};

export default function PrayerStatistics() {
  const router = useRouter();
  const theme = getMysteryTheme("GLORIOUS"); // Default theme
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats"); // "stats" or "history"
  const [timeRange, setTimeRange] = useState("month"); // "week", "month", "year", "all"
  const [prayerHistory, setPrayerHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [mysteryFilter, setMysteryFilter] = useState(null);
  const [streakDays, setStreakDays] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [totalPrayerTime, setTotalPrayerTime] = useState(0);
  const [weeklyData, setWeeklyData] = useState({
    labels: [],
    datasets: [{ data: [] }]
  });
  const [monthlyData, setMonthlyData] = useState({
    labels: [],
    datasets: [{ data: [] }]
  });
  const [mysteryDistribution, setMysteryDistribution] = useState([]);
  const [streakData, setStreakData] = useState([]);
  
  // Load prayer data on mount and when screen comes into focus
  useEffect(() => {
    loadPrayerData();
  }, []);
  
  // Using useFocusEffect instead of router.addListener
  useFocusEffect(
    useCallback(() => {
      checkForNewPrayers();
      return () => {}; // Cleanup function if needed
    }, [])
  );
  
  // Update filtered history when filters change
  useEffect(() => {
    if (prayerHistory.length === 0) return;
    
    let filtered = [...prayerHistory];
    
    // Apply time range filter
    const now = new Date();
    if (timeRange === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => new Date(item.date) >= oneWeekAgo);
    } else if (timeRange === "month") {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = filtered.filter(item => new Date(item.date) >= oneMonthAgo);
    } else if (timeRange === "year") {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      filtered = filtered.filter(item => new Date(item.date) >= oneYearAgo);
    }
    
    // Apply mystery filter
    if (mysteryFilter) {
      filtered = filtered.filter(item => item.mysteryKey === mysteryFilter);
    }
    
    setFilteredHistory(filtered);
  }, [prayerHistory, timeRange, mysteryFilter]);
  
  // Check for new prayers
  const checkForNewPrayers = async () => {
    try {
      // Check for a flag indicating a new prayer was completed
      const newPrayerFlag = await AsyncStorage.getItem('newPrayerCompleted');
      if (newPrayerFlag === 'true') {
        // Reset the flag
        await AsyncStorage.setItem('newPrayerCompleted', 'false');
        // Reload prayer data
        loadPrayerData();
      }
    } catch (error) {
      console.error("Failed to check for new prayers:", error);
    }
  };
  
  // Load prayer data from AsyncStorage
  const loadPrayerData = async () => {
    try {
      setIsLoading(true);
      
      // Load prayer history
      const history = await AsyncStorage.getItem('prayerHistory');
      let prayerHistoryData = [];
      
      if (history) {
        prayerHistoryData = JSON.parse(history);
        // Sort by date, newest first
        prayerHistoryData.sort((a, b) => new Date(b.date) - new Date(a.date));
        setPrayerHistory(prayerHistoryData);
        setFilteredHistory(prayerHistoryData);
      }
      
      // Load prayer statistics
      const prayerStats = await AsyncStorage.getItem('prayerStatistics');
      if (prayerStats) {
        const stats = JSON.parse(prayerStats);
        if (stats.streakDays) setStreakDays(stats.streakDays);
        if (stats.longestStreak) setLongestStreak(stats.longestStreak);
        if (stats.totalPrayers) setTotalPrayers(stats.totalPrayers);
        if (stats.totalPrayerTime) setTotalPrayerTime(stats.totalPrayerTime);
        
        // Set streak data for the bar graph
        if (stats.streakHistory) {
          setStreakData(stats.streakHistory);
        }
      }
      
      // Generate chart data
      generateChartData(prayerHistoryData);
      
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load prayer data:", error);
      setIsLoading(false);
    }
  };
  
  // Generate chart data from prayer history
  const generateChartData = (history) => {
    if (!history || history.length === 0) {
      setWeeklyData({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
      });
      
      setMonthlyData({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }]
      });
      
      setMysteryDistribution([
        { name: "Joyful", count: 0, color: "#0ACF83", legendFontColor: "#333333" },
        { name: "Sorrowful", count: 0, color: "#FF4757", legendFontColor: "#333333" },
        { name: "Glorious", count: 0, color: "#7158e2", legendFontColor: "#333333" },
        { name: "Luminous", count: 0, color: "#18DCFF", legendFontColor: "#333333" }
      ]);
      
      return;
    }
    
    // Sort history by date
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Weekly data (last 7 days)
    const weeklyMap = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      weeklyMap.set(dateString, 0);
    }
    
    sortedHistory.forEach(item => {
      const itemDate = new Date(item.date);
      const dateString = itemDate.toISOString().split('T')[0];
      
      if (weeklyMap.has(dateString)) {
        weeklyMap.set(dateString, weeklyMap.get(dateString) + 1);
      }
    });
    
    const weekLabels = [...weeklyMap.keys()].map(date => {
      const [year, month, day] = date.split('-');
      return `${month}/${day}`;
    });
    
    const weekData = [...weeklyMap.values()];
    
    setWeeklyData({
      labels: weekLabels,
      datasets: [
        {
          data: weekData,
          color: () => theme.primary,
        }
      ]
    });
    
    // Monthly data (last 12 months)
    const monthlyMap = new Map();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyMap.set(monthString, 0);
    }
    
    sortedHistory.forEach(item => {
      const itemDate = new Date(item.date);
      const monthString = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (monthlyMap.has(monthString)) {
        monthlyMap.set(monthString, monthlyMap.get(monthString) + 1);
      }
    });
    
    const monthLabels = [...monthlyMap.keys()].map(date => {
      const [year, month] = date.split('-');
      return `${month}/${year.slice(2)}`;
    });
    
    const monthData = [...monthlyMap.values()];
    
    setMonthlyData({
      labels: monthLabels,
      datasets: [
        {
          data: monthData,
          color: () => theme.primary,
        }
      ]
    });
    
    // Mystery distribution
    const mysteryCount = {
      JOYFUL: 0,
      SORROWFUL: 0,
      GLORIOUS: 0,
      LUMINOUS: 0,
    };
    
    sortedHistory.forEach(item => {
      if (mysteryCount.hasOwnProperty(item.mysteryKey)) {
        mysteryCount[item.mysteryKey]++;
      }
    });
    
    const distribution = [
      {
        name: "Joyful",
        count: mysteryCount.JOYFUL,
        color: "#0ACF83",
        legendFontColor: "#333333",
      },
      {
        name: "Sorrowful",
        count: mysteryCount.SORROWFUL,
        color: "#FF4757",
        legendFontColor: "#333333",
      },
      {
        name: "Glorious",
        count: mysteryCount.GLORIOUS,
        color: "#7158e2",
        legendFontColor: "#333333",
      },
      {
        name: "Luminous",
        count: mysteryCount.LUMINOUS,
        color: "#18DCFF",
        legendFontColor: "#333333",
      },
    ];
    
    setMysteryDistribution(distribution);
  };
  
  // Format prayer time
  const formatPrayerTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes} min`;
    } else if (remainingMinutes === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${remainingMinutes} min`;
    }
  };
  
  // Render chart for the selected time range
  const renderChart = () => {
    const chartConfig = {
      backgroundColor: "#FFFFFF",
      backgroundGradientFrom: "#FFFFFF",
      backgroundGradientTo: "#FFFFFF",
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(113, 88, 226, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: "#FFFFFF",
      },
    };
    
    if (timeRange === "week" || timeRange === "month") {
      return (
        <LineChart
          data={weeklyData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      );
    } else {
      return (
        <BarChart
          data={monthlyData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
        />
      );
    }
  };
  
  // Render streak bar graph
  const renderStreakGraph = () => {
    if (!streakData || streakData.length === 0) {
      return (
        <View style={styles.emptyStreakContainer}>
          <Text style={styles.emptyStreakText}>Complete prayers to build your streak!</Text>
        </View>
      );
    }
    
    // Only show the most recent 30 days of streak data
    const recentStreakData = streakData.slice(-30);
    
    return (
      <View style={styles.streakChartContainer}>
        <View style={styles.streakLabels}>
          <Text style={styles.streakLabelText}>1</Text>
          <Text style={styles.streakLabelText}>{Math.max(15, Math.floor(recentStreakData.length/2))}</Text>
          <Text style={styles.streakLabelText}>{recentStreakData.length}</Text>
        </View>
        <View style={styles.streakBarsContainer}>
          {recentStreakData.map((value, index) => (
            <View 
              key={index} 
              style={[
                styles.streakBar,
                { 
                  height: Math.max(value * 10, 10), 
                  backgroundColor: theme.primary 
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.streakGraphCaption}>Prayer points earned over time</Text>
      </View>
    );
  };
  
  // Render mystery distribution pie chart
  const renderMysteryDistribution = () => {
    // Filter out zero values
    const filteredDistribution = mysteryDistribution.filter(item => item.count > 0);
    
    if (filteredDistribution.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      );
    }
    
    return (
      <PieChart
        data={filteredDistribution}
        width={width - 40}
        height={220}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="count"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    );
  };
  
  // Render history item
  const renderHistoryItem = ({ item }) => {
    const itemTheme = getMysteryTheme(item.mysteryKey);
    
    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => {
          router.push({
            pathname: "/rosary/screens/RosaryHome",
            params: {
              mysteryType: item.mysteryType,
              mysteryKey: item.mysteryKey,
            }
          });
        }}
      >
        <View style={[styles.historyItemIcon, { backgroundColor: `${itemTheme.primary}20` }]}>
          <FontAwesome5 name={itemTheme.icon} size={20} color={itemTheme.primary} />
        </View>
        
        <View style={styles.historyItemContent}>
          <Text style={styles.historyItemTitle}>{item.mysteryType}</Text>
          <Text style={styles.historyItemDate}>{formatDate(item.date)} at {formatTime(item.date)}</Text>
          
          {item.duration && (
            <View style={styles.historyItemDuration}>
              <AntDesign name="clockcircleo" size={12} color="#666666" />
              <Text style={styles.historyItemDurationText}>
  {`${Math.round(item.duration / 60)} min`}
</Text>
            </View>
          )}
        </View>
        
        <View>
          <AntDesign name="right" size={16} color="#CCCCCC" />
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render empty history
  const renderEmptyHistory = () => (
    <View style={styles.emptyContainer}>
      <AntDesign name="calendar" size={60} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Prayer History</Text>
      <Text style={styles.emptyDescription}>
        Your completed prayers will appear here.
      </Text>
    </View>
  );
  
  // Render time range filter
  const renderTimeRangeFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "week" && [styles.activeFilterButton, { borderColor: theme.primary }]
        ]}
        onPress={() => setTimeRange("week")}
      >
        <Text style={[
          styles.filterButtonText,
          timeRange === "week" && { color: theme.primary, fontWeight: '600' }
        ]}>
          Week
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "month" && [styles.activeFilterButton, { borderColor: theme.primary }]
        ]}
        onPress={() => setTimeRange("month")}
      >
        <Text style={[
          styles.filterButtonText,
          timeRange === "month" && { color: theme.primary, fontWeight: '600' }
        ]}>
          Month
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "year" && [styles.activeFilterButton, { borderColor: theme.primary }]
        ]}
        onPress={() => setTimeRange("year")}
      >
        <Text style={[
          styles.filterButtonText,
          timeRange === "year" && { color: theme.primary, fontWeight: '600' }
        ]}>
          Year
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "all" && [styles.activeFilterButton, { borderColor: theme.primary }]
        ]}
        onPress={() => setTimeRange("all")}
      >
        <Text style={[
          styles.filterButtonText,
          timeRange === "all" && { color: theme.primary, fontWeight: '600' }
        ]}>
          All
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render mystery type filter
  const renderMysteryFilter = () => (
    <View style={styles.mysteryFilterContainer}>
      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === null && { backgroundColor: `${theme.primary}20` }
        ]}
        onPress={() => setMysteryFilter(null)}
      >
        <FontAwesome5 
          name="cross" 
          size={16} 
          color={mysteryFilter === null ? theme.primary : "#666666"} 
        />
        <Text style={[
          styles.mysteryFilterText,
          mysteryFilter === null && { color: theme.primary, fontWeight: '600' }
        ]}>
          All
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "JOYFUL" && { backgroundColor: "#0ACF8320" }
        ]}
        onPress={() => setMysteryFilter("JOYFUL")}
      >
        <FontAwesome5 
          name="leaf" 
          size={16} 
          color={mysteryFilter === "JOYFUL" ? "#0ACF83" : "#666666"} 
        />
        <Text style={[
          styles.mysteryFilterText,
          mysteryFilter === "JOYFUL" && { color: "#0ACF83", fontWeight: '600' }
        ]}>
          Joyful
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "SORROWFUL" && { backgroundColor: "#FF475720" }
        ]}
        onPress={() => setMysteryFilter("SORROWFUL")}
      >
        <FontAwesome5 
          name="heart-broken" 
          size={16} 
          color={mysteryFilter === "SORROWFUL" ? "#FF4757" : "#666666"} 
        />
        <Text style={[
          styles.mysteryFilterText,
          mysteryFilter === "SORROWFUL" && { color: "#FF4757", fontWeight: '600' }
        ]}>
          Sorrowful
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "GLORIOUS" && { backgroundColor: "#7158e220" }
        ]}
        onPress={() => setMysteryFilter("GLORIOUS")}
      >
        <FontAwesome5 
          name="crown" 
          size={16} 
          color={mysteryFilter === "GLORIOUS" ? "#7158e2" : "#666666"} 
        />
        <Text style={[
          styles.mysteryFilterText,
          mysteryFilter === "GLORIOUS" && { color: "#7158e2", fontWeight: '600' }
        ]}>
          Glorious
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "LUMINOUS" && { backgroundColor: "#18DCFF20" }
        ]}
        onPress={() => setMysteryFilter("LUMINOUS")}
      >
        <FontAwesome5 
          name="star" 
          size={16} 
          color={mysteryFilter === "LUMINOUS" ? "#18DCFF" : "#666666"} 
        />
        <Text style={[
          styles.mysteryFilterText,
          mysteryFilter === "LUMINOUS" && { color: "#18DCFF", fontWeight: '600' }
        ]}>
          Luminous
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render statistics tab
  const renderStatsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Summary cards */}
      <View style={styles.statsCardsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="fire" size={20} color="#FF9500" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{streakDays}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="trophy" size={20} color="#FF3B30" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{longestStreak}</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="pray" size={20} color="#5856D6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{totalPrayers}</Text>
              <Text style={styles.statLabel}>Total Rosaries</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <AntDesign name="clockcircleo" size={20} color="#34C759" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatPrayerTime(totalPrayerTime)}</Text>
              <Text style={styles.statLabel}>Total Prayer Time</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Streak Graph */}
      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prayer Streak Growth</Text>
        </View>
        {renderStreakGraph()}
      </View>
      
      {/* Activity chart */}
      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prayer Activity</Text>
        </View>
        
        {renderTimeRangeFilter()}
        
        {(weeklyData.datasets && weeklyData.datasets[0].data.length > 0) || 
         (monthlyData.datasets && monthlyData.datasets[0].data.length > 0) ? (
          renderChart()
        ) : (
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>No data available</Text>
          </View>
        )}
      </View>
      
      {/* Mystery distribution */}
      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mystery Distribution</Text>
        </View>
        
        {mysteryDistribution.length > 0 ? (
          renderMysteryDistribution()
        ) : (
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>No data available</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
  
  // Render history tab
  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {renderMysteryFilter()}
      
      {filteredHistory.length > 0 ? (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item, index) => `${item.date}-${index}`}
          renderItem={renderHistoryItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.historyList}
        />
      ) : (
        renderEmptyHistory()
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      
      {/* Header */}
      <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/rosary/screens/RosaryHome")}
        activeOpacity={0.7}
      >
        <AntDesign name="arrowleft" size={24} color="#FFF" />
      </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Prayer Journal</Text>
        
        <View style={styles.placeholderButton} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "stats" && [styles.activeTab, { borderColor: theme.primary }]
          ]}
          onPress={() => setActiveTab("stats")}
        >
          <Feather 
            name="bar-chart-2" 
            size={20} 
            color={activeTab === "stats" ? theme.primary : "#666666"} 
          />
          <Text style={[
            styles.tabText,
            activeTab === "stats" && { color: theme.primary, fontWeight: '600' }
          ]}>
            Statistics
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "history" && [styles.activeTab, { borderColor: theme.primary }]
          ]}
          onPress={() => setActiveTab("history")}
        >
          <AntDesign 
            name="calendar" 
            size={20} 
            color={activeTab === "history" ? theme.primary : "#666666"} 
          />
          <Text style={[
            styles.tabText,
            activeTab === "history" && { color: theme.primary, fontWeight: '600' }
          ]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading indicator */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        activeTab === "stats" ? renderStatsTab() : renderHistoryTab()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    color: "#666666",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContent: {
    flex: 1,
    paddingBottom: 20,
  },
  statsCardsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
  },
  chartSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  activeFilterButton: {
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666666",
  },
  chart: {
    marginHorizontal: 20,
    borderRadius: 16,
  },
  emptyChartContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    marginHorizontal: 20,
  },
  emptyChartText: {
    fontSize: 16,
    color: "#666666",
  },
  streakChartContainer: {
    height: 220,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  streakLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  streakLabelText: {
    fontSize: 12,
    color: "#666666",
  },
  streakBarsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 1,
    justifyContent: "space-around",
  },
  streakBar: {
    width: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  streakGraphCaption: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    marginTop: 16,
  },
  emptyStreakContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    marginHorizontal: 20,
  },
  emptyStreakText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  mysteryFilterContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 10,
    paddingTop: 10,
    overflow: "scroll",
  },
  mysteryFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  mysteryFilterText: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 6,
  },
  historyList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  historyItemIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#242424",
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  historyItemDuration: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemDurationText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
});