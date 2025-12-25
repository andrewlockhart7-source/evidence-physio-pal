import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData } from '@/utils/audioUtils';
import { useActivityTracking } from '@/hooks/useActivityTracking';

const VoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionStartRef = useRef<number>(0);
  const { trackCollaboration } = useActivityTracking();

  const connectWebSocket = async () => {
    try {
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to the edge function
      const wsUrl = `wss://xbonrxqrzkuwxovyqrxx.functions.supabase.co/functions/v1/realtime-chat`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VoiceChat] WebSocket connected');
        setIsConnected(true);
        sessionStartRef.current = Date.now();
        toast({
          title: "Connected",
          description: "Voice chat is ready. Start speaking!",
        });
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[VoiceChat] Received:', data.type);

          // Handle both old and new event names
          if (data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') {
            // Play audio chunk
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext({ sampleRate: 24000 });
            }
            
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            await playAudioData(audioContextRef.current, bytes);
            setIsSpeaking(true);
          } else if (data.type === 'response.audio.done' || data.type === 'response.output_audio.done') {
            setIsSpeaking(false);
          } else if (data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') {
            setTranscript(prev => prev + data.delta);
          } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            setTranscript(prev => `You: ${data.transcript}\n\n${prev}`);
          } else if (data.type === 'error') {
            console.error('[VoiceChat] Error:', data);
            const message = data.error?.message || data.message || "An error occurred";
            toast({
              title: "Error",
              description: message,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('[VoiceChat] Message parsing error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[VoiceChat] WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice chat",
          variant: "destructive",
        });
      };

      ws.onclose = () => {
        console.log('[VoiceChat] WebSocket closed');
        setIsConnected(false);
        setIsSpeaking(false);
        if (sessionStartRef.current > 0) {
          trackCollaboration();
        }
      };

      // Start audio recording
      recorderRef.current = new AudioRecorder((audioData) => {
        if (ws.readyState === WebSocket.OPEN) {
          const encoded = encodeAudioForAPI(audioData);
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encoded
          }));
        }
      });

      await recorderRef.current.start();

    } catch (error) {
      console.error('[VoiceChat] Connection error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start voice chat",
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Voice Chat</h3>
          <p className="text-sm text-muted-foreground">
            Have a natural conversation with an AI physiotherapy assistant
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {!isConnected ? (
            <Button
              onClick={connectWebSocket}
              size="lg"
              className="w-full max-w-xs"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Voice Chat
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-4">
                <div className={`p-8 rounded-full ${isSpeaking ? 'bg-primary/20 animate-pulse' : 'bg-muted'}`}>
                  {isSpeaking ? (
                    <Volume2 className="h-12 w-12 text-primary" />
                  ) : (
                    <Mic className="h-12 w-12 text-primary animate-pulse" />
                  )}
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isSpeaking ? 'AI is speaking...' : 'Listening...'}
                </p>
              </div>

              <Button
                onClick={disconnect}
                variant="destructive"
                size="lg"
                className="w-full max-w-xs"
              >
                <MicOff className="mr-2 h-5 w-5" />
                End Chat
              </Button>
            </div>
          )}
        </div>

        {transcript && (
          <div className="mt-6 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoiceChat;
