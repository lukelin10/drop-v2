/**
 * Daily Drop Page Component
 * 
 * This is the main daily journaling page of the application.
 * It presents users with a reflective question and allows them to submit their response,
 * which then initiates a conversation with the AI coach.
 * 
 * Key features:
 * - Displays a daily question for reflection (consistent per day, cycles through all questions)
 * - Provides a form for users to submit their response
 * - Submits the response to create a new "drop" (journal entry)
 * - Redirects to the chat page to continue the conversation with the AI
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { useDrops } from "@/hooks/useDrops";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { formatDateLong } from "@/lib/utils";

/**
 * Validation schema for the reflection form
 * Ensures that the user's response is not empty
 */
const answerSchema = z.object({
  answer: z.string().min(1, { message: "Your reflection can't be empty" }),
});

// TypeScript type derived from the Zod schema
type AnswerValues = z.infer<typeof answerSchema>;

function DailyDrop() {
  // Navigation hook for redirecting after submission
  const [, navigate] = useLocation();
  // Toast notifications for user feedback
  const { toast } = useToast();
  // Global loading state for transitions
  const { setLoading } = useAppContext();
  // Custom hook for accessing and submitting journal entries
  const { dailyQuestion, isDailyQuestionLoading, answerDailyQuestion } = useDrops();
  // Local submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  /**
   * Form setup with React Hook Form
   * - Uses Zod validation schema
   * - Sets default empty value
   */
  const form = useForm<AnswerValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: "",
    },
  });

  /**
   * Form submission handler
   * - Creates a new journal entry (drop)
   * - Shows success/error notifications
   * - Redirects to the chat with the AI
   * 
   * @param values - The validated form values
   */
  async function onSubmit(values: AnswerValues) {
    setIsSubmitting(true);
    
    try {
      // Submit the reflection to the API and get the created drop
      const drop = await answerDailyQuestion(values.answer);
      
      // Update UI state
      setIsSubmitting(false);
      toast({
        title: "Reflection Saved",
        description: "Your daily reflection has been saved.",
      });
      
      // Show loading state while navigating
      setLoading(true);
      // Navigate to the conversation with the AI
      setTimeout(() => {
        navigate(`/chat/${drop.id}`);
        setLoading(false);
      }, 300);
    } catch (error) {
      console.error("Error saving reflection:", error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "There was a problem saving your reflection. Please try again.",
        variant: "destructive"
      });
    }
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Current Date Display */}
      <div className="px-4 pt-4 flex justify-center">
        <div className="inline-flex items-center px-4 py-1.5 bg-[hsl(var(--deep-olive))] text-white rounded-full text-sm shadow-sm">
          <i className="ri-calendar-line mr-1.5"></i>
          {formatDateLong(new Date().toISOString())}
        </div>
      </div>
      
      {/* Daily Question Card */}
      <div className="px-4 mb-8 pt-6">
        <div className="bg-gradient-to-br from-[hsl(var(--medium-terracotta))] to-[hsl(var(--light-terracotta))] rounded-2xl shadow-sm border border-[hsl(var(--soft-terracotta)_/_20%)]">
          <div className="px-8 py-8">
            {isDailyQuestionLoading ? (
              <div className="flex items-center justify-center py-4">
                <i className="ri-loader-4-line animate-spin text-2xl text-[hsl(var(--rich-chestnut))] mr-3"></i>
                <p className="text-[hsl(var(--rich-chestnut))] text-xl font-serif">
                  Loading today's question...
                </p>
              </div>
            ) : (
              <p className="text-[hsl(var(--rich-chestnut))] text-2xl font-serif font-normal leading-relaxed tracking-tight">
                {dailyQuestion}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Reflection Entry Form */}
      <div className="px-4 mb-6 flex-grow">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      {/* Floating label */}
                      <div className="absolute -top-3 left-4 bg-background px-2 text-xs font-medium text-[hsl(var(--soft-terracotta))]">
                        Your reflection
                      </div>
                      {/* Text area for user's response */}
                      <Textarea
                        placeholder="Share your thoughts here..."
                        className="min-h-[200px] resize-none p-5 border-[hsl(var(--border))] rounded-2xl shadow-sm bg-white focus-visible:border-[hsl(var(--primary))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary))] text-base pt-6"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  {/* Validation error messages */}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Submit Button */}
            <div className="flex justify-center">
              <Button 
                type="submit" 
                className="px-8 py-3 rounded-full bg-[hsl(var(--soft-terracotta))] text-white hover:bg-[hsl(var(--deep-terracotta))] shadow-md transition-colors"
                disabled={isSubmitting || isDailyQuestionLoading}
              >
                {isSubmitting ? (
                  // Loading state
                  <span className="flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Submitting...
                  </span>
                ) : (
                  // Default state
                  <span className="flex items-center">
                    <i className="ri-chat-1-line mr-2"></i>
                    Continue with Dropbot
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </section>
  );
}

export default DailyDrop;