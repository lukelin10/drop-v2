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
        <div className="card">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <i className="ri-water-drop-fill text-primary"></i>
              </div>
              <h3 className="ml-2 font-medium text-foreground">Today's Drop</h3>
            </div>
            <p className="text-foreground text-base leading-relaxed">
              {dailyQuestion}
            </p>
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
              className="w-full rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Submitting...
                </span>
              ) : "Submit & Chat with Dropbot"}
            </Button>
          </form>
        </Form>
      </div>
      
      {/* Previous Drops */}
      {previousDrops.length > 0 && (
        <div className="px-4 mb-8">
          <h3 className="text-sm font-medium text-foreground mb-3">Previous Drops</h3>
          
          <div className="space-y-3 max-h-[200px] overflow-y-auto pb-2">
            {previousDrops.slice(0, 3).map(drop => (
              <div 
                key={drop.id}
                className="card cursor-pointer bg-background border border-border"
                onClick={() => handleViewPreviousDrop(drop.id)}
              >
                <div className="p-4">
                  <p className="text-sm text-foreground mb-1">{drop.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{drop.answer}</p>
                  <div className="flex items-center mt-2">
                    <i className="ri-time-line text-xs text-muted-foreground mr-1"></i>
                    <span className="text-xs text-muted-foreground">
                      {new Date(drop.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {previousDrops.length > 3 && (
              <Button 
                variant="link" 
                className="w-full text-sm text-primary"
                onClick={() => navigate("/feed")}
              >
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