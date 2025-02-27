import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Thermometer } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from './Navbar';
import { useNavigation } from '@react-navigation/native'; // Import navigation
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';

type TrendingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Trending'
>;

interface Post {
  PostID: string;
  PromptID: string;
  PostText: string;
  UpvoteCount: number;
  DownvoteCount: number;
  PromptText?: string; // Optional because it's added later
  Category?: string;
}

interface UserData {
  UserID: string;
  Username: string;
}

const getUserId = async () => {
  try {
    const userId = await AsyncStorage.getItem('UserID');
    if (userId !== null) {
      return userId;
    }
    console.log('User not logged in');
    return null;
  } catch (error) {
    console.error('Error retrieving userId from AsyncStorage', error);
    return null;
  }
};

export default function ProfileScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userLoading, setUserLoading] = useState(true);
  const [controversyScore, setControversyScore] = useState<number>(0);

  const navigation = useNavigation<TrendingScreenNavigationProp>(); // Use navigation hook

  useEffect(() => {
    const fetchUserData = async () => {
      setUserLoading(true);
      try {
        const userId = await getUserId();
        if (!userId) {
          setError('User ID is not available');
          setUserLoading(false);
          return;
        }

        const response = await fetch(`http://34.139.77.174/api/user/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData: UserData = await response.json();
        setUsername(userData.Username);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
      } finally {
        setUserLoading(false);
      }
    };

    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const userId = await getUserId();
        if (!userId) {
          setError('User ID is not available');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`http://34.139.77.174/api/user/${userId}/posts`);
        const data = await response.json();

        let totalVotes = 0;

        const postsWithPrompts = await Promise.all(
          data.posts.map(async (post: Post) => {
            totalVotes += post.UpvoteCount + post.DownvoteCount;
            console.log('Total votes: ', totalVotes);
            try {
              const promptResponse = await fetch(
                `http://34.139.77.174/api/prompt/${post.PromptID}`
              );
              if (!promptResponse.ok) {
                console.error('Failed to fetch prompt for post:', post.PromptID);
                return { ...post, PromptText: '', Category: '' }; // Fallback values
              }
              const prompt = await promptResponse.json();
              const { PromptText, Category } = prompt;
              return { ...post, PromptText, Category };
            } catch (error) {
              console.error('Error fetching prompt:', error);
              return { ...post, PromptText: '', Category: '' }; // Fallback values
            }
          })
        );
        setPosts(postsWithPrompts);
        setControversyScore(totalVotes);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchPosts();
  }, []);

  const navigateToReplies = (postId: string, promptId: string) => {
    navigation.navigate('Replies', {
      postId: Number(postId),
      promptId: Number(promptId),
    });
  };

  const renderPosts = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#1a1a1a" />;
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    if (!posts.length) {
      return <Text style={styles.emptyText}>No posts yet</Text>;
    }

    return posts.map((post, index) => (
      <TouchableOpacity
        key={post.PostID || index}
        style={styles.card}
        onPress={() => navigateToReplies(post.PostID, post.PromptID)} // Navigate with postId and promptId
      >
        <Text style={styles.promptText}>
          {post.PromptText || 'No prompt available'}
        </Text>
        <Text style={styles.postText}>{post.PostText}</Text>
        <View style={styles.scoreContainer}>
          <Thermometer size={20} color="#1a1a1a" />
          <Text style={styles.scoreText}>{post.UpvoteCount}</Text>
        </View>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <Image
              source={require('../assets/images/default_pfp.png')}
              style={styles.avatar}
            />
            {userLoading ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <Text style={styles.username}>{username || 'Unknown User'}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton} // Navigate to EditProfileScreen
          >
            <Text style={styles.editButtonText}>edit profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoreSection}>
          <Text style={styles.scoreTitle}>controversy score</Text>
          <Text style={styles.scoreValue}>{controversyScore}</Text>
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>your posts</Text>
          {renderPosts()}
        </View>
      </ScrollView>

      <Navbar activeNav={'profile'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontSize: 24,
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  scoreTitle: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '600',
  },
  postsSection: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  postText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});
