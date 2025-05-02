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

const answerSchema = z.object({
  answer: z.string().min(1, { message: "Your reflection can't be empty" }),
});

type AnswerValues = z.infer<typeof answerSchema>;

function DailyDrop() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setLoading } = useAppContext();
  const { dailyQuestion, answerDailyQuestion } = useDrops();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<AnswerValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: "",
    },
  });

  async function onSubmit(values: AnswerValues) {
    setIsSubmitting(true);
    
    setTimeout(() => {
      answerDailyQuestion(values.answer);
      
      setIsSubmitting(false);
      toast({
        title: "Reflection Saved",
        description: "Your daily reflection has been saved.",
      });
      
      setLoading(true);
      setTimeout(() => {
        navigate('/chat/latest');
        setLoading(false);
      }, 300);
    }, 1000);
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Current Date */}
      <div className="px-4 pt-3">
        <p className="text-sm text-muted-foreground mb-1">
          {formatDateLong(new Date().toISOString())}
        </p>
      </div>
      
      {/* Daily Question */}
      <div className="px-4 mb-8 pt-6">
        <div className="bg-[hsl(var(--light-terracotta))] rounded-2xl shadow-sm border border-[hsl(var(--soft-terracotta)_/_15%)]">
          <div className="px-8 py-8">
            <p className="text-foreground text-2xl font-serif font-medium leading-relaxed">
              {dailyQuestion}
            </p>
          </div>
        </div>
      </div>
      
      {/* Answer Form */}
      <div className="px-4 mb-6 flex-grow">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts here..."
                      className="min-h-[200px] resize-none p-5 border-border rounded-2xl shadow-sm bg-background focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-center">
              <Button 
                type="submit" 
                className="px-8 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Submitting...
                  </span>
                ) : (
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