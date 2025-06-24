/**
 * Daily Drop Success Component
 * 
 * This component is displayed when the user has already answered today's daily question.
 * It shows a congratulatory message and encourages them to return tomorrow for a new question.
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/utils";

function DailyDropSuccess() {
  const [, navigate] = useLocation();

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)] items-center justify-center px-4">
      {/* Current Date Display */}
      <div className="mb-8">
        <div className="inline-flex items-center px-4 py-1.5 bg-[hsl(var(--deep-olive))] text-white rounded-full text-sm shadow-sm">
          <i className="ri-calendar-line mr-1.5"></i>
          {formatDateLong(new Date().toISOString())}
        </div>
      </div>
      
      {/* Success Message Card */}
      <div className="max-w-md w-full mb-8">
        <div className="bg-gradient-to-br from-[hsl(var(--medium-terracotta))] to-[hsl(var(--light-terracotta))] rounded-2xl shadow-sm border border-[hsl(var(--soft-terracotta)_/_20%)]">
          <div className="px-8 py-8 text-center">
            {/* Success Icon */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-[hsl(var(--rich-chestnut))] rounded-full flex items-center justify-center mx-auto">
                <i className="ri-check-line text-white text-2xl"></i>
              </div>
            </div>
            
            {/* Success Message */}
            <h2 className="text-[hsl(var(--rich-chestnut))] text-2xl font-serif font-normal leading-relaxed tracking-tight mb-4">
              Great job! You've completed your drop for today.
            </h2>
            
            <p className="text-[hsl(var(--rich-chestnut))] text-base leading-relaxed opacity-80">
              Your daily reflection has been saved. Check back tomorrow for a new question to continue your journey of self-discovery.
            </p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button 
          onClick={() => navigate("/feed")}
          className="flex-1 px-6 py-3 rounded-full bg-[hsl(var(--soft-terracotta))] text-white hover:bg-[hsl(var(--deep-terracotta))] shadow-md transition-colors"
        >
          <i className="ri-history-line mr-2"></i>
          View Your Reflections
        </Button>
        
        <Button 
          onClick={() => navigate("/latest-chat")}
          variant="outline"
          className="flex-1 px-6 py-3 rounded-full border-[hsl(var(--soft-terracotta))] text-[hsl(var(--rich-chestnut))] hover:bg-[hsl(var(--soft-terracotta))] hover:text-white shadow-md transition-colors"
        >
          <i className="ri-chat-1-line mr-2"></i>
          Continue Chat
        </Button>
      </div>
    </section>
  );
}

export default DailyDropSuccess; 