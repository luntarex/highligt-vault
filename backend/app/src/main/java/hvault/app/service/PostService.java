package hvault.app.service;

import hvault.app.entity.Post;
import hvault.app.repository.PostRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PostService {
    private final PostRepository postRepository;
    private final hvault.app.repository.ClipRepository clipRepository;

    public PostService(PostRepository postRepository, hvault.app.repository.ClipRepository clipRepository) {
        this.postRepository = postRepository;
        this.clipRepository = clipRepository;
    }

    public Long createPost(Long userId, Long clipId, String caption) {
        Post post = new Post();
        post.setUserId(userId);
        post.setClipId(clipId);
        post.setCaption(caption);
        return postRepository.insertPost(post);
    }

    public void updatePostCaption(Long id, String newCaption) {
        postRepository.updateCaption(id, newCaption);
    }

    public List<Map<String, Object>> getAllPosts() {
        return getAllPostsForUser(null);
    }

    public List<Map<String, Object>> getAllPostsForUser(Long currentUserId) {
        return postRepository.findAllPostsWithDetails().stream().map(row -> {
            Map<String, Object> mapped = new HashMap<>();
            Long postId = ((Number) row.get("id")).longValue();
            Long clipId = ((Number) row.get("clip_id")).longValue();
            
            mapped.put("id", postId.toString());
            mapped.put("clipId", clipId.toString());
            mapped.put("title", row.get("caption"));
            mapped.put("game", row.get("game_name"));
            mapped.put("videoUrl", row.get("video_url"));
            mapped.put("likes", row.get("likes"));
            mapped.put("comments", row.get("comments"));
            mapped.put("timeAgo", "Recently");

            if (currentUserId != null) {
                mapped.put("isLiked", postRepository.isLikedByUser(postId, currentUserId));
                mapped.put("isFavorited", clipRepository.isFavorited(currentUserId, clipId));
            } else {
                mapped.put("isLiked", false);
                mapped.put("isFavorited", false);
            }

            Map<String, Object> author = new HashMap<>();
            author.put("id", row.get("author_id"));
            author.put("username", row.get("author_name"));
            author.put("profilePhotoUrl", row.get("author_photo"));
            mapped.put("author", author);

            return mapped;
        }).collect(Collectors.toList());
    }

    public void likePost(Long postId, Long userId) {
        postRepository.likePost(postId, userId);
    }

    public void unlikePost(Long postId, Long userId) {
        postRepository.unlikePost(postId, userId);
    }
}
