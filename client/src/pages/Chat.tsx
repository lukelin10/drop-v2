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
  const { messages, isTyping, sendMessage } = useMessages(dropId);
  
  const drop = getDrop(dropId);

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

  if (!drop) {
    return <div className="flex items-center justify-center h-screen text-foreground">Loading...</div>;
  }

  return (
    <section className="flex flex-col h-screen pt-0">
      {/* Chat Header */}
      <div className="bg-background border-b border-border py-4 px-4">
        <div className="flex items-center">
          <button 
            className="flex items-center justify-center w-8 h-8 text-primary mr-2"
            onClick={handleBack}
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div className="ml-1">
            <div className="flex items-center">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary bg-opacity-10 mr-2">
                <i className="ri-water-drop-fill text-primary text-sm"></i>
              </span>
              <h2 className="font-medium text-foreground">Dropbot</h2>
            </div>
          </div>
        </div>
      </div>
      
      {/* Question Display */}
      <div className="py-6 px-4 border-b border-border">
        <div className="mx-auto max-w-md flex flex-col items-center">
          <h3 className="text-foreground text-base font-medium mb-1 text-center">{drop.question}</h3>
          <p className="text-xs text-muted-foreground">{formatDateLong(drop.createdAt)}</p>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-4 bg-background" id="chat-messages">
        <div className="space-y-4 max-w-md mx-auto">
          {/* Initial user response */}
          <div className="flex justify-end mb-6">
            <div className="chat-bubble-user">
              <p>{drop.answer}</p>
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
                <div className="flex items-end">
                  <div className="w-7 h-7 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-2 mb-2">
                    <i className="ri-water-drop-fill text-primary text-sm"></i>
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
            <div className="flex justify-start mb-4">
              <div className="flex items-end">
                <div className="w-7 h-7 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-2 mb-2">
                  <i className="ri-water-drop-fill text-primary text-sm"></i>
                </div>
                <div className="chat-bubble-bot py-3 px-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Chat Input */}
      <div className="p-3 border-t border-border bg-background">
        <div className="max-w-md mx-auto">
          <form className="flex items-center" onSubmit={handleSendMessage}>
            <Textarea 
              className="flex-1 bg-muted border-none rounded-full p-3 text-foreground resize-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 min-h-0 h-10 py-2"
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
              className="ml-2 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center p-0 hover:opacity-90"
              disabled={!newMessage.trim()}
            >
              <i className="ri-send-plane-fill"></i>
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Chat;