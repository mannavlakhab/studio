"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Bot, Settings, BrainCircuit, MessageSquareText, PlusSquare } from "lucide-react";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

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

// Define the structure for a conversation
interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const sidebarScrollAreaRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to get the currently active conversation
  const getCurrentChat = (): Conversation | undefined => {
    return conversations.find(c => c.id === currentChatId);
  };

  const form = useForm<GenerateTextInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  // Scroll chat history to the bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [getCurrentChat()?.messages, isLoading]); // Depend on current chat messages and loading state


  // Function to set or update conversation title
  const updateConversationTitle = (chatId: string, prompt: string) => {
     setConversations(prevConvs =>
        prevConvs.map(conv => {
            // Only update title if it's the default "New Conversation"
            if (conv.id === chatId && conv.title === "New Conversation") {
                 const newTitle = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
                 return { ...conv, title: newTitle };
            }
            return conv;
        })
     );
  };


  async function onSubmit(data: GenerateTextInput) {
    setIsLoading(true);
    let chatId = currentChatId;

    // If no chat is selected, start a new one
    if (!chatId) {
      chatId = startNewChat(); // startNewChat now returns the new chat ID
    }

    if (!chatId) {
        console.error("Failed to create or find chat ID");
        setIsLoading(false);
        toast({ title: "Error", description: "Could not start chat.", variant: "destructive" });
        return;
    }

    const userMessage: ChatMessage = { role: "user", content: data.prompt };

    // Update conversations state
    setConversations(prevConvs =>
      prevConvs.map(conv =>
        conv.id === chatId ? { ...conv, messages: [...conv.messages, userMessage] } : conv
      )
    );

    // Set title if it's the first user message
    const currentChat = conversations.find(c => c.id === chatId);
    if (currentChat?.messages.length === 0) { // Check if this is the first message being added
        updateConversationTitle(chatId, data.prompt);
    }


    form.reset(); // Reset form after processing input

    try {
        // Check for image generation keywords
        if (data.prompt.toLowerCase().includes("create") || data.prompt.toLowerCase().includes("draw") || data.prompt.toLowerCase().includes("make") ) {
            const aiMessage: ChatMessage = { role: "ai", content: "Image generation is not implemented. But you are on the right track" };
             setConversations(prevConvs =>
                prevConvs.map(conv =>
                    conv.id === chatId ? { ...conv, messages: [...conv.messages, aiMessage] } : conv
                )
             );
        } else {
            const result = await generateText(data);
            const aiMessage: ChatMessage = { role: "ai", content: result.text };
             setConversations(prevConvs =>
                prevConvs.map(conv =>
                    conv.id === chatId ? { ...conv, messages: [...conv.messages, aiMessage] } : conv
                )
            );
        }
    } catch (error) {
       console.error("Error generating response:", error);
       const errorMessage: ChatMessage = { role: "ai", content: "Sorry, I couldn't generate a response. Please try again." };
        setConversations(prevConvs =>
            prevConvs.map(conv =>
                conv.id === chatId ? { ...conv, messages: [...conv.messages, errorMessage] } : conv
            )
        );
       toast({
         title: "Error",
         description: "Failed to generate response. Please check your API key and try again.",
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }


  const startNewChat = (): string => {
    const newChatId = uuidv4();
    const newConversation: Conversation = {
        id: newChatId,
        title: "New Conversation",
        messages: [],
    };
    setConversations(prev => [newConversation, ...prev]); // Add new chat to the beginning
    setCurrentChatId(newChatId);
    form.reset(); // Reset input field
    return newChatId; // Return the ID of the newly created chat
  };

  const switchChat = (chatId: string) => {
      setCurrentChatId(chatId);
      form.reset(); // Optionally reset input when switching chats
  };

   const currentChat = getCurrentChat();


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
           {/* Explicitly call startNewChat which now handles state updates */}
           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startNewChat} aria-label="Start New Chat">
              <PlusSquare size={20} />
           </Button>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-0">
             <ScrollArea className="h-full p-2" ref={sidebarScrollAreaRef}>
                 <SidebarMenu>
                    {conversations.length === 0 && (
                        <div className="text-center text-muted-foreground p-4">No chats yet.</div>
                    )}
                    {conversations.map((conversation) => (
                        <SidebarMenuItem key={conversation.id}>
                            <SidebarMenuButton
                                size="sm"
                                variant="ghost"
                                className="h-auto justify-start whitespace-normal text-left" // Ensure text wraps and aligns left
                                isActive={conversation.id === currentChatId}
                                onClick={() => switchChat(conversation.id)}
                            >
                                <div className="flex items-start gap-2 w-full">
                                    <MessageSquareText size={16} className="flex-shrink-0 mt-1"/> {/* Icon for conversation */}
                                    {/* Ensure title spans available width and truncates */}
                                    <span className="flex-1 text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                        {conversation.title || "New Chat"}
                                    </span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
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
                         {currentChat ? currentChat.title : 'Start a new conversation'}
                      </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
               <ScrollArea className="h-full" ref={chatContainerRef}>
                <div className="space-y-4 p-6">
                 {!currentChat || currentChat.messages.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
                        <BrainCircuit size={48} className="mb-4"/>
                        <p>Ask me anything!</p>
                     </div>
                  ) : (
                   currentChat.messages.map((message, index) => (
                    <div
                      key={index} // Consider using more stable keys if messages can be reordered/deleted
                      className={cn(
                        "flex items-start gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "ai" && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
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
                         <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      {message.role === "user" && (
                         <Avatar className="h-8 w-8 flex-shrink-0">
                           <AvatarFallback className="bg-secondary text-secondary-foreground"><User size={20} /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                   ))
                  )}
                  {isLoading && currentChat?.messages[currentChat.messages.length - 1]?.role === 'user' && (
                    <div className="flex items-start gap-3 justify-start">
                       <Avatar className="h-8 w-8 flex-shrink-0">
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
                        {/* Gradient Border Wrapper - Conditionally apply border */}
                         <div className={cn(
                            "rounded-lg p-0.5", // Base styles
                            field.value && "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500", // Apply gradient only if there's value
                            // Re-add focus ring styles for accessibility when the wrapper is focused
                            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                           )}>
                          <FormControl>
                            <Textarea
                              placeholder="Type your message here..."
                              className={cn(
                                "min-h-[60px] resize-none text-base flex-1 bg-background",
                                "border-0 focus-visible:ring-0 focus-visible:ring-offset-0" // Keep these to remove default textarea outline/ring
                                )}
                              {...field}
                              aria-label="Prompt Input"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                                      e.preventDefault();
                                      // Ensure a chat exists before submitting
                                      if (currentChatId || form.getValues("prompt")) {
                                          form.handleSubmit(onSubmit)();
                                      } else {
                                           toast({ title: "Info", description: "Start typing to begin a new chat.", variant: "default" });
                                      }
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
                  <Button type="submit" size="lg" className="self-end h-[60px]" disabled={isLoading || !form.watch("prompt")}>
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
