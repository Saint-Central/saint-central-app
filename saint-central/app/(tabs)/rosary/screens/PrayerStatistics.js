import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AntDesign, FontAwesome5, Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Initialize Supabase client (replace with your Supabase URL and anon key)
const supabaseUrl = "https://lzbpsqmtvkimwqmakurg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6YnBzcW10dmtpbXdxbWFrdXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMjMxMDQsImV4cCI6MjA1MTc5OTEwNH0.BPMjXAHWqCBVsyklRG3OToXLGAMy346xMIkCR4Sc-YY";
const supabase = createClient(supabaseUrl, supabaseKey);

const { width } = Dimensions.get("window");

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
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
};

// Format time for display
const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
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
  const scrollViewRef = useRef(null);

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
    datasets: [{ data: [] }],
  });
  const [monthlyData, setMonthlyData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [mysteryDistribution, setMysteryDistribution] = useState([]);
  const [streakData, setStreakData] = useState([]);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [showDataPointInfo, setShowDataPointInfo] = useState(false);
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Load prayer data on mount and when screen comes into focus
  useEffect(() => {
    checkDataSource();
  }, []);

  // Using useFocusEffect instead of router.addListener
  useFocusEffect(
    useCallback(() => {
      checkForNewPrayers();
      return () => {}; // Cleanup function if needed
    }, []),
  );

  // Check data source (Supabase or AsyncStorage)
  const checkDataSource = async () => {
    try {
      const dataSource = await AsyncStorage.getItem("prayerDataSource");
      if (dataSource === "supabase") {
        setIsUsingSupabase(true);
        loadPrayerDataFromSupabase();
      } else {
        setIsUsingSupabase(false);
        loadPrayerDataFromAsyncStorage();
      }
    } catch (error) {
      console.error("Failed to check data source:", error);
      // Default to AsyncStorage
      setIsUsingSupabase(false);
      loadPrayerDataFromAsyncStorage();
    }
  };

  // Update filtered history when filters change
  useEffect(() => {
    if (prayerHistory.length === 0) return;

    let filtered = [...prayerHistory];

    // Apply time range filter
    const now = new Date();
    if (timeRange === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((item) => new Date(item.date) >= oneWeekAgo);
    } else if (timeRange === "month") {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = filtered.filter((item) => new Date(item.date) >= oneMonthAgo);
    } else if (timeRange === "year") {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      filtered = filtered.filter((item) => new Date(item.date) >= oneYearAgo);
    }

    // Apply mystery filter
    if (mysteryFilter) {
      filtered = filtered.filter((item) => item.mysteryKey === mysteryFilter);
    }

    setFilteredHistory(filtered);
  }, [prayerHistory, timeRange, mysteryFilter]);

  // Check for new prayers
  const checkForNewPrayers = async () => {
    try {
      // Check for a flag indicating a new prayer was completed
      const newPrayerFlag = await AsyncStorage.getItem("newPrayerCompleted");
      if (newPrayerFlag === "true") {
        // Reset the flag
        await AsyncStorage.setItem("newPrayerCompleted", "false");

        // Reload prayer data from the appropriate source
        if (isUsingSupabase) {
          loadPrayerDataFromSupabase();
        } else {
          loadPrayerDataFromAsyncStorage();
        }
      }
    } catch (error) {
      console.error("Failed to check for new prayers:", error);
    }
  };

  // Save a prayer session to the appropriate source
  const savePrayerSession = async (mysteryKey, mysteryType, duration) => {
    try {
      const prayerSession = {
        date: new Date().toISOString(),
        mysteryKey,
        mysteryType,
        duration,
      };

      if (isUsingSupabase) {
        // Save to Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error("User not authenticated");
          return;
        }

        const { data, error } = await supabase.from("prayer_sessions").insert({
          user_id: user.id,
          date: prayerSession.date,
          mystery_key: prayerSession.mysteryKey,
          mystery_type: prayerSession.mysteryType,
          duration: prayerSession.duration || 0,
        });

        if (error) {
          console.error("Error saving prayer session to Supabase:", error);
        }
      } else {
        // Save to AsyncStorage
        const history = await AsyncStorage.getItem("prayerHistory");
        let prayerHistoryData = history ? JSON.parse(history) : [];

        // Add new session
        prayerHistoryData.push(prayerSession);

        // Save updated history
        await AsyncStorage.setItem("prayerHistory", JSON.stringify(prayerHistoryData));

        // Update statistics
        const prayerStats = await AsyncStorage.getItem("prayerStatistics");
        let stats = prayerStats
          ? JSON.parse(prayerStats)
          : {
              streakDays: 0,
              longestStreak: 0,
              totalPrayers: 0,
              totalPrayerTime: 0,
              streakHistory: [],
              lastPrayerDate: null,
            };

        // Update total counts
        stats.totalPrayers += 1;
        stats.totalPrayerTime += prayerSession.duration || 0;

        // Calculate streak
        const today = new Date().setHours(0, 0, 0, 0);
        const lastPrayerDate = stats.lastPrayerDate
          ? new Date(stats.lastPrayerDate).setHours(0, 0, 0, 0)
          : null;

        if (!lastPrayerDate || lastPrayerDate < today) {
          if (lastPrayerDate && isConsecutiveDay(lastPrayerDate, today)) {
            // Consecutive day
            stats.streakDays += 1;
          } else {
            // Not consecutive, reset streak to 1
            stats.streakDays = 1;
          }

          // Update longest streak
          stats.longestStreak = Math.max(stats.longestStreak, stats.streakDays);

          // Update streak history
          stats.streakHistory.push(stats.streakDays);

          // Update last prayer date
          stats.lastPrayerDate = new Date().toISOString();
        }

        // Save updated stats
        await AsyncStorage.setItem("prayerStatistics", JSON.stringify(stats));
      }

      // Set flag that a new prayer was completed (used by other screens)
      await AsyncStorage.setItem("newPrayerCompleted", "true");
    } catch (error) {
      console.error("Failed to save prayer session:", error);
    }
  };

  // Load prayer data from AsyncStorage
  const loadPrayerDataFromAsyncStorage = async () => {
    try {
      setIsLoading(true);

      // Load prayer history
      const history = await AsyncStorage.getItem("prayerHistory");
      let prayerHistoryData = [];

      if (history) {
        prayerHistoryData = JSON.parse(history);
        // Sort by date, newest first
        prayerHistoryData.sort((a, b) => new Date(b.date) - new Date(a.date));
        setPrayerHistory(prayerHistoryData);
        setFilteredHistory(prayerHistoryData);
      }

      // Load prayer statistics
      const prayerStats = await AsyncStorage.getItem("prayerStatistics");
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
      console.error("Failed to load prayer data from AsyncStorage:", error);
      setIsLoading(false);
    }
  };

  // Load prayer data from Supabase
  const loadPrayerDataFromSupabase = async () => {
    try {
      setIsLoading(true);

      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        setIsLoading(false);
        return;
      }

      // Load prayer history from Supabase
      const { data: prayerHistoryData, error: historyError } = await supabase
        .from("prayer_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (historyError) {
        console.error("Failed to load prayer history from Supabase:", historyError);
      } else if (prayerHistoryData) {
        // Map Supabase fields to app fields if needed
        const mappedData = prayerHistoryData.map((item) => ({
          date: item.date,
          mysteryKey: item.mystery_key,
          mysteryType: item.mystery_type,
          duration: item.duration,
        }));

        setPrayerHistory(mappedData);
        setFilteredHistory(mappedData);
      }

      // Load prayer statistics from Supabase
      const { data: statsData, error: statsError } = await supabase
        .from("prayer_statistics")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (statsError && statsError.code !== "PGRST116") {
        // Not found error
        console.error("Failed to load prayer statistics from Supabase:", statsError);
      } else if (statsData) {
        setStreakDays(statsData.streak_days || 0);
        setLongestStreak(statsData.longest_streak || 0);
        setTotalPrayers(statsData.total_prayers || 0);
        setTotalPrayerTime(statsData.total_prayer_time || 0);

        if (statsData.streak_history) {
          // Parse streak history from JSONB if needed
          const parsedStreakData =
            typeof statsData.streak_history === "string"
              ? JSON.parse(statsData.streak_history)
              : statsData.streak_history;
          setStreakData(parsedStreakData);
        }
      }

      // Generate chart data
      if (prayerHistoryData) {
        generateChartData(
          prayerHistoryData.map((item) => ({
            date: item.date,
            mysteryKey: item.mystery_key,
            mysteryType: item.mystery_type,
            duration: item.duration,
          })),
        );
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load prayer data from Supabase:", error);
      setIsLoading(false);
    }
  };

  // Migrate data from AsyncStorage to Supabase
  const migrateToSupabase = async () => {
    try {
      setIsMigrating(true);

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Authentication Required", "Please log in to sync your data to the cloud.");
        setIsMigrating(false);
        return;
      }

      // Load prayer history from AsyncStorage
      const history = await AsyncStorage.getItem("prayerHistory");
      if (history) {
        const prayerHistoryData = JSON.parse(history);

        // Insert each prayer session into Supabase
        for (const session of prayerHistoryData) {
          const { data, error } = await supabase.from("prayer_sessions").insert({
            user_id: user.id,
            date: new Date(session.date).toISOString(),
            mystery_key: session.mysteryKey,
            mystery_type: session.mysteryType,
            duration: session.duration || 0,
          });

          if (error) console.error("Error inserting prayer session:", error);
        }
      }

      // Set data source to Supabase
      await AsyncStorage.setItem("prayerDataSource", "supabase");
      setIsUsingSupabase(true);

      // Reload data from Supabase
      await loadPrayerDataFromSupabase();

      Alert.alert(
        "Migration Complete",
        "Your prayer data has been successfully migrated to the cloud.",
      );
      setIsMigrating(false);
    } catch (error) {
      console.error("Migration error:", error);
      Alert.alert("Migration Failed", "There was an error migrating your data. Please try again.");
      setIsMigrating(false);
    }
  };

  // Generate chart data from prayer history
  const generateChartData = (history) => {
    if (!history || history.length === 0) {
      setWeeklyData({
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
      });

      setMonthlyData({
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      });

      setMysteryDistribution([
        { name: "Joyful", count: 0, color: "#0ACF83", legendFontColor: "#333333" },
        { name: "Sorrowful", count: 0, color: "#FF4757", legendFontColor: "#333333" },
        { name: "Glorious", count: 0, color: "#7158e2", legendFontColor: "#333333" },
        { name: "Luminous", count: 0, color: "#18DCFF", legendFontColor: "#333333" },
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
      const dateString = date.toISOString().split("T")[0];
      weeklyMap.set(dateString, 0);
    }

    sortedHistory.forEach((item) => {
      const itemDate = new Date(item.date);
      const dateString = itemDate.toISOString().split("T")[0];

      if (weeklyMap.has(dateString)) {
        weeklyMap.set(dateString, weeklyMap.get(dateString) + 1);
      }
    });

    const weekLabels = [...weeklyMap.keys()].map((date) => {
      const [year, month, day] = date.split("-");
      return `${month}/${day}`;
    });

    const weekData = [...weeklyMap.values()];

    setWeeklyData({
      labels: weekLabels,
      datasets: [
        {
          data: weekData,
          color: () => theme.primary,
        },
      ],
    });

    // Monthly data (last 12 months)
    const monthlyMap = new Map();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      monthlyMap.set(monthString, 0);
    }

    sortedHistory.forEach((item) => {
      const itemDate = new Date(item.date);
      const monthString = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1).toString().padStart(2, "0")}`;

      if (monthlyMap.has(monthString)) {
        monthlyMap.set(monthString, monthlyMap.get(monthString) + 1);
      }
    });

    // Create shorter labels for "year" and "all" view to avoid overcrowding
    const monthLabels = [...monthlyMap.keys()].map((date) => {
      const [year, month] = date.split("-");
      // Use abbreviated format for better spacing
      return `${month}/${year.slice(2)}`;
    });

    const monthData = [...monthlyMap.values()];

    setMonthlyData({
      labels: monthLabels,
      datasets: [
        {
          data: monthData,
          color: () => theme.primary,
        },
      ],
    });

    // Mystery distribution
    const mysteryCount = {
      JOYFUL: 0,
      SORROWFUL: 0,
      GLORIOUS: 0,
      LUMINOUS: 0,
    };

    sortedHistory.forEach((item) => {
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

  // Handle data point selection
  const handleDataPointClick = (data, index) => {
    // Close tooltip if clicking the same point
    if (selectedDataPoint && selectedDataPoint.index === index) {
      setSelectedDataPoint(null);
      setShowDataPointInfo(false);
      return;
    }

    // Get the appropriate data based on time range
    const chartData = timeRange === "week" || timeRange === "month" ? weeklyData : monthlyData;

    const label = chartData.labels[index];
    const value = chartData.datasets[0].data[index];

    // Calculate position differently based on chart type
    let xPosition;
    const dataPointCount = chartData.labels.length;

    if (timeRange === "year" || timeRange === "all") {
      // For bar charts with custom width
      const barWidth = 30; // Should match what's used in renderChart
      const chartWidth = Math.max(width - 40, dataPointCount * barWidth);
      xPosition = (index * chartWidth) / dataPointCount + barWidth / 2;
    } else {
      // For line charts
      xPosition = index * ((width - 40) / (chartData.labels.length - 1));
    }

    setSelectedDataPoint({
      index,
      label,
      value,
      x: xPosition,
    });

    setShowDataPointInfo(true);
  };

  // Scroll to Activity Chart
  const scrollToActivityChart = () => {
    // Add a small delay to ensure the scroll happens after render
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: 350, // Approximate position of the activity chart
          animated: true,
        });
      }
    }, 100);
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
        <View style={styles.chartOuterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.scrollableChartContent}
          >
            <View style={styles.chartContainer}>
              <LineChart
                data={weeklyData}
                width={width - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                onDataPointClick={({ value, dataset, getColor, index }) =>
                  handleDataPointClick(value, index)
                }
                withShadow={false}
                withHorizontalLines={true}
                withVerticalLines={false}
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                fromZero={true}
              />

              {showDataPointInfo && selectedDataPoint && (
                <View
                  style={[
                    styles.dataPointTooltip,
                    {
                      left: selectedDataPoint.x,
                      transform: [{ translateX: -50 }], // Center the tooltip
                    },
                  ]}
                >
                  <Text style={styles.tooltipDate}>{selectedDataPoint.label}</Text>
                  <Text style={styles.tooltipValue}>
                    {selectedDataPoint.value} {selectedDataPoint.value === 1 ? "prayer" : "prayers"}
                  </Text>
                  <View style={styles.tooltipArrow} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    } else {
      // For yearly or all-time view, adjust the labels to prevent crowding
      const yearlyChartConfig = {
        ...chartConfig,
        barPercentage: 0.7,
        barRadius: 5,
        // Adjust x-axis label properties
        labelRotation: -45, // Rotate labels
        xLabelsOffset: 0, // Offset to position labels
        formatXLabel: (label) => {
          // For "all" range with many labels, display fewer labels
          if (timeRange === "all" && monthlyData.labels.length > 12) {
            const index = monthlyData.labels.indexOf(label);
            // Only show every third label for readability
            return index % 3 === 0 ? label : "";
          }
          return label;
        },
        // Reduce font size for label text
        propsForLabels: {
          fontSize: 10,
        },
      };

      // Calculate width based on number of data points
      // More data points = wider chart for horizontal scrolling
      const dataPointCount = monthlyData.labels.length;
      const barWidth = 30; // Width per bar in pixels
      const chartWidth = Math.max(width - 40, dataPointCount * barWidth);

      return (
        <View style={styles.chartOuterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.scrollableChartContent}
          >
            <View style={styles.chartContainer}>
              <BarChart
                data={monthlyData}
                width={chartWidth}
                height={220}
                chartConfig={yearlyChartConfig}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                flatColor
                withHorizontalLabels
                yAxisLabel=""
                yAxisSuffix=""
                onDataPointClick={({ value, dataset, getColor, index }) =>
                  handleDataPointClick(value, index)
                }
                verticalLabelRotation={30} // Rotate labels for better readability
                horizontalLabelRotation={-45}
              />

              {showDataPointInfo && selectedDataPoint && (
                <View
                  style={[
                    styles.dataPointTooltip,
                    {
                      left: selectedDataPoint.x,
                      transform: [{ translateX: -50 }], // Center the tooltip
                    },
                  ]}
                >
                  <Text style={styles.tooltipDate}>{selectedDataPoint.label}</Text>
                  <Text style={styles.tooltipValue}>
                    {selectedDataPoint.value} {selectedDataPoint.value === 1 ? "prayer" : "prayers"}
                  </Text>
                  <View style={styles.tooltipArrow} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }
  };

  // Get streak colors based on value
  const getStreakColor = (value, index) => {
    // Create a gradient of colors from theme.primary
    const maxValue = Math.max(...streakData);
    const normalized = value / maxValue;

    // Alternate between two colors based on index for a more colorful display
    if (index % 2 === 0) {
      return `rgba(113, 88, 226, ${Math.max(0.3, normalized)})`;
    } else {
      return `rgba(24, 220, 255, ${Math.max(0.3, normalized)})`;
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
        <View style={styles.streakBarsContainer}>
          {recentStreakData.map((value, index) => (
            <View
              key={index}
              style={[
                styles.streakBar,
                {
                  height: Math.max(value * 6, 4), // Smaller bars (was 10)
                  backgroundColor: getStreakColor(value, index),
                  width: 4, // Thinner bars
                },
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
    const filteredDistribution = mysteryDistribution.filter((item) => item.count > 0);

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
            },
          });
        }}
      >
        <View style={[styles.historyItemIcon, { backgroundColor: `${itemTheme.primary}20` }]}>
          <FontAwesome5 name={itemTheme.icon} size={20} color={itemTheme.primary} />
        </View>

        <View style={styles.historyItemContent}>
          <Text style={styles.historyItemTitle}>{item.mysteryType}</Text>
          <Text style={styles.historyItemDate}>
            {formatDate(item.date)} at {formatTime(item.date)}
          </Text>

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
      <Text style={styles.emptyDescription}>Your completed prayers will appear here.</Text>
    </View>
  );

  // Render time range filter
  const renderTimeRangeFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "week" && [styles.activeFilterButton, { borderColor: theme.primary }],
        ]}
        onPress={() => {
          setTimeRange("week");
          setSelectedDataPoint(null);
          setShowDataPointInfo(false);
        }}
      >
        <Text
          style={[
            styles.filterButtonText,
            timeRange === "week" && { color: theme.primary, fontWeight: "600" },
          ]}
        >
          Week
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "month" && [styles.activeFilterButton, { borderColor: theme.primary }],
        ]}
        onPress={() => {
          setTimeRange("month");
          setSelectedDataPoint(null);
          setShowDataPointInfo(false);
        }}
      >
        <Text
          style={[
            styles.filterButtonText,
            timeRange === "month" && { color: theme.primary, fontWeight: "600" },
          ]}
        >
          Month
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "year" && [styles.activeFilterButton, { borderColor: theme.primary }],
        ]}
        onPress={() => {
          setTimeRange("year");
          setSelectedDataPoint(null);
          setShowDataPointInfo(false);
        }}
      >
        <Text
          style={[
            styles.filterButtonText,
            timeRange === "year" && { color: theme.primary, fontWeight: "600" },
          ]}
        >
          Year
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          timeRange === "all" && [styles.activeFilterButton, { borderColor: theme.primary }],
        ]}
        onPress={() => {
          setTimeRange("all");
          setSelectedDataPoint(null);
          setShowDataPointInfo(false);
        }}
      >
        <Text
          style={[
            styles.filterButtonText,
            timeRange === "all" && { color: theme.primary, fontWeight: "600" },
          ]}
        >
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
          mysteryFilter === null && { backgroundColor: `${theme.primary}20` },
        ]}
        onPress={() => setMysteryFilter(null)}
      >
        <FontAwesome5
          name="cross"
          size={16}
          color={mysteryFilter === null ? theme.primary : "#666666"}
        />
        <Text
          style={[
            styles.mysteryFilterText,
            mysteryFilter === null && { color: theme.primary, fontWeight: "600" },
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "JOYFUL" && { backgroundColor: "#0ACF8320" },
        ]}
        onPress={() => setMysteryFilter("JOYFUL")}
      >
        <FontAwesome5
          name="leaf"
          size={16}
          color={mysteryFilter === "JOYFUL" ? "#0ACF83" : "#666666"}
        />
        <Text
          style={[
            styles.mysteryFilterText,
            mysteryFilter === "JOYFUL" && { color: "#0ACF83", fontWeight: "600" },
          ]}
        >
          Joyful
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "SORROWFUL" && { backgroundColor: "#FF475720" },
        ]}
        onPress={() => setMysteryFilter("SORROWFUL")}
      >
        <FontAwesome5
          name="heart-broken"
          size={16}
          color={mysteryFilter === "SORROWFUL" ? "#FF4757" : "#666666"}
        />
        <Text
          style={[
            styles.mysteryFilterText,
            mysteryFilter === "SORROWFUL" && { color: "#FF4757", fontWeight: "600" },
          ]}
        >
          Sorrowful
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "GLORIOUS" && { backgroundColor: "#7158e220" },
        ]}
        onPress={() => setMysteryFilter("GLORIOUS")}
      >
        <FontAwesome5
          name="crown"
          size={16}
          color={mysteryFilter === "GLORIOUS" ? "#7158e2" : "#666666"}
        />
        <Text
          style={[
            styles.mysteryFilterText,
            mysteryFilter === "GLORIOUS" && { color: "#7158e2", fontWeight: "600" },
          ]}
        >
          Glorious
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.mysteryFilterButton,
          mysteryFilter === "LUMINOUS" && { backgroundColor: "#18DCFF20" },
        ]}
        onPress={() => setMysteryFilter("LUMINOUS")}
      >
        <FontAwesome5
          name="star"
          size={16}
          color={mysteryFilter === "LUMINOUS" ? "#18DCFF" : "#666666"}
        />
        <Text
          style={[
            styles.mysteryFilterText,
            mysteryFilter === "LUMINOUS" && { color: "#18DCFF", fontWeight: "600" },
          ]}
        >
          Luminous
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render cloud storage card/button
  const renderCloudStorageButton = () => {
    if (isUsingSupabase) {
      return (
        <View style={styles.cloudStorageCardContainer}>
          <View style={styles.cloudStorageCard}>
            <View style={styles.cloudStorageIcon}>
              <AntDesign name="cloud" size={24} color="#7158e2" />
            </View>
            <View style={styles.cloudStorageContent}>
              <Text style={styles.cloudStorageTitle}>Cloud Sync Enabled</Text>
              <Text style={styles.cloudStorageDescription}>
                Your prayer data is synced to the cloud
              </Text>
            </View>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.cloudStorageCardContainer}>
          <TouchableOpacity
            style={styles.cloudStorageCard}
            onPress={migrateToSupabase}
            disabled={isMigrating}
          >
            <View style={styles.cloudStorageIcon}>
              <AntDesign name="clouduploado" size={24} color="#7158e2" />
            </View>
            <View style={styles.cloudStorageContent}>
              <Text style={styles.cloudStorageTitle}>
                {isMigrating ? "Syncing to Cloud..." : "Sync to Cloud"}
              </Text>
              <Text style={styles.cloudStorageDescription}>
                {isMigrating
                  ? "Please wait while we sync your data"
                  : "Back up and sync your prayer data across devices"}
              </Text>
            </View>
            {isMigrating ? (
              <ActivityIndicator size="small" color="#7158e2" />
            ) : (
              <AntDesign name="right" size={16} color="#CCCCCC" />
            )}
          </TouchableOpacity>
        </View>
      );
    }
  };

  // Render statistics tab
  const renderStatsTab = () => (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Cloud storage button */}
      {renderCloudStorageButton()}

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
      <View style={styles.chartSection} id="activityChart">
        <View style={styles.sectionHeader}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text style={styles.sectionTitle}>Prayer Activity</Text>
            <TouchableOpacity style={styles.scrollToButton} onPress={scrollToActivityChart}>
              <AntDesign name="arrowdown" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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

        <View style={styles.chartLegend}>
          <Text style={styles.chartLegendText}>Tap on data points to see details</Text>
        </View>
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
            activeTab === "stats" && [styles.activeTab, { borderColor: theme.primary }],
          ]}
          onPress={() => setActiveTab("stats")}
        >
          <Feather
            name="bar-chart-2"
            size={20}
            color={activeTab === "stats" ? theme.primary : "#666666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "stats" && { color: theme.primary, fontWeight: "600" },
            ]}
          >
            Statistics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "history" && [styles.activeTab, { borderColor: theme.primary }],
          ]}
          onPress={() => setActiveTab("history")}
        >
          <AntDesign
            name="calendar"
            size={20}
            color={activeTab === "history" ? theme.primary : "#666666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && { color: theme.primary, fontWeight: "600" },
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : activeTab === "stats" ? (
        renderStatsTab()
      ) : (
        renderHistoryTab()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chartOuterContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  scrollableChartContent: {
    paddingRight: 20, // Add some padding at the end for better scrolling
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    position: "absolute",
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
    paddingBottom: 20,
  },
  cloudStorageCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cloudStorageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cloudStorageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0ECFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cloudStorageContent: {
    flex: 1,
  },
  cloudStorageTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#242424",
    marginBottom: 4,
  },
  cloudStorageDescription: {
    fontSize: 12,
    color: "#666666",
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
  scrollToButton: {
    backgroundColor: "#7158e2",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
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
  chartContainer: {
    position: "relative",
    marginHorizontal: 20,
  },
  chart: {
    borderRadius: 16,
    elevation: 5,
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  dataPointTooltip: {
    position: "absolute",
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignItems: "center",
    top: 40, // Position above the chart
    zIndex: 10,
  },
  tooltipDate: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  tooltipValue: {
    color: "#FFF",
    fontSize: 12,
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: "#333",
    transform: [{ rotate: "45deg" }],
  },
  chartLegend: {
    alignItems: "center",
    marginTop: 10,
  },
  chartLegendText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
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
    height: 150, // Reduced from 220
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
  streakBarsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 1,
    justifyContent: "space-around",
  },
  streakBar: {
    width: 4, // Thinner bars
    borderRadius: 2,
    marginHorizontal: 1, // Closer together
  },
  streakGraphCaption: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    marginTop: 10,
  },
  emptyStreakContainer: {
    height: 150, // Reduced from 220
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
