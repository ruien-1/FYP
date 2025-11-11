// HomeTab.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { TimerContext } from "../Home/TimerContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";
import { Ionicons } from '@expo/vector-icons';

export default function HomeTab() {
  const navigation = useNavigation();
  const { timeUnits, activePlan, startDate, expiryDate } = useContext(TimerContext);
  const isFocused = useIsFocused();

  const [weightData, setWeightData] = useState([]);
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [goalLineData, setGoalLineData] = useState([]);
  const [goal, setGoal] = useState(0);
  const [target, setTarget] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  const fetchWeightProgress = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const res = await API.get(`/weight_progress/${uid}`);
      setWeightData(res.data || []);
    } catch (err) {
    } finally {
      setLoadingWeight(false);
    }
  };

  const fetchGoal = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const goalRes = await API.get(`/goals/${uid}`);
      const goalData = goalRes.data;

      const match = goalData?.weightLossGoal?.match(/[\d.]+/);
      const weeklyLoss = match ? parseFloat(match[0]) : 0.3;

      const userRes = await API.get(`/user_info/${uid}`);
      const initialWeight = parseFloat(userRes.data?.weight) || 65;
      const targetWeight = parseFloat(goalData?.targetWeight) || initialWeight - 5;

      setGoal(targetWeight);
      setTarget(weeklyLoss);

      if (weightData.length > 0) {
        const goalDataArray = weightData.map((_, index) => {
          const expectedWeight = initialWeight - (weeklyLoss / 7) * index;
          const validValue = Math.max(targetWeight, expectedWeight);
          const rounded = parseFloat(validValue.toFixed(2));
          return isFinite(rounded) && !isNaN(rounded) ? rounded : targetWeight;
        });

        const cleanedData = goalDataArray.filter(
          (val) => typeof val === "number" && isFinite(val)
        );

        setGoalLineData(cleanedData);
      }
    } catch (err) {
    }
  };

  const fetchArticles = async () => {
    try {
      setLoadingArticles(true);
      const response = await API.get('/articles/all?limit=20');
      
      if (response.data.success) {
        setArticles(response.data.articles || []);
      }
    } catch (err) {
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchWeightProgress();
      fetchArticles();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && weightData.length > 0) {
      fetchGoal();
    }
  }, [isFocused, weightData]);

  const getDisplayAuthorName = (article) => {
    const name = article.authorName || (article.authorType === 'coach' ? 'Coach' : 'Nutritionist');
    const prefix = article.authorType === 'coach' ? 'Coach' : 'Nutritionist';
    
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      return name;
    }
    
    return `${prefix} ${name}`;
  };

  const handleArticlePress = async (article) => {
    if (article.articleLink) {
      try {
        const supported = await Linking.canOpenURL(article.articleLink);
        if (supported) {
          await Linking.openURL(article.articleLink);
        } else {
          Alert.alert("Error", "Cannot open this link");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to open the article link");
      }
    }
  };

  const renderArticleCard = (article, index) => {
    const articlePhotos = article.photos || (article.imageUrl ? [article.imageUrl] : []);
    const hasPhotos = articlePhotos.length > 0;
    const hasLink = !!article.articleLink;

    return (
      <TouchableOpacity 
        key={article.id || index} 
        style={styles.articleCard}
        activeOpacity={0.7}
        onPress={() => handleArticlePress(article)}
        disabled={!hasLink}
      >
        {hasPhotos ? (
          <View style={styles.imagesContainer}>
            {articlePhotos.slice(0, 2).map((photo, photoIndex) => (
              <Image
                key={photoIndex}
                source={{ uri: photo }}
                style={[
                  styles.articleImage,
                  articlePhotos.length === 1 && styles.singleImage,
                ]}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <View style={[styles.articleImage, styles.singleImage, styles.placeholderImage]}>
            <Ionicons name="newspaper-outline" size={40} color="#B0D4FF" />
          </View>
        )}
        
        <View style={styles.articleContent}>
          <View style={styles.articleHeader}>
            <View style={[
              styles.authorBadge,
              article.authorType === 'coach' ? styles.coachBadge : styles.nutritionistBadge
            ]}>
              <Ionicons 
                name={article.authorType === 'coach' ? 'fitness' : 'nutrition'} 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.authorBadgeText}>
                {article.authorType === 'coach' ? 'Coach' : 'Nutritionist'}
              </Text>
            </View>
            {hasLink && (
              <Ionicons name="link-outline" size={18} color="#007AFF" style={styles.linkIcon} />
            )}
          </View>
          
          <Text style={styles.articleTitle} numberOfLines={2}>
            {article.title}
          </Text>
          
          {/* Keywords */}
          {article.keywords && article.keywords.length > 0 && (
            <View style={styles.keywordsContainer}>
              {article.keywords.slice(0, 3).map((keyword, idx) => (
                <View key={idx} style={styles.keywordTag}>
                  <Text style={styles.keywordText}>#{keyword}</Text>
                </View>
              ))}
              {article.keywords.length > 3 && (
                <Text style={styles.moreKeywords}>+{article.keywords.length - 3}</Text>
              )}
            </View>
          )}
          
          <Text style={styles.articleText} numberOfLines={3}>
            {article.content || article.description}
          </Text>

          {/* Article Link Display */}
          {hasLink && (
            <View style={styles.linkContainer}>
              <Ionicons name="open-outline" size={12} color="#007AFF" />
              <Text style={styles.linkText} numberOfLines={1}>
                {article.articleLink}
              </Text>
            </View>
          )}
          
          <View style={styles.articleFooter}>
            <View style={styles.authorInfo}>
              <Ionicons name="person-circle-outline" size={16} color="#666" />
              <Text style={styles.authorName} numberOfLines={1}>
                {getDisplayAuthorName(article)}
              </Text>
            </View>
            {article.createdAt && (
              <Text style={styles.articleDate}>
                {new Date(article.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Home</Text>

        {/* Progress Tracker */}
        <View style={styles.cardGreen}>
          <Text style={styles.sectionTitle}>Progress Tracker</Text>

          {loadingWeight ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 30 }} />
          ) : weightData.length === 0 || goalLineData.length === 0 ? (
            <Text style={{ textAlign: "center", marginVertical: 20 }}>
              No weight data available yet.
            </Text>
          ) : (
            <LineChart
              data={{
                labels: weightData.map((item) => item.date.slice(5)),
                datasets: [
                  {
                    data: weightData.map((item) => item.weight),
                    color: () => "#2ECC71",
                    strokeWidth: 2,
                  },
                  {
                    data: goalLineData,
                    color: () => "#FF6B6B",
                    strokeWidth: 2,
                  },
                ],
                legend: ["Actual", "Goal"],
              }}
              width={Dimensions.get("window").width - 60}
              height={220}
              yAxisSuffix="kg"
              chartConfig={{
                backgroundGradientFrom: "#E9FCE8",
                backgroundGradientTo: "#E9FCE8",
                color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#27AE60",
                },
              }}
              style={{
                borderRadius: 12,
                marginVertical: 10,
                alignSelf: "center",
              }}
            />
          )}

          {/* Stats */}
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>Goal: {goal} KG</Text>
            <Text style={styles.stateText}>Target: Lose {target} kg/week</Text>
            <Text style={styles.stateText}>Weight Loss: 3 KG</Text>
            <Text style={styles.stateText}>Steps: 10,231</Text>
          </View>
        </View>

        {/* IF Timer Card */}
        <TouchableOpacity
          style={styles.timerCard}
          onPress={() => navigation.navigate("IFTimer")}
          activeOpacity={0.8}
        >
          <View style={styles.timerHeader}>
            <View style={styles.timerIconContainer}>
              <Ionicons name="timer" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.timerTitle}>Intermittent Fasting</Text>
          </View>
          
          {!activePlan ? (
            <View style={styles.timerNotStarted}>
              <Text style={styles.timerNotStartedText}>Tap to start your fast</Text>
              <Ionicons name="chevron-forward" size={20} color="#92400E" />
            </View>
          ) : (
            <View style={styles.timerActive}>
              <Text style={styles.timerTime}>
                {String(timeUnits.hours).padStart(2, '0')}:{String(timeUnits.minutes).padStart(2, '0')}:{String(timeUnits.seconds).padStart(2, '0')}
              </Text>
              <Text style={styles.timerLabel}>
                {startDate && new Date() < startDate ? 'Starting in' : 'Time Remaining'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Articles Section */}
        <View style={styles.articlesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="book" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Health & Fitness Articles</Text>
            </View>
          </View>
          
          {loadingArticles ? (
            <View style={styles.articlesLoading}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : articles.length === 0 ? (
            <View style={styles.emptyArticles}>
              <Ionicons name="newspaper-outline" size={56} color="#B0D4FF" />
              <Text style={styles.emptyArticlesTitle}>No Articles Yet</Text>
              <Text style={styles.emptyArticlesText}>
                Check back later for health tips from our experts!
              </Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.articlesScroll}
            >
              {articles.map((article, index) => renderArticleCard(article, index))}
            </ScrollView>
          )}
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F0FF" },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginVertical: 10 },

  cardGreen: {
    backgroundColor: "#CDEBC3",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  stateBox: { marginTop: 15 },
  stateText: { fontSize: 12, color: "#333", marginBottom: 2 },

  timerCard: {
    backgroundColor: '#FFF3B0',
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  timerNotStarted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timerNotStartedText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '600',
  },
  timerActive: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  timerTime: {
    fontSize: 36,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 4,
  },

  articlesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  articlesLoading: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyArticles: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyArticlesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
  },
  emptyArticlesText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  articlesScroll: {
    paddingRight: 16,
  },

  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 16,
    width: 280,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  imagesContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 160,
  },
  articleImage: {
    width: '50%',
    height: 160,
    backgroundColor: '#F1F5F9',
  },
  singleImage: {
    width: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    padding: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coachBadge: {
    backgroundColor: '#FF6B35',
  },
  nutritionistBadge: {
    backgroundColor: '#27AE60',
  },
  authorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkIcon: {
    marginLeft: 'auto',
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
    marginBottom: 8,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  keywordTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  moreKeywords: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  articleText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  linkText: {
    fontSize: 11,
    color: '#007AFF',
    flex: 1,
    fontWeight: '500',
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  articleDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  footer: {
    height: 40,
  },
});