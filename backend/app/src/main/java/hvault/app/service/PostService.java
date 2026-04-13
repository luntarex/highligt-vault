package hvault.app.service;

import hvault.app.entity.Post;
import hvault.app.repository.PostRepository;
import org.springframework.stereotype.Service;

@Service
public class PostService {
    private final PostRepository postRepository;

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
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

    public java.util.List<java.util.Map<String, Object>> getAllPosts() {
        // Map the flat SQL result into nested JSON structure expected by Angular
        return postRepository.findAllPostsWithDetails().stream().map(row -> {
            java.util.Map<String, Object> mapped = new java.util.HashMap<>();
            mapped.put("id", row.get("id").toString());
            mapped.put("title", row.get("caption")); // Angular uses 'title' for post caption
            mapped.put("game", row.get("game_name"));
            mapped.put("videoUrl", row.get("video_url"));
            mapped.put("likes", row.get("likes"));
            mapped.put("comments", row.get("comments"));
            mapped.put("timeAgo", "Recently"); // simplified
            
            java.util.Map<String, Object> author = new java.util.HashMap<>();
            author.put("id", row.get("author_id"));
            author.put("username", row.get("author_name"));
            author.put("profilePhotoUrl", row.get("author_photo"));
            mapped.put("author", author);
            
            return mapped;
        }).collect(java.util.stream.Collectors.toList());
    }
}
