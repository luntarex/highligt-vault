package hvault.app.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import hvault.app.repository.ClipRepository;

@Service
public class ClipService {
    private final ClipRepository clipRepository;

    public ClipService(ClipRepository clipRepository) {
        this.clipRepository = clipRepository;
    }

    public List<Map<String, Object>> getClipsCommentedByUser(Long userId) {
        return clipRepository.findClipsCommentedByUser(userId);
    }

    public List<Map<String, Object>> getClipsByUserId(Long uploaderId) {
        return clipRepository.findAllByUserId(uploaderId);
    }
    
    public List<Map<String, Object>> getAllClips() {
        return clipRepository.findAllClips();
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

        Long clipId = clipRepository.insertClip(title, videoUrl, thumbnailUrl, duration, startTime, endTime, notes, uploaderId);

        List<String> tags = (List<String>) clipData.get("tags");
        if (tags != null) {
            for (String tag : tags) {
                clipRepository.insertTagIfNotExistAndLink(clipId, tag.trim().toLowerCase());
            }
        }
    }

    @SuppressWarnings("unchecked")
    public void updateClip(Long id, Map<String, Object> clipData) {
        String title = (String) clipData.get("title");
        String notes = (String) clipData.get("notes");
        
        clipRepository.updateClip(id, title, notes);
        
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

    public List<Map<String, Object>> getDeletedClipsByUserId(Long uploaderId) {
        return clipRepository.findAllDeletedByUserId(uploaderId);
    }

    public void recoverClip(Long id) {
        clipRepository.recoverClip(id);
    }
}
