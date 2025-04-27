import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
    <section className="flex flex-col min-h-[calc(100vh-120px)] pb-4">
      {/* Floating icon with terracotta color */}
      <div className="flex justify-center mt-4 mb-7">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary bg-opacity-10">
          <i className="ri-water-drop-fill text-primary text-xl"></i>
        </div>
      </div>
      
      {/* Question */}
      <div className="px-5 mb-8 text-center">
        <h2 className="text-xl font-medium text-foreground mb-1">
          {dailyQuestion?.question || "Loading today's question..."}
        </h2>
        <p className="text-sm text-muted-foreground">
          Take a moment to reflect on today's question
        </p>
      </div>
      
      {/* Answer Form */}
      <div className="px-5 flex-grow">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Textarea 
                      placeholder="Write your thoughts here..." 
                      className="min-h-[200px] w-full p-4 rounded-2xl bg-muted border-none text-foreground resize-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-center mt-6">
              <Button 
                type="submit" 
                className="rounded-full bg-primary text-primary-foreground font-medium px-8 py-3 hover:opacity-90"
              >
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      {/* Previous Drops */}
      {previousDrops?.length > 0 && (
        <div className="mt-8 px-5">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Previous Drops
          </h3>
          
          <div className="space-y-3">
            {previousDrops?.map((drop) => (
              <div 
                key={drop.id}
                className="card p-4 cursor-pointer"
                onClick={() => handleViewPreviousDrop(drop.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-foreground text-sm">{drop.question}</h4>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(drop.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {drop.answer}
                </p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-4">
            <Button 
              variant="link" 
              className="text-sm text-primary"
              onClick={() => navigate("/feed")}
            >
              View all drops
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default DailyDrop;