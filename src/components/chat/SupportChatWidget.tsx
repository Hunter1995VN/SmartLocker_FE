import React, { useState, useRef, useEffect } from 'react';
import { 
    X, 
    Send, 
    Bot, 
    User, 
    RotateCcw, 
    Minimize2, 
    ChevronDown,
    HelpCircle,
    PhoneCall
} from 'lucide-react';
import { chatSupportService, type ChatMessage } from '../../api/chatSupportService';

const DEFAULT_SUGGESTIONS = [
    'Bảng giá thuê tủ các size?',
    'Cách nhận tủ tại Kiosk?',
    'Hướng dẫn gia hạn thêm giờ',
    'Quy định hàng cấm gửi',
    'Tủ kẹt / Quên mã PIN'
];

export const SupportChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showTeaser, setShowTeaser] = useState(true);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            content: 'Xin chào! Em là **Trợ lý SmartLocker** 🤖\n\nEm hỗ trợ giải đáp bảng giá, kích thước tủ, cách đặt/mở tủ và hướng dẫn sử dụng trạm tủ tại Đà Nẵng. Anh/chị cần em hỗ trợ gì hôm nay ạ?',
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

    // Tự động ẩn teaser sau 9 giây nếu chưa bấm
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
                    content: 'Dạ hiện tại đường truyền kết nối AI đang bận. Anh/chị có thể liên hệ ngay **Hotline 1900 8888** hoặc chọn các câu hỏi nhanh bên dưới để em giải đáp nhé!',
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
                content: 'Cuộc trò chuyện đã được làm mới. Em là **Trợ lý SmartLocker**. Anh/chị cần hỗ trợ gì về dịch vụ gửi tủ không ạ?',
                timestamp: new Date()
            }
        ]);
        setSuggestions(DEFAULT_SUGGESTIONS);
    };

    // Hàm render định dạng text (bold, list, xuống dòng)
    const renderContent = (content: string, isUser: boolean) => {
        const lines = content.split('\n');
        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
                return <div key={idx} className="h-1.5" />;
            }

            // Gạch đầu dòng
            const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('+ ');
            const lineBody = isBullet ? trimmed.substring(2) : line;

            // Xử lý **bold**
            const parts = lineBody.split(/(\*\*.*?\*\*)/g);
            const renderedParts = parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong 
                            key={pIdx} 
                            className={`font-semibold ${isUser ? 'text-white font-bold' : 'text-slate-900'}`}
                        >
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return part;
            });

            if (isBullet) {
                return (
                    <div key={idx} className="flex items-start gap-1.5 my-0.5">
                        <span className={`font-bold select-none ${isUser ? 'text-white' : 'text-blue-600'}`}>•</span>
                        <div className="flex-1">{renderedParts}</div>
                    </div>
                );
            }

            return <div key={idx} className="my-0.5 leading-relaxed">{renderedParts}</div>;
        });
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end print:hidden font-sans">
            {/* Teaser bubble trước khi mở chat */}
            {!isOpen && showTeaser && (
                <div 
                    onClick={() => {
                        setIsOpen(true);
                        setShowTeaser(false);
                    }}
                    className="mb-2.5 max-w-[260px] bg-white p-3 rounded-2xl shadow-lg border border-blue-100 text-xs cursor-pointer transition-all hover:scale-102 flex items-start gap-2.5 text-slate-800"
                >
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-slate-900 text-xs">
                            Trợ lý SmartLocker
                        </div>
                        <p className="text-slate-600 mt-0.5 line-clamp-2 leading-relaxed text-[11px]">
                            Cần tư vấn giá tủ, kích thước hoặc hỗ trợ nhận đồ? Nhắn với em nhé!
                        </p>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTeaser(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        aria-label="Đóng gợi ý"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Cửa sổ Chat - Kích thước gọn gàng, tinh tế, không che màn hình */}
            {isOpen && (
                <div 
                    className={`bg-white rounded-2xl shadow-xl border border-slate-200/90 flex flex-col transition-all duration-300 overflow-hidden ${
                        isMinimized 
                            ? 'h-12 w-64' 
                            : 'w-[calc(100vw-32px)] sm:w-[350px] h-[480px] sm:h-[490px] max-h-[78vh]'
                    }`}
                >
                    {/* Header */}
                    <div className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-blue-700" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xs sm:text-sm leading-tight">
                                    SmartLocker Bot
                                </h3>
                                <p className="text-[10px] text-blue-100/90 leading-none mt-0.5">
                                    Hỗ trợ trạm tủ Đà Nẵng 24/7
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={handleReset}
                                title="Bắt đầu lại cuộc trò chuyện"
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                title={isMinimized ? "Phóng to" : "Thu nhỏ"}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                            >
                                {isMinimized ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <Minimize2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                title="Đóng chat"
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Body (khi không bị thu nhỏ) */}
                    {!isMinimized && (
                        <>
                            {/* Message List - Nền sáng nhẹ #f8faff, thanh cuộn duy nhất */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#f8faff] text-xs sm:text-[13px]">
                                {messages.map((m, index) => {
                                    const isUser = m.role === 'user';
                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div 
                                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                                                    isUser 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-white text-blue-600 border border-blue-100'
                                                }`}
                                            >
                                                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                            </div>

                                            <div 
                                                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-xs leading-relaxed ${
                                                    isUser
                                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                                                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                                                }`}
                                            >
                                                {renderContent(m.content, isUser)}
                                                {m.timestamp && (
                                                    <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-100/80' : 'text-slate-400'}`}>
                                                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {loading && (
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-7 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-xs border border-blue-100">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1.5 text-slate-500">
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                                            <span className="text-xs text-slate-500 font-medium ml-1">Đang suy nghĩ...</span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Suggestions - Gợi ý câu hỏi nhanh: bọc dạng wrap gọn gàng, 100% không tràn viền */}
                            {suggestions.length > 0 && !loading && (
                                <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-200/80">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
                                        <span className="flex items-center gap-1">
                                            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                                            Gợi ý câu hỏi nhanh:
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {suggestions.map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSend(q)}
                                                className="text-[11px] leading-snug bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 px-2.5 py-1.5 rounded-lg border border-blue-200/80 transition-all shadow-xs active:scale-95 cursor-pointer font-medium text-left"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input Form - Nền trắng sáng, sạch sẽ */}
                            <div className="p-2.5 bg-white border-t border-slate-200">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="flex items-center gap-1.5"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Nhập câu hỏi (ví dụ: giá thuê tủ size S?)..."
                                        disabled={loading}
                                        maxLength={1000}
                                        className="flex-1 bg-slate-100/80 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200/80 focus:border-blue-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
                                        title="Gửi câu hỏi"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </form>

                                <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <PhoneCall className="w-3 h-3 text-emerald-600" />
                                        Hotline: <span className="font-semibold text-slate-700">1900 8888</span>
                                    </div>
                                    <span className="font-medium text-slate-400">SmartLocker Support</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Nút Floating Action Button (FAB) khi đang đóng - Tinh tế, không bị che màn hình, bỏ badge AI cam */}
            {!isOpen && (
                <button
                    onClick={() => {
                        setIsOpen(true);
                        setShowTeaser(false);
                    }}
                    className="relative group flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/40 cursor-pointer"
                    aria-label="Mở Trợ lý SmartLocker"
                >
                    <Bot className="w-6 h-6 transition-transform group-hover:rotate-6" />
                    
                    {/* Hiệu ứng pulse sóng tròn */}
                    <span className="absolute -inset-1 rounded-full bg-blue-500/25 animate-ping -z-10" />
                </button>
            )}
        </div>
    );
};

export default SupportChatWidget;
