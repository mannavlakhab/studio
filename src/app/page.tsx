"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateText, type GenerateTextInput } from "@/ai/flows/generate-text";

// Define the form schema using Zod
const FormSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty."),
});

export default function Home() {
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const form = useForm<GenerateTextInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(data: GenerateTextInput) {
    setIsLoading(true);
    setGeneratedText(null); // Clear previous results
    try {
      const result = await generateText(data);
      setGeneratedText(result.text);
    } catch (error) {
      console.error("Error generating text:", error);
      toast({
        title: "Error",
        description: "Failed to generate text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <div className="w-full max-w-2xl">
        <Card className="w-full shadow-lg rounded-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">AI Playground</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter a prompt below and let the AI generate text for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">Your Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Write a short story about a robot exploring a futuristic city."
                          className="min-h-[100px] resize-none text-base"
                          {...field}
                          aria-label="Prompt Input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Text"
                  )}
                </Button>
              </form>
            </Form>

            {generatedText && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-xl font-semibold mb-4 text-primary">Generated Text:</h3>
                <Card className="bg-secondary p-4 rounded-md shadow-inner">
                  <p className="text-secondary-foreground whitespace-pre-wrap">{generatedText}</p>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
