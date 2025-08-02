
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, User, Bot } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { arabicTutor, type ArabicTutorInput } from '@/ai/flows/tutor-flow';


type Message = {
    role: 'user' | 'model';
    content: { text: string }[];
};

export function AiTutor({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: [{ text: input }] };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const flowInput: ArabicTutorInput = {
                history: newMessages,
            };
            const result = await arabicTutor(flowInput);
            const modelMessage: Message = { role: 'model', content: [{ text: result.answer }] };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Error calling AI tutor flow:", error);
            const errorMessage: Message = { role: 'model', content: [{ text: 'عذرًا، حدث خطأ ما. الرجاء المحاولة مرة أخرى.' }] };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [input, messages, isLoading]);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2 font-headline text-primary">
                        <Sparkles className="h-5 w-5" />
                        المعلم الذكي
                    </DialogTitle>
                    <DialogDescription>
                        اطرح أي سؤال يتعلق باللغة العربية وآدابها.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    <div className="space-y-6">
                        {messages.length === 0 && (
                             <div className="text-center text-muted-foreground py-8">
                                <Bot className="h-12 w-12 mx-auto mb-4" />
                                <p>مرحباً بك! أنا المعلم الذكي.</p>
                                <p>اسألني عن أي شيء في النحو، البلاغة، أو الأدب.</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                                {m.role === 'model' && (
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Bot className="h-6 w-6 text-primary" />
                                    </div>
                                )}
                                <div className={`rounded-lg p-3 max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="whitespace-pre-wrap text-sm">{m.content[0].text}</p>
                                </div>
                                {m.role === 'user' && (
                                     <div className="bg-muted p-2 rounded-full">
                                        <User className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-start gap-3">
                                 <div className="bg-primary/10 p-2 rounded-full">
                                    <Bot className="h-6 w-6 text-primary" />
                                </div>
                                <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm text-muted-foreground">جاري الكتابة...</span>
                                </div>
                            </div>
                         )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t">
                    <div className="flex items-center w-full space-x-2 rtl:space-x-reverse">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="اكتب سؤالك هنا..."
                            className="flex-1 resize-none text-foreground"
                            rows={1}
                            disabled={isLoading}
                        />
                        <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
