
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Bot, Settings, BrainCircuit, MessageSquareText, PlusSquare, Paperclip, X, FileText, Image as ImageIcon, Trash2 } from "lucide-react"; // Added Trash2
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
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
import { generateContent, type GenerateContentInput } from "@/ai/flows/generate-content-flow";
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
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


// Regex to detect fenced code blocks (basic)
const CODE_BLOCK_REGEX = /^```(\w+)?\n([\s\S]+)\n```$/;

// Define the form schema using Zod
const FormSchema = z.object({
  prompt: z.string(),
  imageDataUri: z.string().optional(),
  documentText: z.string().optional(),
}).refine(data => data.prompt || data.imageDataUri || data.documentText, {
  message: "Please enter a prompt or attach a file.",
  path: ["prompt"],
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

// Client component to show when there are no chats
function NoChatsPlaceholder() {
    return (
        <div className="text-center text-muted-foreground p-4 text-sm">No chats yet. Start one!</div>
    );
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false); // State to track client-side hydration

  useEffect(() => {
      // This effect runs only on the client after hydration
      setIsClient(true);

      // Load conversations from localStorage
      const savedConversations = localStorage.getItem('aiPlaygroundConversations');
      let initialConversations: Conversation[] = [];
      if (savedConversations) {
        try {
          initialConversations = JSON.parse(savedConversations);
        } catch (error) {
          console.error("Failed to parse conversations from localStorage", error);
        }
      }
      setConversations(initialConversations);

      // Load current chat ID and validate it
      const savedChatId = localStorage.getItem('aiPlaygroundCurrentChatId');
      const chatExists = initialConversations.some(conv => conv.id === savedChatId);
      setCurrentChatId(chatExists ? savedChatId : null);

  }, []); // Empty dependency array ensures this runs once on the client


  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: 'image' | 'text'; dataUriOrText: string } | null>(null);
  const { toast } = useToast();
  const sidebarScrollAreaRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

   // Save conversations and current chat ID to localStorage whenever they change
   useEffect(() => {
     // Only save if we are on the client and have finished initial loading
     if (isClient) {
       localStorage.setItem('aiPlaygroundConversations', JSON.stringify(conversations));
       if (currentChatId) {
         localStorage.setItem('aiPlaygroundCurrentChatId', currentChatId);
       } else {
         localStorage.removeItem('aiPlaygroundCurrentChatId');
       }
     }
   }, [conversations, currentChatId, isClient]);

    // Ensure currentChatId is valid on load or if conversations change (Client-side only)
    useEffect(() => {
      if (!isClient) return; // Don't run on server

      if (currentChatId && !conversations.some(conv => conv.id === currentChatId)) {
          // If the current chat ID is no longer valid (e.g., deleted), clear it
          setCurrentChatId(null);
      } else if (!currentChatId && conversations.length > 0) {
          // If no chat is selected but chats exist, do nothing automatically, let user select.
          // setCurrentChatId(conversations[0].id); // Optionally select the first chat
      }
    }, [conversations, currentChatId, isClient]);


  // Helper function to get the currently active conversation
  const getCurrentChat = (): Conversation | undefined => {
    return conversations.find(c => c.id === currentChatId);
  };

  const form = useForm<GenerateContentInput>({
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
    // Reset file input visually
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
   }, [currentChatId, form]);

  // Scroll chat history to the bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      // Use setTimeout to ensure scrolling happens after the DOM update
      setTimeout(() => {
        if(chatContainerRef.current){
           chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [getCurrentChat()?.messages.length, isLoading]);


  // Function to set or update conversation title
  const updateConversationTitle = (chatId: string, prompt: string, fileName?: string) => {
     setConversations(prevConvs =>
        prevConvs.map(conv => {
            // Only update title if it's the default "New Conversation" or the first message
            if (conv.id === chatId && (conv.title === "New Conversation" || conv.messages.length <= 1)) {
                 let baseTitle = prompt || (fileName ? `Chat about ${fileName}` : "Untitled Chat");
                 let newTitle = baseTitle.length > 30 ? baseTitle.substring(0, 30) + '...' : baseTitle;
                 return { ...conv, title: newTitle };
            }
            return conv;
        })
     );
  };


  async function onSubmit(data: GenerateContentInput) {
    // Ensure there's either a prompt or a file, and a chat is selected or can be created
    if ((!data.prompt && !uploadedFile)) {
        toast({ title: "Input Required", description: "Please enter a prompt or attach a file.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    let chatId = currentChatId;
    let isNewChat = false;

    // If no chat is selected, start a new one
    if (!chatId) {
      const newId = startNewChat(); // startNewChat now returns the new chat ID
      if (!newId) {
          console.error("Failed to create new chat ID");
          setIsLoading(false);
          toast({ title: "Error", description: "Could not start a new chat.", variant: "destructive" });
          return;
      }
      chatId = newId;
      isNewChat = true;
    }


    const userMessage: ChatMessage = {
        role: "user",
        content: data.prompt,
        imageDataUri: uploadedFile?.type === 'image' ? uploadedFile.dataUriOrText : undefined,
        documentName: uploadedFile?.type === 'text' ? uploadedFile.name : undefined,
      };

     // Add user message and potentially update title
     setConversations(prevConvs => {
        const updatedConvs = prevConvs.map(conv => {
            if (conv.id === chatId) {
                const newMessages = [...conv.messages, userMessage];
                // Update title if it's the first message
                const newTitle = (conv.title === "New Conversation" && newMessages.length === 1)
                    ? (data.prompt || (uploadedFile ? `Chat about ${uploadedFile.name}` : "Untitled Chat")).substring(0, 30) + ((data.prompt || uploadedFile?.name || "Untitled Chat").length > 30 ? '...' : '')
                    : conv.title;
                return { ...conv, messages: newMessages, title: newTitle };
            }
            return conv;
        });
        return updatedConvs;
     });

     // Get the most up-to-date conversation history *after* adding the user message
     // Need to ensure the state update has propagated, use a function in setConversations or useEffect dependency
     const latestConversation = conversations.find(c => c.id === chatId); // May not be updated yet here
     // A better way: pass history explicitly or fetch it inside the API call function if needed immediately
     // For simplicity, let's get it before the async call, hoping the state update is fast enough (not ideal)
     const currentConversationState = conversations.find(c => c.id === chatId);
     const historyForFlow = currentConversationState?.messages.slice(0, -1).map(msg => ({ // Exclude the *just added* user message
        role: msg.role === 'ai' ? 'ai' : 'user', // Ensure role is 'user' or 'ai'
        content: msg.content,
     })) || [];

    // Prepare data for the AI flow
    const flowInput: GenerateContentInput = {
        prompt: data.prompt,
        imageDataUri: uploadedFile?.type === 'image' ? uploadedFile.dataUriOrText : undefined,
        documentText: uploadedFile?.type === 'text' ? uploadedFile?.dataUriOrText : undefined,
        conversationHistory: historyForFlow, // Send history *before* the current user message
      };

    // Reset form *after* extracting necessary data but *before* API call starts visually
    form.reset({ prompt: "" }); // Only reset prompt, keep file info if needed for retry? No, clear file too.
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";


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
         description: "Failed to generate response. Check console/API key.",
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }


  const startNewChat = (): string | null => {
    const newChatId = uuidv4();
    const newConversation: Conversation = {
        id: newChatId,
        title: "New Conversation", // Default title, will be updated on first message
        messages: [],
    };
    setConversations(prev => [newConversation, ...prev]); // Add to beginning
    setCurrentChatId(newChatId);
    form.reset({ prompt: "" }); // Reset input field
    setUploadedFile(null); // Reset file state
    if (fileInputRef.current) fileInputRef.current.value = "";
    return newChatId; // Return the ID
  };

  const switchChat = (chatId: string) => {
      setCurrentChatId(chatId);
      form.reset({ prompt: "" }); // Reset input field when switching chats
      setUploadedFile(null); // Reset file state
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteChat = (chatIdToDelete: string) => {
      setConversations(prevConvs => prevConvs.filter(conv => conv.id !== chatIdToDelete));
      // If the deleted chat was the current one, reset currentChatId
      if (currentChatId === chatIdToDelete) {
          setCurrentChatId(null);
      }
      toast({ title: "Chat Deleted", description: "The conversation has been removed." });
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if a chat is active, if not, start one
    let activeChatId = currentChatId;
    if (!activeChatId) {
        const newId = startNewChat();
        if (!newId) {
            toast({ title: "Error", description: "Could not start a chat to attach the file.", variant: "destructive" });
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            return;
        }
        activeChatId = newId; // Now we have an active chat
    }


    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({ name: file.name, type: 'image', dataUriOrText: reader.result as string });
        form.setValue('imageDataUri', reader.result as string);
        form.setValue('documentText', undefined);
        toast({ title: "Image Ready", description: `"${file.name}" attached.` });
      };
      reader.onerror = (error) => {
        console.error("Error reading image file:", error);
        toast({ title: "Error", description: "Could not read image file.", variant: "destructive" });
         if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
      };
      reader.readAsDataURL(file);
    } else if (ALLOWED_TEXT_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({ name: file.name, type: 'text', dataUriOrText: reader.result as string });
        form.setValue('documentText', reader.result as string);
        form.setValue('imageDataUri', undefined);
         toast({ title: "Text File Ready", description: `"${file.name}" attached.` });
      };
      reader.onerror = (error) => {
        console.error("Error reading text file:", error);
        toast({ title: "Error", description: "Could not read text file.", variant: "destructive" });
         if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
      };
      reader.readAsText(file);
    } else {
      toast({ title: "Unsupported File Type", description: `Please upload an image (JPG, PNG, etc.) or a plain text file (.txt).`, variant: "destructive" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    form.setValue('imageDataUri', undefined);
    form.setValue('documentText', undefined);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

   const currentChat = getCurrentChat();

   // Render placeholder or null during SSR / initial client hydration
   if (!isClient) {
        // You can return a loading skeleton or null here
        return null; // Or a loading indicator component
    }


  return (
    <div className="flex h-screen bg-background">
       <Sidebar>
        <SidebarHeader className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8">
                <AvatarFallback><BrainCircuit size={20} /></AvatarFallback>
             </Avatar>
             <span className="text-lg font-semibold text-foreground">AI Playground</span>
          </div>
           <Button variant="outline" size="icon" className="h-8 w-8" onClick={startNewChat} aria-label="Start New Chat">
              <PlusSquare size={20} />
           </Button>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-0">
             <ScrollArea className="h-full p-2" ref={sidebarScrollAreaRef}>
                 <SidebarMenu>
                    {conversations.length === 0 ? (
                         <NoChatsPlaceholder />
                    ) : (
                        conversations.map((conversation) => (
                            <SidebarMenuItem key={conversation.id}>
                                <SidebarMenuButton
                                    size="sm"
                                    className="h-auto justify-start whitespace-normal text-left pr-8 relative group" // Added pr-8, relative, group
                                    isActive={conversation.id === currentChatId}
                                    onClick={() => switchChat(conversation.id)}
                                >
                                    <div className="flex items-start gap-2 w-full">
                                        <MessageSquareText size={16} className="flex-shrink-0 mt-1 text-muted-foreground"/>
                                        <span className="flex-1 text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
                                            {conversation.title || "New Chat"}
                                        </span>
                                    </div>
                                    {/* Delete button */}
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                                                onClick={(e) => e.stopPropagation()} // Prevent switching chat
                                                aria-label="Delete chat"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action cannot be undone. This will permanently delete the chat
                                              "{conversation.title}".
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={(e) => {
                                                e.stopPropagation(); // Prevent dialog closure issues if needed
                                                handleDeleteChat(conversation.id);
                                              }}
                                              className={cn(buttonVariants({ variant: "destructive" }))} // Use cn with buttonVariants
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))
                    )}
                </SidebarMenu>
            </ScrollArea>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings are not implemented yet">
                        <Settings/>
                        <span>Settings</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <main className="flex flex-1 flex-col items-center justify-center p-0 md:p-4 bg-transparent md:bg-background">
          <Card className="w-full max-w-4xl h-full md:h-[calc(100vh-2rem)] flex flex-col shadow-lg rounded-none md:rounded-lg border-none md:border">
            <CardHeader className="flex flex-row items-center justify-between border-b p-3 md:p-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" /> {/* Show trigger only on mobile */}
                    <div>
                      <CardTitle className="text-lg md:text-2xl font-semibold text-foreground">AI Chat</CardTitle>
                       <CardDescription className="text-xs md:text-sm text-muted-foreground">
                         {currentChat ? currentChat.title : 'Start or select a conversation'}
                      </CardDescription>
                    </div>
                </div>
                {/* Optional: Add settings or other actions here */}
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
               <ScrollArea className="h-full" ref={chatContainerRef}>
                <div className="space-y-4 p-4 md:p-6">
                 {!currentChat ? (
                     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
                        <BrainCircuit size={48} className="mb-4 text-primary"/>
                        <p className="text-lg">Welcome to AI Playground!</p>
                        <p>Start a new chat or select one from the sidebar.</p>
                     </div>
                  ) : currentChat.messages.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
                        <MessageSquareText size={48} className="mb-4 text-primary"/>
                        <p>Ask me anything, or attach a file!</p>
                        <p className="text-sm mt-2">Your conversation will appear here.</p>
                     </div>
                  ) : (
                   currentChat.messages.map((message, index) => {
                     const codeBlockMatch = message.content.match(CODE_BLOCK_REGEX);
                     return (
                       <div
                         key={`${currentChat.id}-${index}`}
                         className={cn(
                           "flex items-start gap-3 group relative", // Added group relative
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
                             "max-w-[85%] rounded-lg p-3 text-sm shadow-sm flex flex-col gap-2",
                             message.role === "user"
                               ? "bg-primary text-primary-foreground"
                               : "bg-card text-card-foreground border" // Use card background for AI
                           )}
                         >
                           {/* Display image if present */}
                           {message.role === "user" && message.imageDataUri && (
                             <Image
                               src={message.imageDataUri}
                               alt="User upload"
                               width={200}
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

                           {/* Render CodeBlock or regular text */}
                           {codeBlockMatch && message.role === 'ai' ? (
                             <CodeBlock language={codeBlockMatch[1]} code={codeBlockMatch[2]} />
                           ) : (
                             message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>
                           )}

                           {/* Copy button - appears on hover for all messages */}
                           <CopyButton
                             textToCopy={message.content}
                             className={cn(
                               "absolute -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                               message.role === 'user' ? '-left-2' : '-right-2'
                             )}
                           />
                         </div>
                         {message.role === "user" && (
                           <Avatar className="h-8 w-8 flex-shrink-0">
                             <AvatarFallback className="bg-secondary text-secondary-foreground"><User size={20} /></AvatarFallback>
                           </Avatar>
                         )}
                       </div>
                     );
                   })
                 )}
                  {isLoading && currentChat?.messages[currentChat.messages.length - 1]?.role === 'user' && (
                    <div className="flex items-start gap-3 justify-start">
                       <Avatar className="h-8 w-8 flex-shrink-0">
                           <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
                        </Avatar>
                      <div className="bg-card text-card-foreground border rounded-lg p-3 shadow-sm">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
                </ScrollArea>
            </CardContent>

            <CardFooter className="border-t p-2 md:p-4 bg-background rounded-b-lg">
               {!currentChatId && (
                  <div className="text-center w-full text-muted-foreground text-sm p-4">
                     Please select a conversation or start a new one to send a message.
                  </div>
               )}
              {currentChatId && (<Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex w-full items-start space-x-2 md:space-x-4"
                >
                    {/* File Upload Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-end h-10 w-10 md:h-[60px] md:w-10 flex-shrink-0 text-muted-foreground hover:text-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || !!uploadedFile || !currentChatId} // Disable if no chat selected
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
                        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_TEXT_TYPES].join(',')}
                        disabled={isLoading || !currentChatId} // Disable if no chat selected
                    />

                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                         <div className={cn(
                            "rounded-lg p-0.5 relative bg-background border border-input focus-within:border-transparent", // Base styles with standard border
                             (form.watch("prompt") || uploadedFile) && "border-transparent", // Hide standard border when gradient is active (use form.watch)
                             (form.watch("prompt") || uploadedFile) && !isLoading && "bg-gradient-to-r from-teal-400 via-purple-500 to-pink-500", // Apply gradient if value or file and not loading
                            "focus-within:ring-1 focus-within:ring-ring" // Standard focus ring on wrapper
                           )}>

                            {/* Display uploaded file info */}
                            {uploadedFile && (
                                <div className="absolute top-1 left-1 md:left-2 flex items-center gap-1 z-10">
                                <Badge variant="secondary" className="flex items-center gap-1 pr-1 shadow-sm">
                                    {uploadedFile.type === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    <span className="text-xs max-w-[80px] md:max-w-[150px] truncate">{uploadedFile.name}</span>
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
                                "min-h-[40px] md:min-h-[60px] resize-none text-sm md:text-base flex-1 bg-background",
                                "border-0 focus-visible:ring-0 focus-visible:ring-offset-0", // Ensure textarea itself has no border/ring
                                uploadedFile ? "pt-7 md:pt-8" : "pt-2.5 md:pt-3" // Adjust padding based on file upload
                                )}
                              {...field}
                              aria-label="Prompt Input"
                              rows={1} // Start with one row
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                                      e.preventDefault();
                                      // Check if there is content to send or a file is uploaded
                                      if (form.getValues("prompt").trim() || uploadedFile) {
                                          form.handleSubmit(onSubmit)();
                                      } else {
                                          // Optionally provide feedback if trying to send empty message
                                           toast({ title: "Empty Message", description: "Please type a message or attach a file.", variant: "default" });
                                      }
                                  }
                              }}
                              disabled={isLoading || !currentChatId} // Disable if no chat selected
                            />
                          </FormControl>
                         </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="icon" className="self-end h-10 w-10 md:h-[60px] md:w-12 rounded-full md:rounded-md" disabled={isLoading || (!form.watch("prompt") && !uploadedFile) || !currentChatId}>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                         <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                       </svg>
                    )}
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </Form>)}
            </CardFooter>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
