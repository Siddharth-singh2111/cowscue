"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
    role: "user" | "model";
    content: string;
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", content: "Hi! I'm the Cowscue Assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");

        // Add user message to UI
        const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.slice(1) // 🟢 Skips the initial "model" greeting!
                }),
            });

            if (!res.ok) throw new Error("Failed to fetch response");

            const data = await res.json();

            // Add AI response to UI
            setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
        } catch (error) {
            setMessages((prev) => [...prev, { role: "model", content: "Sorry, I'm having trouble connecting right now." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[100]">
            {/* 🟢 The Chat Window */}
            {isOpen && (
                <Card className="w-[320px] sm:w-[350px] h-[450px] flex flex-col shadow-2xl border-slate-200 mb-4 animate-in slide-in-from-bottom-5">
                    <CardHeader className="bg-slate-900 text-white p-4 rounded-t-xl flex flex-row items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Bot size={18} className="text-orange-500" /> Cowscue Support
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => setIsOpen(false)}>
                            <X size={16} />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === "user"
                                        ? "bg-orange-600 text-white rounded-tr-sm"
                                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm flex gap-1">
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </CardContent>

                    <CardFooter className="p-3 bg-white border-t border-slate-100 rounded-b-xl">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Ask me anything..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 border-slate-200 focus-visible:ring-orange-500"
                            />
                            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="bg-orange-600 hover:bg-orange-700 h-9 w-9 shrink-0">
                                <Send size={16} />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            {/* 🟢 The Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20 text-white flex items-center justify-center transition-transform hover:scale-105"
                >
                    <MessageCircle size={28} />
                </Button>
            )}
        </div>
    );
}