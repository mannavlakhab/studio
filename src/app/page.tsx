
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Bot, Settings, BrainCircuit, MessageSquareText, PlusSquare, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import Image from 'next/image'; // Import next/image
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
import { generateContent, type GenerateContentInput } from "@/ai/flows/generate-content-flow"; // Updated import
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
import { Badge } from "@/components/ui/badge"; // Import Badge

// Define the form schema using Zod
// Prompt is no longer strictly required if a file is attached
const FormSchema = z.object({
  prompt: z.string(),
  imageDataUri: z.string().optional(),
  documentText: z.string().optional(),
}).refine(data => data.prompt || data.imageDataUri || data.documentText, {
  message: "Please enter a prompt or attach a file.",
  path: ["prompt"], // Assign error to prompt field for simplicity
});


// Define the structure for a chat message
interface ChatMessage {
  role: "user" | "ai";
  content: string;
  imageDataUri?: string; // Optional image for user message
  documentName?: string; // Optional document name for user message
}

// Define the structure for a conversation
interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_TEXT_TYPES = ['text/plain'];
// Basic PDF handling might involve sending data URI if model supports it, or extracting text
// For now, we'll primarily handle plain text and images client-side.

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: 'image' | 'text'; dataUriOrText: string } | null>(null);
  const { toast } = useToast();
  const sidebarScrollAreaRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get the currently active conversation
  const getCurrentChat = (): Conversation | undefined => {
    return conversations.find(c => c.id === currentChatId);
  };

  const form = useForm<GenerateContentInput>({ // Updated type
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
      imageDataUri: undefined,
      documentText: undefined,
    },
  });

   // Reset file state when switching chats or starting new one
   useEffect(() => {
    setUploadedFile(null);
    form.setValue('imageDataUri', undefined);
    form.setValue('documentText', undefined);
   }, [currentChatId, form]);

  // Scroll chat history to the bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [getCurrentChat()?.messages, isLoading]); // Depend on current chat messages and loading state


  // Function to set or update conversation title
  const updateConversationTitle = (chatId: string, prompt: string, fileName?: string) => {
     setConversations(prevConvs =>
        prevConvs.map(conv => {
            // Only update title if it's the default "New Conversation"
            if (conv.id === chatId && conv.title === "New Conversation") {
                 let newTitle = prompt || `Chat about ${fileName}`;
                 newTitle = newTitle.length > 40 ? newTitle.substring(0, 40) + '...' : newTitle;
                 return { ...conv, title: newTitle };
            }
            return conv;
        })
     );
  };


  async function onSubmit(data: GenerateContentInput) {
    // Ensure there's either a prompt or a file
    if (!data.prompt && !uploadedFile) {
        toast({ title: "Input Required", description: "Please enter a prompt or attach a file.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    let chatId = currentChatId;
    const isNewChat = !chatId;

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

    const userMessage: ChatMessage = {
        role: "user",
        content: data.prompt,
        imageDataUri: uploadedFile?.type === 'image' ? uploadedFile.dataUriOrText : undefined,
        documentName: uploadedFile?.type === 'text' ? uploadedFile.name : undefined,
      };

    // Update conversations state
    setConversations(prevConvs =>
      prevConvs.map(conv =>
        conv.id === chatId ? { ...conv, messages: [...conv.messages, userMessage] } : conv
      )
    );

     // Set title if it's the first user message in a new chat
    if (isNewChat) {
        updateConversationTitle(chatId, data.prompt, uploadedFile?.name);
    }


    // Prepare data for the AI flow
    const flowInput: GenerateContentInput = {
        prompt: data.prompt,
        imageDataUri: uploadedFile?.type === 'image' ? uploadedFile.dataUriOrText : undefined,
        documentText: uploadedFile?.type === 'text' ? uploadedFile.dataUriOrText : undefined,
      };

    form.reset(); // Reset form after processing input
    setUploadedFile(null); // Clear uploaded file state

    try {
      // Call the updated generateContent flow
      const result = await generateContent(flowInput);
      const aiMessage: ChatMessage = { role: "ai", content: result.text };
       setConversations(prevConvs =>
          prevConvs.map(conv =>
              conv.id === chatId ? { ...conv, messages: [...conv.messages, aiMessage] } : conv
          )
      );

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
    setUploadedFile(null); // Reset file state
    return newChatId; // Return the ID of the newly created chat
  };

  const switchChat = (chatId: string) => {
      setCurrentChatId(chatId);
      form.reset(); // Optionally reset input when switching chats
      setUploadedFile(null); // Reset file state
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({ name: file.name, type: 'image', dataUriOrText: reader.result as string });
        form.setValue('imageDataUri', reader.result as string);
        form.setValue('documentText', undefined); // Ensure only one file type is set
      };
      reader.onerror = (error) => {
        console.error("Error reading image file:", error);
        toast({ title: "Error", description: "Could not read image file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } else if (ALLOWED_TEXT_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({ name: file.name, type: 'text', dataUriOrText: reader.result as string });
        form.setValue('documentText', reader.result as string);
        form.setValue('imageDataUri', undefined); // Ensure only one file type is set
      };
      reader.onerror = (error) => {
        console.error("Error reading text file:", error);
        toast({ title: "Error", description: "Could not read text file.", variant: "destructive" });
      };
      reader.readAsText(file);
    } else {
      toast({ title: "Unsupported File Type", description: `File type "${file.type}" is not supported. Please upload an image (JPG, PNG, GIF, WEBP) or a plain text file (.txt).`, variant: "destructive" });
      // Reset file input if type is invalid
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    form.setValue('imageDataUri', undefined);
    form.setValue('documentText', undefined);
    // Reset the file input visually
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
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
           <Button variant="outline" size="icon" className="h-8 w-8" onClick={startNewChat} aria-label="Start New Chat">
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
                        <p>Ask me anything, or attach a file!</p>
                     </div>
                  ) : (
                   currentChat.messages.map((message, index) => (
                    <div
                      key={`${currentChat.id}-${index}`} // Use chat ID and index for a more robust key
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
                          "max-w-[75%] rounded-lg p-3 text-sm shadow-sm flex flex-col gap-2", // Added flex-col and gap
                           message.role === "user"
                             ? "bg-primary text-primary-foreground"
                             : "bg-secondary text-secondary-foreground"
                        )}
                      >
                         {/* Display image if present */}
                         {message.role === "user" && message.imageDataUri && (
                            <Image
                                src={message.imageDataUri}
                                alt="User upload"
                                width={200} // Adjust size as needed
                                height={200}
                                className="rounded-md object-cover max-w-full"
                            />
                         )}
                         {/* Display document badge if present */}
                         {message.role === "user" && message.documentName && (
                             <Badge variant="secondary" className="inline-flex items-center gap-1 self-start">
                                 <FileText size={14} />
                                 {message.documentName}
                             </Badge>
                         )}
                         {/* Display text content */}
                         {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
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
                    {/* File Upload Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-end h-[60px] w-10 flex-shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || !!uploadedFile} // Disable if loading or file already uploaded
                        aria-label="Attach file"
                    >
                        <Paperclip size={20} />
                    </Button>
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_TEXT_TYPES].join(',')} // Define acceptable file types
                        disabled={isLoading}
                    />

                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                         {/* Gradient Border Wrapper - Conditionally apply border */}
                         <div className={cn(
                            "rounded-lg p-0.5 relative", // Base styles, relative positioning
                            (field.value || uploadedFile) && "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500", // Apply gradient if value or file
                            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                           )}>

                            {/* Display uploaded file info */}
                            {uploadedFile && (
                                <div className="absolute top-1 left-2 flex items-center gap-1 z-10">
                                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                                    {uploadedFile.type === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    <span className="text-xs max-w-[100px] truncate">{uploadedFile.name}</span>
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 rounded-full hover:bg-muted-foreground/20"
                                    onClick={removeUploadedFile}
                                    aria-label="Remove file"
                                    >
                                    <X size={12} />
                                    </Button>
                                </Badge>
                                </div>
                            )}

                          <FormControl>
                            <Textarea
                              placeholder={uploadedFile ? "Describe the file or ask a question..." : "Type your message here..."}
                              className={cn(
                                "min-h-[60px] resize-none text-base flex-1 bg-background",
                                "border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                                uploadedFile ? "pt-7" : "" // Add padding-top if file is uploaded
                                )}
                              {...field}
                              aria-label="Prompt Input"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                                      e.preventDefault();
                                      // Ensure a chat exists or input/file exists before submitting
                                      if (currentChatId || form.getValues("prompt") || uploadedFile) {
                                          form.handleSubmit(onSubmit)();
                                      } else {
                                           toast({ title: "Info", description: "Start typing or attach a file to begin.", variant: "default" });
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
                  <Button type="submit" size="lg" className="self-end h-[60px]" disabled={isLoading || (!form.watch("prompt") && !uploadedFile)}>
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

