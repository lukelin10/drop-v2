import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useMessages } from "@/hooks/useMessages";
import { useAppContext } from "@/context/AppContext";
import { formatDateLong } from "@/lib/utils";

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
    return <div className="p-4">Loading...</div>;
  }

  return (
    <section className="h-screen flex flex-col pt-0">
      {/* Chat Header */}
      <div className="bg-primary text-primary-foreground py-3 px-4 flex items-center">
        <button className="mr-3" onClick={handleBack}>
          <i className="ri-arrow-left-line text-xl"></i>
        </button>
        <div>
          <h2 className="font-medium text-base">Dropbot Chat</h2>
          <p className="text-xs opacity-80">{formatDateLong(drop.createdAt)}</p>
        </div>
      </div>
      
      {/* Question Display */}
      <div className="bg-secondary bg-opacity-10 p-4">
        <p className="text-sm font-medium text-foreground">{drop.question}</p>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-accent" id="chat-messages">
        {/* Initial user response */}
        <div className="flex justify-end mb-4">
          <div className="bg-primary bg-opacity-20 rounded-tl-xl rounded-tr-xl rounded-bl-xl p-3 max-w-[80%]">
            <p className="text-foreground text-sm">{drop.answer}</p>
          </div>
        </div>
        
        {/* Messages */}
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.fromUser ? 'justify-end' : ''} mb-4`}
          >
            {!message.fromUser && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2 flex-shrink-0">
                <i className="ri-robot-line text-accent text-sm"></i>
              </div>
            )}
            <div className={`p-3 max-w-[80%] ${
              message.fromUser 
                ? "bg-primary bg-opacity-20 rounded-tl-xl rounded-tr-xl rounded-bl-xl" 
                : "bg-secondary bg-opacity-10 rounded-tr-xl rounded-br-xl rounded-bl-xl"
            }`}>
              <p className="text-foreground text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex mb-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2 flex-shrink-0">
              <i className="ri-robot-line text-accent text-sm"></i>
            </div>
            <div className="bg-secondary bg-opacity-10 rounded-tr-xl rounded-br-xl rounded-bl-xl p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className="p-3 border-t border-gray-200 bg-accent">
        <form className="flex items-center" onSubmit={handleSendMessage}>
          <Textarea 
            className="flex-1 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none resize-none text-sm bg-white"
            placeholder="Type your message..."
            rows={1}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button 
            type="submit" 
            className="ml-2 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center p-0"
          >
            <i className="ri-send-plane-fill"></i>
          </Button>
        </form>
      </div>
    </section>
  );
}

export default Chat;
