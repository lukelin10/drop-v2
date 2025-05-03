import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useMessages } from "@/hooks/useMessages";
import { useAppContext } from "@/context/AppContext";
import { formatDateLong } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Chat() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const dropId = parseInt(params.id || "0", 10);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setLoading } = useAppContext();
  
  const { getDrop } = useDrops();
  const { 
    messages, 
    isTyping, 
    sendMessage, 
    messageCount, 
    isLimitReached, 
    MESSAGE_LIMIT 
  } = useMessages(dropId);
  
  const drop = getDrop(dropId);
  // Load the messages when the drop is loaded
  useEffect(() => {
    if (drop) {
      setLoading(false); // Ensure loading state is cleared when drop is found
    }
  }, [drop, setLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    
    sendMessage(newMessage);
    setNewMessage("");
  }

  function handleBack() {
    navigate("/");
  }
  
  function handleEndChat() {
    navigate("/feed");
  }

  if (!drop) {
    return <div className="flex items-center justify-center h-screen text-foreground">Loading...</div>;
  }

  return (
    <section className="flex flex-col h-screen pt-0 bg-[#F7F7F7] rounded-2xl overflow-hidden">
      {/* Chat Header - Updated with Dropbot Chat label and removed white background */}
      <div className="py-3 px-4 border-b border-border/10">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <div className="flex items-center">
            <button 
              className="flex items-center text-foreground hover:text-primary transition-colors mr-3"
              onClick={handleBack}
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            
            <div className="flex items-center">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/15 mr-2">
                <i className="ri-water-drop-fill text-primary text-xs"></i>
              </span>
              <h2 className="font-serif text-sm font-medium text-foreground">Dropbot Chat</h2>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {formatDateLong(new Date(drop.createdAt).toISOString())}
          </div>
        </div>
      </div>
      
      {/* Full Question Display with removed white background */}
      <div className="py-3 px-4 border-b border-border/10">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 mr-2 flex-shrink-0 mt-0.5">
                <i className="ri-question-line text-primary text-[10px]"></i>
              </span>
              <div className="flex-1">
                <h3 className="text-xs font-medium text-[#3B2E2A] leading-5">{drop.questionText}</h3>
              </div>
            </div>
            
            {/* Message counter - More consistent with app styling */}
            <div className={cn(
              "text-xs ml-3 px-2.5 py-0.5 rounded-full text-[hsl(var(--deep-olive))] flex-shrink-0 font-medium",
              isLimitReached ? "bg-destructive/10" : "bg-[hsl(var(--deep-olive))]/10"
            )}>
              {messageCount}/{MESSAGE_LIMIT}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Messages - Softer styling that matches app visual language */}
      <div className="flex-1 overflow-y-auto py-4 px-4 bg-[#F7F7F7]" id="chat-messages">
        <div className="space-y-4 max-w-md mx-auto">
          {/* Initial user question label */}
          <div className="text-center mb-3">
            <span className="text-[11px] font-medium bg-[#F7F7F7] text-primary px-3 py-1 rounded-full border border-primary/10">
              Your reflection
            </span>
          </div>
          
          {/* Initial user response */}
          <div className="flex justify-end mb-4">
            <div className="chat-bubble-user">
              <p className="text-xs">{drop.text}</p>
            </div>
          </div>
          
          {/* Messages */}
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={cn(
                "flex", 
                message.fromUser ? "justify-end" : "justify-start",
                "mb-4"
              )}
            >
              {!message.fromUser && (
                <div className="max-w-[85%]">
                  <div className="chat-bubble-bot">
                    <p className="text-xs">{message.text}</p>
                  </div>
                </div>
              )}
              
              {message.fromUser && (
                <div className="chat-bubble-user">
                  <p className="text-xs">{message.text}</p>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[85%]">
                <div className="chat-bubble-bot py-2 px-3">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-[#AAAAAA] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#AAAAAA] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-[#AAAAAA] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Chat Input - Softer styling that matches app visual language */}
      <div className="bg-white border-t border-border/10 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex justify-center -mt-5 mb-1">
          <button 
            className="bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary border border-border/10 transition-colors"
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            <i className="ri-arrow-down-s-line text-lg"></i>
          </button>
        </div>
      
        <div className="px-4 pb-5 pt-1 max-w-md mx-auto">
          {isLimitReached ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-destructive/10 text-destructive rounded-2xl px-5 py-3 text-sm text-center">
                <p>You've reached the maximum number of exchanges.</p>
                <p className="mt-1">Please start a new reflection.</p>
              </div>
              <Button 
                variant="default" 
                className="mt-2 bg-[hsl(var(--soft-terracotta))] hover:bg-[hsl(var(--deep-terracotta))] rounded-full px-5"
                onClick={handleEndChat}
              >
                <i className="ri-add-line mr-1"></i>
                Start New Chat
              </Button>
            </div>
          ) : (
            <form className="flex items-center space-x-2" onSubmit={handleSendMessage}>
              <div className="relative flex-1">
                <Textarea 
                  className="w-full bg-[#F7F7F7] border border-border/10 rounded-full p-3 text-xs resize-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0 min-h-0 h-10 py-2.5 pr-10 shadow-sm"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        handleSendMessage(e);
                      }
                    }
                  }}
                />
                <div className="absolute right-2.5 bottom-2 flex items-center gap-2">
                  <Button 
                    type="submit" 
                    className="w-6 h-6 bg-[hsl(var(--soft-terracotta))] text-white rounded-full flex items-center justify-center p-0 hover:bg-[hsl(var(--deep-terracotta))] transition-colors shadow-sm"
                    disabled={!newMessage.trim() || isTyping}
                  >
                    <i className="ri-send-plane-fill text-xs"></i>
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default Chat;