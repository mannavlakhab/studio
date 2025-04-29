"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateText, type GenerateTextInput } from "@/ai/flows/generate-text";
import { cn } from "@/lib/utils";

// Define the form schema using Zod
const FormSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty."),
});

// Define the structure for a chat message
interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function Home() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const form = useForm<GenerateTextInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  // Scroll to the bottom of the chat history
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory]);


  async function onSubmit(data: GenerateTextInput) {
    setIsLoading(true);
    const userMessage: ChatMessage = { role: "user", content: data.prompt };
    setChatHistory((prev) => [...prev, userMessage]);
    form.reset(); // Clear the input field

    try {
      const result = await generateText(data);
      const aiMessage: ChatMessage = { role: "ai", content: result.text };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (error) {
       console.error("Error generating text:", error);
       // Add error message to chat history as well or keep the toast
       const errorMessage: ChatMessage = { role: "ai", content: "Sorry, I couldn't generate a response. Please try again." };
       setChatHistory((prev) => [...prev, errorMessage]);
       toast({
         title: "Error",
         description: "Failed to generate text. Please check your API key and try again.",
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-3xl h-[90vh] flex flex-col shadow-lg rounded-lg">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-3xl font-bold">AI Playground</CardTitle>
          <CardDescription className="text-muted-foreground">
            Chat with the AI. Your conversation history is shown below.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
            <div className="space-y-4">
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "ai" && (
                    <div className="p-2 bg-primary rounded-full text-primary-foreground">
                      <Bot size={20} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg p-3 text-sm shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                     <div className="p-2 bg-secondary rounded-full text-secondary-foreground">
                       <User size={20} />
                    </div>
                  )}
                </div>
              ))}
               {isLoading && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3 justify-start">
                   <div className="p-2 bg-primary rounded-full text-primary-foreground">
                      <Bot size={20} />
                    </div>
                  <div className="bg-secondary text-secondary-foreground rounded-lg p-3 shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t p-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex w-full items-start space-x-4"
            >
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Textarea
                        placeholder="Type your message here..."
                        className="min-h-[60px] resize-none text-base flex-1"
                        {...field}
                        aria-label="Prompt Input"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                            }
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="self-end h-[60px]" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send"
                )}
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </Form>
        </CardFooter>
      </Card>
    </main>
  );
}
