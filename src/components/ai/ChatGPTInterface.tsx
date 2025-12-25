import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Brain, 
  Mic, 
  Volume2, 
  Copy, 
  Download,
  RotateCcw,
  Sparkles,
  Users,
  BookOpen,
  Activity
} from "lucide-react";
import { playTextToSpeech } from "@/utils/audioUtils";
import { useActivityTracking } from "@/hooks/useActivityTracking";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id: string;
}

interface ChatGPTInterfaceProps {
  initialContext?: string;
  specialty?: string;
}

export const ChatGPTInterface = ({ 
  initialContext = "",
  specialty = "physiotherapy" 
}: ChatGPTInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [context, setContext] = useState(initialContext);
  const [isLoading, setIsLoading] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty);
  const [streamingResponse, setStreamingResponse] = useState("");
  const { toast } = useToast();
  const { trackAIChatSession, trackCollaboration } = useActivityTracking();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionStartRef = useRef<Date>(new Date());

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm Dr. PhysioAI, your evidence-based physiotherapy assistant. I'm here to help you with:

• Clinical assessment and treatment planning
• Evidence-based interventions and protocols  
• Research interpretation and application
• Exercise prescription and modifications
• Patient education and self-management
• Professional development questions

How can I assist you today?`,
        timestamp: new Date(),
        id: 'welcome'
      }]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      if (useStreaming) {
        await handleStreamingResponse(userMessage);
      } else {
        await handleNormalResponse(userMessage);
      }

      // Track chat session after successful response
      const durationMinutes = Math.round((new Date().getTime() - sessionStartRef.current.getTime()) / 60000);
      await trackAIChatSession(messages.length + 1, durationMinutes);
      await trackCollaboration();
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response from AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingResponse = async (userMessage: ChatMessage) => {
    const messagesForAPI = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    messagesForAPI.push({
      role: userMessage.role,
      content: userMessage.content
    });

    setStreamingResponse("");
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: "",
      timestamp: new Date(),
      id: (Date.now() + 1).toString()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Use supabase.functions.invoke for streaming
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            context,
            specialty: selectedSpecialty,
            useStream: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        // Fallback to non-streaming if stream is unavailable
        await handleNormalResponse(userMessage);
        return;
      }

      let textBuffer = '';
      const assistantMessageId = assistantMessage.id;
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1); // handle CRLF
          if (line.startsWith(':') || line.trim() === '') continue; // SSE comments/keepalive

          // Support both SSE (data: {...}) and raw JSON/text
          let jsonStr = '';
          if (line.startsWith('data: ')) {
            jsonStr = line.slice(6).trim();
          } else {
            jsonStr = line.trim();
          }

          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const data = JSON.parse(jsonStr);
            const content: string | undefined =
              data.choices?.[0]?.delta?.content ?? // OpenAI chat stream
              data.delta ?? // Realtime transcript delta or generic delta
              data.content; // Fallback

            if (content) {
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + content }
                    : msg
                )
              );
            }
          } catch (e) {
            // If it's not JSON, treat it as raw text chunk
            if (jsonStr) {
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + jsonStr }
                    : msg
                )
              );
            } else {
              // Incomplete JSON split across chunks: put it back and wait for more data
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }

      // Final flush in case remaining buffered lines arrived without trailing newline
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;

          let jsonStr = '';
          if (raw.startsWith('data: ')) {
            jsonStr = raw.slice(6).trim();
          } else {
            jsonStr = raw.trim();
          }
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content: string | undefined =
              parsed.choices?.[0]?.delta?.content ??
              parsed.delta ??
              parsed.content;
            if (content) {
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + content }
                    : msg
                )
              );
            }
          } catch {
            // Treat leftover as plain text
            if (jsonStr) {
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + jsonStr }
                    : msg
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  };

  const handleNormalResponse = async (userMessage: ChatMessage) => {
    const messagesForAPI = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    messagesForAPI.push({
      role: userMessage.role,
      content: userMessage.content
    });

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        messages: messagesForAPI,
        context,
        specialty: selectedSpecialty,
        useStream: false
      }
    });

    if (error) throw error;

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: data.response,
      timestamp: new Date(),
      id: (Date.now() + 1).toString()
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat cleared! I'm ready to help you with any physiotherapy questions or clinical guidance you need.`,
      timestamp: new Date(),
      id: 'clear-' + Date.now()
    }]);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setStreamingResponse("");
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const exportChat = () => {
    const chatText = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}\n\n`
    ).join('');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physio-ai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSpecialtyIcon = (spec: string) => {
    switch (spec) {
      case 'musculoskeletal': return <Activity className="h-4 w-4" />;
      case 'neurological': return <Brain className="h-4 w-4" />;
      case 'cardiopulmonary': return <Activity className="h-4 w-4" />;
      case 'sports': return <Users className="h-4 w-4" />;
      case 'research': return <BookOpen className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                ChatGPT Physiotherapy Assistant
              </CardTitle>
              <CardDescription>
                Advanced AI-powered clinical guidance and evidence-based recommendations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getSpecialtyIcon(selectedSpecialty)}
                {selectedSpecialty}
              </Badge>
              {useStreaming && <Badge variant="secondary">Streaming</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Specialty Focus</Label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physiotherapy">General Physiotherapy</SelectItem>
                  <SelectItem value="musculoskeletal">Musculoskeletal</SelectItem>
                  <SelectItem value="neurological">Neurological</SelectItem>
                  <SelectItem value="cardiopulmonary">Cardiopulmonary</SelectItem>
                  <SelectItem value="sports">Sports Medicine</SelectItem>
                  <SelectItem value="research">Research & Evidence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={useStreaming}
                  onCheckedChange={setUseStreaming}
                />
                <Label className="text-sm">Real-time Streaming</Label>
              </div>
              <Button onClick={clearChat} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={exportChat} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {context && (
            <div className="space-y-2">
              <Label>Context</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add context about patient case, specific condition, or research focus..."
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="h-[600px] min-h-0 flex flex-col">
        <CardContent className="flex-1 min-h-0 flex flex-col p-6 space-y-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 border rounded-lg p-4 bg-gradient-to-b from-background to-muted/20 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {message.role === 'assistant' ? (
                        <Brain className="h-4 w-4 text-primary" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      <span className="font-medium text-sm">
                        {message.role === 'user' ? 'You' : 'Dr. PhysioAI'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => copyMessage(message.content)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {message.role === 'assistant' && (
                        <Button
                          onClick={() => playTextToSpeech(message.content)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed m-0">
                      {message.content}
                    </p>
                  </div>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Dr. PhysioAI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                placeholder="Ask about conditions, treatments, evidence, assessments..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[60px] resize-none pr-12"
                disabled={isLoading}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  onClick={() => playTextToSpeech("Recording voice input is not implemented yet")}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="lg"
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            💡 Tip: Use Shift+Enter for new lines. Ask about specific conditions, treatment protocols, or research evidence.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};