package hvault.app.dto;

import java.util.List;

public class ProfilePostResponse {
    private String id;          // clip id (keeps the existing clip-detail modal working)
    private String postId;
    private String title;       // the post caption (falls back to the clip title)
    private String game;
    private String thumbnailUrl;
    private Double duration;
    private List<String> tags;
    private String dateCreated;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPostId() { return postId; }
    public void setPostId(String postId) { this.postId = postId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getGame() { return game; }
    public void setGame(String game) { this.game = game; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public Double getDuration() { return duration; }
    public void setDuration(Double duration) { this.duration = duration; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getDateCreated() { return dateCreated; }
    public void setDateCreated(String dateCreated) { this.dateCreated = dateCreated; }
}
