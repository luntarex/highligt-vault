package hvault.app.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import hvault.app.repository.ClipRepository;

@Service
public class ClipService {
    private final ClipRepository clipRepository;
    private final PostService postService;

    public ClipService(ClipRepository clipRepository, PostService postService) {
        this.clipRepository = clipRepository;
        this.postService = postService;
    }

    public List<Map<String, Object>> getClipsCommentedByUser(Long userId) {
        return clipRepository.findClipsCommentedByUser(userId);
    }

    public List<Map<String, Object>> getClipsByUserId(Long uploaderId) {
        List<Map<String, Object>> clips = clipRepository.findAllByUserId(uploaderId);
        for (Map<String, Object> clip : clips) {
            Long clipId = ((Number) clip.get("id")).longValue();
            clip.put("tags", clipRepository.getTagsForClip(clipId));
        }
        return clips;
    }
    
    public List<Map<String, Object>> getAllClips() {
        List<Map<String, Object>> clips = clipRepository.findAllClips();
        for (Map<String, Object> clip : clips) {
            Long clipId = ((Number) clip.get("id")).longValue();
            clip.put("tags", clipRepository.getTagsForClip(clipId));
        }
        return clips;
    }

    public Map<String, Object> getClipById(Long id) {
        Map<String, Object> clip = clipRepository.findById(id);
        if (clip != null) {
            clip.put("tags", clipRepository.getTagsForClip(id));
        }
        return clip;
    }

    @SuppressWarnings("unchecked")
    public void createClip(Map<String, Object> clipData) {
        String title = (String) clipData.get("title");
        String videoUrl = (String) clipData.get("url");
        String thumbnailUrl = (String) clipData.getOrDefault("thumbnailUrl", "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop");
        String notes = (String) clipData.get("notes");
        
        Double duration = clipData.get("duration") != null ? Double.valueOf(clipData.get("duration").toString()) : 0.0;
        Double startTime = clipData.get("startTime") != null ? Double.valueOf(clipData.get("startTime").toString()) : 0.0;
        Double endTime = clipData.get("endTime") != null ? Double.valueOf(clipData.get("endTime").toString()) : 0.0;
        
        Long uploaderId = clipData.get("uploaderId") != null ? Long.valueOf(clipData.get("uploaderId").toString()) : 1L;
        String gameName = (String) clipData.get("game");
        Long gameId = clipRepository.getGameIdByNameOrCreate(gameName);

        Long clipId = clipRepository.insertClip(title, videoUrl, thumbnailUrl, duration, startTime, endTime, notes, uploaderId, gameId);

        List<String> tags = (List<String>) clipData.get("tags");
        if (tags != null) {
            for (String tag : tags) {
                clipRepository.insertTagIfNotExistAndLink(clipId, tag.trim().toLowerCase());
            }
        }
        
        Boolean isPublic = clipData.get("isPublic") != null ? (Boolean) clipData.get("isPublic") : true;
        if (Boolean.TRUE.equals(isPublic)) {
            postService.createPost(uploaderId, clipId, title);
        }
    }

    @SuppressWarnings("unchecked")
    public void updateClip(Long id, Map<String, Object> clipData) {
        String title = (String) clipData.get("title");
        String notes = (String) clipData.get("notes");
        String gameName = (String) clipData.get("game");
        Long gameId = clipRepository.getGameIdByNameOrCreate(gameName);
        
        clipRepository.updateClip(id, title, notes, gameId);
        
        clipRepository.clearTagsForClip(id);
        List<String> tags = (List<String>) clipData.get("tags");
        if (tags != null) {
            for (String tag : tags) {
                clipRepository.insertTagIfNotExistAndLink(id, tag.trim().toLowerCase());
            }
        }
    }
    
    public void deleteClip(Long id) {
        clipRepository.softDeleteClip(id);
    }

    public void hardDeleteClip(Long id) {
        clipRepository.hardDeleteClip(id);
    }

    public List<Map<String, Object>> getDeletedClipsByUserId(Long uploaderId) {
        return clipRepository.findAllDeletedByUserId(uploaderId);
    }

    public void recoverClip(Long id) {
        clipRepository.recoverClip(id);
    }
}
