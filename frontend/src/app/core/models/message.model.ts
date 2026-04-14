export interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export interface Conversation {
    other_user_id: number;
    username: string;
    profile_photo_url: string;
    content: string;
    created_at: string;
    is_read: boolean;
    sender_id: number;
}
