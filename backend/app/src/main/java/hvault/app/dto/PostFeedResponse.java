package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostFeedResponse {
    private String id;
    private String clipId;
    private String communityId;
    private String communityName;
    private String postType;
    private String title;
    private String game;
    private String videoUrl;
    private Double duration;
    private Double startTime;
    private Double endTime;
    private Long likes;
    private Long comments;
    private String createdAt;
    private Boolean isLiked;
    private Boolean isFavorited;
    private PostAuthorResponse author;
    private String repostType;
    private PostFeedResponse originalPost;
}
