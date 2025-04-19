import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Feather, FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Comment, Intention } from "../types";
import { styles } from "../styles";

interface IntentionCardProps {
  item: Intention;
  currentUserId: string;
  onLike: (intentionId: string, isLiked: boolean) => void;
  onComment: (intentionId: string) => void;
  onEdit: (intention: Intention) => void;
  onDelete: (intentionId: string) => void;
  likeScaleAnim: Animated.Value;
  likeOpacityAnim: Animated.Value;
  isCommentsExpanded: boolean;
  comments: Comment[];
  newComment: string;
  setNewComment: (text: string) => void;
  handleAddComment: (intentionId: string) => void;
  commentsLoading: boolean;
  userRole: string;
}

const IntentionCard: React.FC<IntentionCardProps> = ({
  item,
  currentUserId,
  onLike,
  onComment,
  onEdit,
  onDelete,
  likeScaleAnim,
  likeOpacityAnim,
  isCommentsExpanded,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  commentsLoading,
  userRole,
}) => {
  const renderCommentItem = ({ item: comment }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Feather name="user" size={18} color="#4361EE" />
        </View>
        <View style={styles.commentUser}>
          <Text style={styles.commentUserName}>
            {comment.user.first_name} {comment.user.last_name}
          </Text>
          <Text style={styles.commentTime}>
            {new Date(comment.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {new Date(comment.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
    </View>
  );

  return (
    <View style={styles.intentionCard}>
      <LinearGradient
        colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.intentionHeader}>
          <View style={styles.intentionAvatar}>
            <Feather name="user" size={18} color="#4361EE" />
          </View>
          <View style={styles.intentionHeaderText}>
            <Text style={styles.intentionAuthor}>
              {item.user.first_name} {item.user.last_name}
              {item.user_id === currentUserId && <Text style={styles.authorTag}> • You</Text>}
            </Text>
            <View style={styles.intentionMeta}>
              <View style={styles.intentionTypeTag}>
                {item.type === "prayer" ? (
                  <FontAwesome5 name="pray" size={12} color="#4361EE" />
                ) : item.type === "praise" ? (
                  <FontAwesome5 name="church" size={12} color="#4361EE" />
                ) : item.type === "spiritual" ? (
                  <FontAwesome name="star" size={12} color="#4361EE" />
                ) : item.type === "family" ? (
                  <Feather name="users" size={12} color="#4361EE" />
                ) : item.type === "health" ? (
                  <Feather name="heart" size={12} color="#4361EE" />
                ) : item.type === "work" ? (
                  <Feather name="briefcase" size={12} color="#4361EE" />
                ) : item.type === "personal" ? (
                  <Feather name="user" size={12} color="#4361EE" />
                ) : (
                  <FontAwesome5 name="pray" size={12} color="#4361EE" />
                )}
                <Text style={styles.intentionTypeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
              <Text style={styles.intentionTime}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                • {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {item.church && (
              <View style={styles.churchTag}>
                <FontAwesome5 name="church" size={12} color="#4361EE" />
                <Text style={styles.churchTagText}>
                  {item.visibility === "Church" ? "Shared with: " : "Church: "}
                  {item.church.name}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.intentionContent}>
          <Text style={styles.intentionTitle}>{item.title}</Text>
          <Text style={styles.intentionDescription}>{item.description}</Text>
        </View>
        <View style={styles.intentionActions}>
          <TouchableOpacity
            style={[styles.intentionAction, item.is_liked && styles.intentionActionActive]}
            onPress={() => onLike(item.id, !!item.is_liked)}
          >
            <View style={styles.likeButtonContainer}>
              <Animated.View
                style={[
                  styles.likeRipple,
                  {
                    opacity: likeOpacityAnim,
                    transform: [{ scale: Animated.multiply(likeScaleAnim, 2) }],
                  },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
                <FontAwesome
                  name={item.is_liked ? "heart" : "heart-o"}
                  size={18}
                  color={item.is_liked ? "#E9967A" : "#4361EE"}
                />
              </Animated.View>
            </View>
            <Text style={[styles.actionText, item.is_liked && styles.actionTextActive]}>
              {item.is_liked ? "Prayed" : "Pray"} {item.likes_count ? `(${item.likes_count})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.intentionAction} onPress={() => onComment(item.id)}>
            <Feather name="message-circle" size={18} color="#4361EE" />
            <Text style={styles.actionText}>
              {isCommentsExpanded ? "Hide Comments" : "Comment"}{" "}
              {item.comments_count ? `(${item.comments_count})` : ""}
            </Text>
          </TouchableOpacity>
          {(item.user_id === currentUserId || userRole === "admin" || userRole === "pastor") && (
            <TouchableOpacity style={styles.intentionAction} onPress={() => onEdit(item)}>
              <Feather name="edit" size={18} color="#4361EE" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}
          {(item.user_id === currentUserId || userRole === "admin" || userRole === "pastor") && (
            <TouchableOpacity style={styles.intentionAction} onPress={() => onDelete(item.id)}>
              <Feather name="trash-2" size={18} color="#E9967A" />
              <Text style={[styles.actionText, { color: "#E9967A" }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
        {isCommentsExpanded && (
          <View style={styles.commentsSection}>
            <View style={styles.commentsDivider} />
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="rgba(67, 97, 238, 0.5)"
                value={newComment}
                onChangeText={setNewComment}
                multiline={true}
                inputAccessoryViewID="accessoryViewID"
              />
              <TouchableOpacity style={styles.sendButton} onPress={() => handleAddComment(item.id)}>
                <Feather name="send" size={22} color="#4361EE" />
              </TouchableOpacity>
            </View>
            {commentsLoading ? (
              <ActivityIndicator size="small" color="#4361EE" style={styles.commentsLoading} />
            ) : (
              <>
                {comments.length > 0 ? (
                  <FlatList
                    data={comments}
                    renderItem={renderCommentItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.commentsList}
                  />
                ) : (
                  <View style={styles.emptyComments}>
                    <Text style={styles.emptyCommentsText}>No comments yet.</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default IntentionCard;