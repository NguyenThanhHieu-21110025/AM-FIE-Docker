import { User } from './User';

// Các loại thông báo
export type NotificationType = 'asset' | 'room' | 'user' | 'system';

// Interface chính cho Notification
export interface Notification {
  _id: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  
  // Thông tin liên kết đến đối tượng
  relatedItem?: string;
  itemModel?: 'Asset' | 'Room' | 'User';
  
  // Thông tin bổ sung (có thể mở rộng sau này)
  metadata?: Record<string, any>;
}

// Interface cho request API
export interface NotificationRequest {
  message: string;
  type: NotificationType;
  relatedItem?: string;
  itemModel?: 'Asset' | 'Room' | 'User';
}

// Constant cho API URL
const NOTIFICATION_API_URL = import.meta.env.VITE_API_URL + '/notifications';

/**
 * Lấy danh sách thông báo của người dùng
 */
export async function getNotifications(token: string): Promise<Notification[]> {
    try {
      console.log('Calling API at:', NOTIFICATION_API_URL);
      
      const res = await fetch(NOTIFICATION_API_URL, {
        headers: { token: `Bearer ${token}` },
      });
      
      // Kiểm tra response trước khi xử lý
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        return [];
      }
      
      const data = await res.json();
      console.log('API response data:', data);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

/**
 * Đánh dấu một thông báo là đã đọc
 */
export async function markAsRead(id: string, token: string): Promise<boolean> {
  try {
    if (!token) {
        console.error('No access token available');
        return false;
      }

    const response = await fetch(`${NOTIFICATION_API_URL}/${id}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        token: `Bearer ${token}`  
    }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllAsRead(token: string): Promise<boolean> {
  try {
    if (!token) {
        console.error('No access token available');
        return false;
      }
    const response = await fetch(`${NOTIFICATION_API_URL}/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          token: `Bearer ${token}`  
        }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Tạo thông báo mới (chỉ dành cho admin hoặc hệ thống)
 */
export async function createNotification(
  notification: NotificationRequest,
  token: string
): Promise<Notification | null> {
  try {
    const response = await fetch(NOTIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: `Bearer ${token}`
      },
      body: JSON.stringify(notification)
    });
    
    if (!response.ok) {
      throw new Error('Lỗi khi tạo thông báo');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Định dạng thời gian tương đối cho thông báo
 */
export function formatNotificationTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return "Vài phút trước";
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  if (diffInHours < 48) return "Hôm qua";

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ngày trước`;
}

/**
 * Hook để sử dụng hệ thống thông báo
 */
export const useNotificationSystem = () => {
  // Có thể mở rộng thành một custom hook sau này
};