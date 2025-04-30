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
  const { dailyQuestion, answerDailyQuestion, previousDrops } = useDrops();
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

  function handleViewPreviousDrop(id: number) {
    setLoading(true);
    
    setTimeout(() => {
      navigate(`/chat/${id}`);
      setLoading(false);
    }, 300);
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
      <div className="px-4 mb-6">
        <div className="rounded-2xl overflow-hidden border border-secondary/20 shadow-sm">
          <div className="bg-secondary/10 p-3 border-b border-secondary/20">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-secondary bg-opacity-20 flex items-center justify-center">
                <i className="ri-water-drop-fill text-secondary"></i>
              </div>
              <h3 className="ml-2 font-medium text-secondary">Today's Reflection</h3>
            </div>
          </div>
          <div className="bg-card p-5">
            <p className="text-foreground text-base leading-relaxed font-medium">
              {dailyQuestion}
            </p>
            <div className="mt-4 flex items-center">
              <div className="h-1 w-1 rounded-full bg-secondary mr-1.5"></div>
              <div className="h-1 w-1 rounded-full bg-secondary mr-1.5"></div>
              <div className="h-1 w-1 rounded-full bg-secondary"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Answer Form */}
      <div className="px-4 mb-6 flex-grow">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts..."
                      className="min-h-[200px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full rounded-lg bg-secondary hover:bg-secondary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <i className="ri-send-plane-fill mr-2"></i>
                  Submit & Chat with Dropbot
                </span>
              )}
            </Button>
          </form>
        </Form>
      </div>
      
      {/* Previous Drops */}
      {previousDrops.length > 0 && (
        <div className="px-4 mb-8">
          <div className="flex items-center mb-3">
            <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center mr-2">
              <i className="ri-history-line text-secondary text-xs"></i>
            </div>
            <h3 className="text-sm font-medium text-secondary">Previous Reflections</h3>
          </div>
          
          <div className="space-y-3 max-h-[200px] overflow-y-auto pb-2">
            {previousDrops.slice(0, 3).map(drop => (
              <div 
                key={drop.id}
                className="card cursor-pointer bg-white shadow-sm border border-secondary/10 hover:border-secondary/20 transition-all"
                onClick={() => handleViewPreviousDrop(drop.id)}
              >
                <div className="p-4">
                  <p className="text-sm text-foreground mb-1 font-medium">{drop.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{drop.answer}</p>
                  <div className="flex items-center mt-2">
                    <i className="ri-time-line text-xs text-secondary/70 mr-1"></i>
                    <span className="text-xs text-secondary/70">
                      {new Date(drop.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {previousDrops.length > 3 && (
              <Button 
                variant="outline" 
                className="w-full text-sm text-secondary border-secondary/30 hover:bg-secondary/5"
                onClick={() => navigate("/feed")}
              >
                <i className="ri-history-line mr-1.5"></i>
                View more in feed
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default DailyDrop;