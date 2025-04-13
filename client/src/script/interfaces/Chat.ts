export interface Chat {
    id?: string;
    sessionId?: string;
    userId?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date | string;
    metadata?: Record<string, any>;
    
    // Các trường tương thích ngược để dễ dàng chuyển đổi
    userInput?: string;
    botResponse?: string;
    sender?: 'user' | 'bot';
    text?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    userId?: string;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    messages?: Chat[];
    metadata?: Record<string, any>;
}