import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDrops } from "@/hooks/useDrops";
import { useAppContext } from "@/context/AppContext";
import { formatDate } from "@/lib/utils";

const answerSchema = z.object({
  answer: z.string().min(1, "Please write a response")
});

type AnswerValues = z.infer<typeof answerSchema>;

function DailyDrop() {
  const [, navigate] = useLocation();
  const { setLoading } = useAppContext();
  const { dailyQuestion, previousDrops, answerDailyQuestion } = useDrops();
  
  const form = useForm<AnswerValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: ""
    }
  });

  async function onSubmit(values: AnswerValues) {
    setLoading(true);
    try {
      const drop = await answerDailyQuestion(values.answer);
      navigate(`/chat/${drop.id}`);
    } finally {
      setLoading(false);
    }
  }

  function handleViewPreviousDrop(id: number) {
    setLoading(true);
    setTimeout(() => {
      navigate(`/chat/${id}`);
      setLoading(false);
    }, 300);
  }

  return (
    <section className="px-4 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Today's Drop</h2>
        <p className="text-sm text-foreground opacity-70">Take a moment to reflect on today's question</p>
      </div>
      
      {/* Question Card */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <p className="text-lg font-medium text-foreground mb-6">
            {dailyQuestion?.text || "Loading today's question..."}
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your thoughts here..." 
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-accent bg-opacity-50 text-foreground"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg shadow-sm flex items-center">
                  <span>Submit</span>
                  <i className="ri-arrow-right-line ml-2"></i>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Previous Drops */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center">
          <i className="ri-history-line mr-2"></i>
          <span>Previous Drops</span>
        </h3>
        
        <div className="space-y-4">
          {previousDrops?.map((drop) => (
            <div 
              key={drop.id}
              className="bg-white rounded-lg shadow-sm p-4 mb-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => handleViewPreviousDrop(drop.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">{drop.question}</h4>
                <span className="text-xs text-foreground opacity-50">
                  {formatDate(drop.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground opacity-70 line-clamp-2">
                {drop.answer}
              </p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-6">
          <Button 
            variant="link" 
            className="text-sm text-primary font-medium flex items-center mx-auto"
            onClick={() => navigate("/feed")}
          >
            <span>View all your drops</span>
            <i className="ri-arrow-right-s-line ml-1"></i>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default DailyDrop;
