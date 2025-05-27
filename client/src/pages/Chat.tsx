/**
 * Chat Page Component
 * 
 * This page implements the conversation interface between users and the AI coach.
 * After submitting a journal entry, users are directed here to continue the conversation
 * and receive personalized coaching based on their reflections.
 * 
 * Key features:
 * - Displays the user's original journal entry
 * - Shows the conversation history
 * - Allows sending new messages to the AI
 * - Indicates when the AI is typing
 * - Tracks conversation limits
 * - Provides navigation back to other parts of the app
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useMessages } from "@/hooks/useMessages";
import { useAppContext } from "@/context/AppContext";
import { formatDateLong } from "@/lib/utils";
import { cn } from "@/lib/utils";
import dropLogo from "../assets/drop-logo-final.svg";

function Chat() {
  // Get the drop ID from URL parameters
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const dropId = parseInt(params.id || "0", 10);
  
  // State for the current message being composed
  const [newMessage, setNewMessage] = useState("");
  
  // Reference to scroll to the bottom of the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Global loading state
  const { setLoading } = useAppContext();
  
  // Get drop and message data from custom hooks
  const { getDrop } = useDrops();
  const { 
    messages,          // All messages in the conversation
    isTyping,          // Whether the AI is generating a response
    sendMessage,       // Function to send a new message
    messageCount,      // Number of complete exchanges
    isLimitReached,    // Whether the conversation limit is reached
    MESSAGE_LIMIT      // Maximum number of exchanges allowed
  } = useMessages(dropId);
  
  // Get the current drop data
  const drop = getDrop(dropId);
  
  /**
   * Effect to clear loading state once data is ready
   */
  useEffect(() => {
    if (drop) {
      setLoading(false); // End loading animation when drop is found
    }
  }, [drop, setLoading]);

  /**
   * Effect to scroll to the bottom when messages change or typing indicator appears
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  /**
   * Scrolls the chat window to the bottom
   * Used when new messages are added or the AI starts/stops typing
   */
  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  /**
   * Handles sending a new message
   * Prevents empty messages and clears the input after sending
   * @param e - The form submission event
   */
  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    
    sendMessage(newMessage);
    setNewMessage(""); // Clear input after sending
  }

  /**
   * Handles navigation back to the home page
   */
  function handleBack() {
    navigate("/");
  }
  
  /**
   * Handles ending the chat and going to the feed
   */
  function handleEndChat() {
    navigate("/feed");
  }

  // Show loading state if drop data isn't available yet
  if (!drop) {
    return <div className="flex items-center justify-center h-screen text-foreground">Loading...</div>;
  }

  return (
    <section className="flex flex-col h-screen pt-0 bg-[hsl(var(--warm-cream))]">
      {/* Chat Header with Back Button and Title */}
      <div className="px-4 py-3 bg-[hsl(var(--warm-cream))]">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <div className="flex items-center">
            {/* Back button */}
            <button 
              className="flex items-center text-foreground hover:text-primary transition-colors mr-3"
              onClick={handleBack}
              aria-label="Go back"
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            
            {/* App logo and title */}
            <div className="flex items-center">
              <img src={dropLogo} alt="Drop logo" className="w-6 h-6 mr-2" />
              <h2 className="font-serif text-sm font-medium text-foreground">Dropbot Chat</h2>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Chat Card */}
      <div className="flex-1 flex flex-col mx-4 rounded-2xl overflow-hidden bg-white border border-border/10 shadow-sm mb-4">
        {/* Question Header with Date and Message Counter */}
        <div className="py-3 px-4 border-b border-border/10">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {/* Question icon */}
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 mr-2 flex-shrink-0 mt-0.5">
                <i className="ri-question-line text-primary text-[10px]"></i>
              </span>
              {/* Display the original question */}
              <div className="flex-1">
                <h3 className="text-xs font-medium text-[#3B2E2A] leading-5">{drop.questionText}</h3>
              </div>
            </div>
            
            {/* Date and message counter */}
            <div className="flex items-center ml-3">
              <div className="text-xs text-muted-foreground mr-2">
                {formatDateLong(new Date(drop.createdAt).toISOString())}
              </div>
              
              {/* Message counter with color indication for limit */}
              <div className={cn(
                "text-xs px-2.5 py-0.5 rounded-full text-[hsl(var(--deep-olive))] flex-shrink-0 font-medium",
                isLimitReached ? "bg-destructive/10" : "bg-[hsl(var(--deep-olive))]/10"
              )}>
                {messageCount}/{MESSAGE_LIMIT}
              </div>
            </div>
          </div>
        </div>
      
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto py-4 px-4 bg-[hsl(var(--app-background))]" id="chat-messages">
          <div className="space-y-4 max-w-md mx-auto">
            {/* Label for the initial user reflection */}
            <div className="text-center mb-3">
              <span className="text-[11px] font-medium bg-[hsl(var(--app-background))] text-primary px-3 py-1 rounded-full border border-primary/10">
                Your reflection
              </span>
            </div>
            
            {/* Display the user's initial journal entry */}
            <div className="flex justify-end mb-4">
              <div className="chat-bubble-user">
                <p className="text-xs">{drop.text}</p>
              </div>
            </div>
            
            {/* Display all messages in the conversation */}
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex", 
                  message.fromUser ? "justify-end" : "justify-start", // Align based on sender
                  "mb-4"
                )}
              >
                {/* AI message bubble */}
                {!message.fromUser && (
                  <div className="max-w-[85%]">
                    <div className="chat-bubble-bot">
                      <p className="text-xs">{message.text}</p>
                    </div>
                  </div>
                )}
                
                {/* User message bubble */}
                {message.fromUser && (
                  <div className="chat-bubble-user">
                    <p className="text-xs">{message.text}</p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator when AI is generating a response */}
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
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Message Input Area */}
        <div className="bg-white border-t border-border/10 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.05)]">
          {/* Scroll to bottom button */}
          <div className="flex justify-center -mt-5 mb-1">
            <button 
              className="bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary border border-border/10 transition-colors"
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              aria-label="Scroll to bottom"
            >
              <i className="ri-arrow-down-s-line text-lg"></i>
            </button>
          </div>
        
          <div className="px-4 pb-5 pt-1 max-w-md mx-auto">
            {/* Show end of conversation message if limit reached */}
            {isLimitReached ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-destructive/10 text-destructive rounded-2xl px-5 py-3 text-sm text-center">
                  <p>You've reached the end of your chat with DropBot</p>
                </div>
                <Button 
                  variant="default" 
                  className="mt-2 bg-[hsl(var(--soft-terracotta))] hover:bg-[hsl(var(--deep-terracotta))] rounded-full px-5"
                  onClick={() => navigate("/feed")}
                >
                  Go to Feed
                </Button>
              </div>
            ) : (
              /* Message input form */
              <form className="flex items-center space-x-2" onSubmit={handleSendMessage}>
                <div className="relative flex-1">
                  {/* Message textarea with Enter key handling */}
                  <Textarea 
                    className="w-full bg-[hsl(var(--app-background))] border border-border/10 rounded-full p-3 text-xs resize-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0 min-h-0 h-10 py-2.5 pr-10 shadow-sm"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      // Submit on Enter but allow Shift+Enter for new lines
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim()) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                  {/* Send button */}
                  <div className="absolute right-2.5 bottom-2 flex items-center gap-2">
                    <Button 
                      type="submit" 
                      className="w-6 h-6 bg-[hsl(var(--soft-terracotta))] text-white rounded-md flex items-center justify-center p-0 hover:bg-[hsl(var(--deep-terracotta))] transition-colors shadow-sm"
                      disabled={!newMessage.trim() || isTyping}
                      aria-label="Send message"
                    >
                      <i className="ri-arrow-up-line text-xs"></i>
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Chat;