import React, { useState, useRef, useEffect } from 'react';
import { 
    X, 
    Send, 
    Bot, 
    User, 
    RotateCcw, 
    Minimize2, 
    Sparkles, 
    ChevronDown,
    HelpCircle,
    PhoneCall
} from 'lucide-react';
import { chatSupportService, type ChatMessage } from '../../api/chatSupportService';

const DEFAULT_SUGGESTIONS = [
    'Bảng giá thuê tủ các size?',
    'Cách đặt & nhận tủ tại trạm?',
    'Làm sao để gia hạn thêm giờ?',
    'Quy định hàng cấm gửi?',
    'Tủ kẹt hoặc quên mã PIN?'
];

export const SupportChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [showTeaser, setShowTeaser] = useState(true);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            content: 'Xin chào! Em là **Trợ lý SmartLocker AI** 🤖\n\nEm có thể hỗ trợ anh/chị tìm hiểu bảng giá, cách đặt & mở tủ qua mã QR/PIN, gia hạn giờ gửi hoặc hướng dẫn xử lý sự cố. Anh/chị cần em hỗ trợ điều gì hôm nay ạ?',
            timestamp: new Date()
        }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Tự động cuộn xuống tin nhắn mới nhất
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
            inputRef.current?.focus();
        }
    }, [messages, isOpen, isMinimized]);

    // Tự động ẩn teaser sau 8 giây nếu chưa bấm
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTeaser(false);
        }, 9000);
        return () => clearTimeout(timer);
    }, []);

    const handleSend = async (messageText?: string) => {
        const text = (messageText ?? input).trim();
        if (!text || loading) return;

        const userMsg: ChatMessage = {
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInput('');
        setLoading(true);

        try {
            // Chuyển đổi định dạng cho backend
            const historyDto = updatedHistory.map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await chatSupportService.sendMessage({
                message: text,
                history: historyDto
            });

            const botMsg: ChatMessage = {
                role: 'model',
                content: response.reply,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMsg]);

            if (response.suggestedQuestions && response.suggestedQuestions.length > 0) {
                setSuggestions(response.suggestedQuestions);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    content: 'Dạ hiện kết nối tạm thời bị gián đoạn. Anh/chị có thể liên hệ ngay **Hotline 1900 8888** hoặc chọn các câu hỏi nhanh bên dưới để em giải đáp nhé!',
                    timestamp: new Date()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([
            {
                role: 'model',
                content: 'Cuộc trò chuyện đã được làm mới. Em là **Trợ lý SmartLocker AI**. Anh/chị có thắc mắc gì về việc gửi hoặc nhận đồ không ạ?',
                timestamp: new Date()
            }
        ]);
        setSuggestions(DEFAULT_SUGGESTIONS);
    };

    // Hàm render định dạng text (bold, list, xuống dòng)
    const renderContent = (content: string) => {
        const lines = content.split('\n');
        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
                return <div key={idx} className="h-2" />;
            }

            // Gạch đầu dòng
            const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('+ ');
            const lineBody = isBullet ? trimmed.substring(2) : line;

            // Xử lý **bold**
            const parts = lineBody.split(/(\*\*.*?\*\*)/g);
            const renderedParts = parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            if (isBullet) {
                return (
                    <div key={idx} className="flex items-start gap-1.5 my-0.5">
                        <span className="text-blue-500 font-bold select-none">•</span>
                        <div className="flex-1">{renderedParts}</div>
                    </div>
                );
            }

            return <div key={idx} className="my-0.5 leading-relaxed">{renderedParts}</div>;
        });
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end print:hidden">
            {/* Teaser bubble trước khi mở chat */}
            {!isOpen && showTeaser && (
                <div 
                    onClick={() => {
                        setIsOpen(true);
                        setShowTeaser(false);
                    }}
                    className="mb-3 max-w-[280px] bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-800 text-xs cursor-pointer animate-bounce transition-all hover:scale-102 flex items-start gap-2.5"
                >
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            Trợ lý SmartLocker AI
                            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                            Bạn cần tư vấn giá tủ, cách đặt hoặc hỗ trợ nhận đồ không? Nhắn với em nhé!
                        </p>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTeaser(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        aria-label="Đóng gợi ý"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Cửa sổ Chat */}
            {isOpen && (
                <div 
                    className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 overflow-hidden ${
                        isMinimized 
                            ? 'h-14 w-80' 
                            : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh]'
                    }`}
                >
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-700" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                                    SmartLocker Bot
                                    <span className="text-[10px] font-normal px-1.5 py-0.2 bg-white/20 rounded-full">AI Gemini</span>
                                </h3>
                                <p className="text-[11px] text-blue-100/90 leading-none mt-0.5">
                                    Hỗ trợ dịch vụ & trạm tủ 24/7
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleReset}
                                title="Bắt đầu lại cuộc trò chuyện"
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                title={isMinimized ? "Phóng to" : "Thu nhỏ"}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                {isMinimized ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Minimize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                title="Đóng chat"
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Body (khi không bị thu nhỏ) */}
                    {!isMinimized && (
                        <>
                            {/* Message List */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/70 dark:bg-slate-950/40 text-xs sm:text-[13px]">
                                {messages.map((m, index) => {
                                    const isUser = m.role === 'user';
                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div 
                                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                                    isUser 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                            </div>

                                            <div 
                                                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-sm text-slate-800 dark:text-slate-100 ${
                                                    isUser
                                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                                                        : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-tl-xs'
                                                }`}
                                            >
                                                {renderContent(m.content)}
                                                {m.timestamp && (
                                                    <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-100/70' : 'text-slate-400'}`}>
                                                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {loading && (
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-3.5 py-2.5 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5 text-slate-500">
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                                            <span className="text-xs text-slate-400 ml-1">Đang suy nghĩ...</span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Suggestions */}
                            {suggestions.length > 0 && !loading && (
                                <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 w-full font-medium">
                                        <HelpCircle className="w-3 h-3 text-blue-500" />
                                        Gợi ý câu hỏi:
                                    </span>
                                    {suggestions.map((q, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(q)}
                                            className="text-[11px] bg-blue-50 dark:bg-slate-800/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 px-2.5 py-1 rounded-full border border-blue-100 dark:border-slate-700 transition-colors text-left"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Form */}
                            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Nhập câu hỏi cho AI (ví dụ: giá tủ size S?)..."
                                        disabled={loading}
                                        maxLength={1000}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-blue-500/20"
                                        title="Gửi câu hỏi"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>

                                <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <PhoneCall className="w-3 h-3 text-emerald-500" />
                                        Hotline khẩn cấp 24/7: <span className="font-semibold text-slate-600 dark:text-slate-300">1900 8888</span>
                                    </div>
                                    <span>SmartLocker AI</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Nút Floating Action Button (FAB) khi đang đóng */}
            {!isOpen && (
                <button
                    onClick={() => {
                        setIsOpen(true);
                        setShowTeaser(false);
                        setHasUnread(false);
                    }}
                    className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20"
                    aria-label="Mở Trợ lý AI SmartLocker"
                >
                    <Bot className="w-7 h-7 transition-transform group-hover:rotate-6" />
                    
                    {/* Hiệu ứng pulse sóng tròn */}
                    <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping -z-10" />

                    {/* Huy hiệu AI */}
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-extrabold rounded-full shadow-sm flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>

                    {hasUnread && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                    )}
                </button>
            )}
        </div>
    );
};

export default SupportChatWidget;
