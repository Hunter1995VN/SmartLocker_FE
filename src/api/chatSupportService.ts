import apiClient from './client';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp?: Date;
}

export interface ChatSupportRequest {
    message: string;
    history?: { role: string; content: string }[];
}

export interface ChatSupportResponse {
    reply: string;
    suggestedQuestions?: string[];
}

export const chatSupportService = {
    async sendMessage(request: ChatSupportRequest): Promise<ChatSupportResponse> {
        const res = await apiClient.post<ChatSupportResponse>('/api/support/chat', request);
        return res.data;
    }
};

export default chatSupportService;
