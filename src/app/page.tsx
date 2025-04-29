"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Bot, Settings, BrainCircuit, MessageSquareText, PlusSquare } from "lucide-react"; // Added PlusSquare

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
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateText, type GenerateTextInput } from "@/ai/flows/generate-text";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


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
  const chatContainerRef = React.useRef<HTMLDivElement>(null);


  const form = useForm<GenerateTextInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  // Scroll chat history to the bottom
  React.useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  async function onSubmit(data: GenerateTextInput) {
    setIsLoading(true);
    const userMessage: ChatMessage = { role: "user", content: data.prompt };
    setChatHistory((prev) => [...prev, userMessage]);
    form.reset(); // Reset form after submission

    try {
      // Check for image generation keywords
      if (data.prompt.toLowerCase().includes("create") || data.prompt.toLowerCase().includes("draw") || data.prompt.toLowerCase().includes("make") ) {
        // Placeholder for image generation logic
        const aiMessage: ChatMessage = { role: "ai", content: "Image generation is not implemented. But you are on the right track" };
        setChatHistory((prev) => [...prev, aiMessage]);
      } else {
        const result = await generateText(data);
        const aiMessage: ChatMessage = { role: "ai", content: result.text };
        setChatHistory((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
       console.error("Error generating response:", error); // More specific error log
       const errorMessage: ChatMessage = { role: "ai", content: "Sorry, I couldn't generate a response. Please try again." };
       setChatHistory((prev) => [...prev, errorMessage]);
       toast({
         title: "Error",
         description: "Failed to generate response. Please check your API key and try again.", // Adjusted description
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }

  const getConversationTitle = () => {
    const firstUserMessage = chatHistory.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.length > 40
        ? firstUserMessage.content.substring(0, 40) + '...'
        : firstUserMessage.content;
    }
    return "New Conversation";
  }

  const startNewChat = () => {
    setChatHistory([]);
    form.reset(); // Also clear the input field
  };

  return (
    <div className="flex h-screen">
       <Sidebar>
        <SidebarHeader className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8">
                <AvatarFallback><BrainCircuit size={20} /></AvatarFallback>
             </Avatar>
             <span className="text-lg font-semibold">AI Playground</span>
          </div>
           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startNewChat} aria-label="Start New Chat">
              <PlusSquare size={20} />
           </Button>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-0">
            <ScrollArea className="h-full p-2" ref={scrollAreaRef}>
                 <SidebarMenu>
                    {chatHistory.length === 0 && (
                        <div className="text-center text-muted-foreground p-4">Start a new chat!</div>
                    )}
                    {chatHistory.length > 0 && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="sm"
                                variant="ghost"
                                className="h-auto justify-start whitespace-normal"
                                isActive // Indicate this is the active chat
                                // disabled // Keep disabled as switching chats isn't implemented
                            >
                                <div className="flex items-start gap-2">
                                    <MessageSquareText size={16}/> {/* Icon for conversation */}
                                    <span className="flex-1 text-xs font-medium">{getConversationTitle()}</span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </ScrollArea>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                        <Settings/>
                        <span>Settings</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <main className="flex flex-1 flex-col items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-4xl h-[calc(100vh-4rem)] flex flex-col shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger/>
                    <div>
                      <CardTitle className="text-2xl font-bold">AI Chat</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {chatHistory.length > 0 ? 'Chatting...' : 'Start a new conversation'}
                      </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
               <ScrollArea className="h-full" ref={chatContainerRef}>
                <div className="space-y-4 p-6">
                  {chatHistory.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <BrainCircuit size={48} className="mb-4"/>
                        <p>Ask me anything!</p>
                     </div>
                  )}
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "ai" && (
                        <Avatar className="h-8 w-8">
                           <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg p-3 text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {/* Use pre-wrap to preserve line breaks and spaces */}
                         <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === "user" && (
                         <Avatar className="h-8 w-8">
                           <AvatarFallback className="bg-secondary text-secondary-foreground"><User size={20} /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                   {isLoading && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                    <div className="flex items-start gap-3 justify-start">
                       <Avatar className="h-8 w-8">
                           <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
                        </Avatar>
                      <div className="bg-secondary text-secondary-foreground rounded-lg p-3 shadow-sm">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
                </ScrollArea>
            </CardContent>

            <CardFooter className="border-t p-4 bg-background rounded-b-lg">
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
                        {/* Gradient Border Wrapper */}
                        <div className={cn(
                            "rounded-lg p-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
                            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background" // Optional: Add focus ring to wrapper
                           )}>
                          <FormControl>
                            <Textarea
                              placeholder="Type your message here..."
                              className={cn(
                                "min-h-[60px] resize-none text-base flex-1 bg-background", // Use background color
                                "border-0 focus-visible:ring-0 focus-visible:ring-offset-0" // Remove default border and focus ring
                                )}
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
                         </div>
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
      </SidebarInset>
    </div>
  );
}
