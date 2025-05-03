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
    <section className="flex flex-col h-screen pt-0">
      {/* Chat Header */}
      <div className="bg-background border-b border-border py-3 px-4">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <button 
            className="flex items-center justify-center w-8 h-8 text-foreground hover:text-primary transition-colors"
            onClick={handleBack}
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary bg-opacity-10 mr-2">
                <i className="ri-water-drop-fill text-primary text-sm"></i>
              </span>
              <h2 className="font-medium text-foreground">Dropbot</h2>
            </div>
          </div>
          
          <div className="w-8 h-8"></div> {/* Empty div for centering */}
        </div>
      </div>
      
      {/* Question Banner */}
      <div className="py-4 px-4 bg-accent/20 border-b border-border">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <i className="ri-question-line text-primary mt-1 mr-2"></i>
              <div>
                <h3 className="text-foreground text-sm font-medium">Your Reflection</h3>
                <p className="text-xs text-muted-foreground mt-1">{formatDateLong(new Date(drop.createdAt).toISOString())}</p>
              </div>
            </div>
            
            {/* End Chat Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndChat}
              className="text-xs border-primary text-primary hover:bg-primary/10"
            >
              <i className="ri-logout-box-r-line mr-1"></i>
              End Chat
            </Button>
          </div>
          
          {/* Message counter */}
          <div className="flex items-center justify-center mt-2">
            <div className={cn(
              "text-xs px-2 py-1 rounded-full",
              isLimitReached ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              {messageCount} of {MESSAGE_LIMIT} exchanges {isLimitReached && "- Limit reached"}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-4 bg-background" id="chat-messages">
        <div className="space-y-3 max-w-md mx-auto">
          {/* Initial user response */}
          <div className="flex justify-end mb-4">
            <div className="chat-bubble-user">
              <p>{drop.text}</p>
            </div>
          </div>
          
          {/* Messages */}
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={cn(
                "flex", 
                message.fromUser ? "justify-end" : "justify-start",
                "mb-3"
              )}
            >
              {!message.fromUser && (
                <div className="flex items-end">
                  <div className="w-6 h-6 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-2 mb-1">
                    <i className="ri-water-drop-fill text-primary text-xs"></i>
                  </div>
                  <div className="chat-bubble-bot">
                    <p>{message.text}</p>
                  </div>
                </div>
              )}
              
              {message.fromUser && (
                <div className="chat-bubble-user">
                  <p>{message.text}</p>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start mb-3">
              <div className="flex items-end">
                <div className="w-6 h-6 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-2 mb-1">
                  <i className="ri-water-drop-fill text-primary text-xs"></i>
                </div>
                <div className="chat-bubble-bot py-2 px-3">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="max-w-md mx-auto">
          {isLimitReached ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm text-center">
                <p>You've reached the maximum number of exchanges in this conversation.</p>
                <p className="mt-1">Please end this chat and start a new reflection.</p>
              </div>
              <Button 
                variant="default" 
                className="mt-2"
                onClick={handleEndChat}
              >
                <i className="ri-logout-box-r-line mr-1"></i>
                End Chat & Go to Feed
              </Button>
            </div>
          ) : (
            <form className="flex items-center space-x-2" onSubmit={handleSendMessage}>
              <div className="relative flex-1">
                <Textarea 
                  className="w-full bg-card border border-border rounded-full p-3 text-foreground resize-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 min-h-0 h-10 py-2 pr-12 shadow-sm"
                  placeholder="Message Dropbot..."
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
                <Button 
                  type="submit" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center p-0 hover:bg-primary/90 shadow-sm transition-colors"
                  disabled={!newMessage.trim() || isTyping}
                >
                  <i className="ri-send-plane-fill"></i>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default Chat;