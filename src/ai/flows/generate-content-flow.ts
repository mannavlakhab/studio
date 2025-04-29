'use server';
/**
 * @fileOverview An AI agent that generates content based on text, optional images, and optional documents.
 * It incorporates conversation history for context.
 *
 * - generateContent - A function that handles the content generation process.
 * - GenerateContentInput - The input type for the generateContent function.
 * - GenerateContentOutput - The return type for the generateContent function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define the structure for a single message in the history (used internally for processing)
const HistoryMessageSchema = z.object({
    role: z.enum(['user', 'ai']),
    content: z.string(),
});

// Define the input schema, making image and document optional
const GenerateContentInputSchema = z.object({
  prompt: z.string().describe('The text prompt to guide content generation.'),
  imageDataUri: z
    .string()
    .optional()
    .describe(
      "Optional: An image file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Use this for multimodal prompts."
    ),
  documentText: z
    .string()
    .optional()
    .describe(
      'Optional: Text content extracted from an uploaded document (e.g., .txt file). Use this for context.'
    ),
  // Raw conversation history from the client
  conversationHistory: z.array(HistoryMessageSchema).optional().describe('Optional: The conversation history to maintain context.'),
});
export type GenerateContentInput = z.infer<typeof GenerateContentInputSchema>;

// Define the output schema
const GenerateContentOutputSchema = z.object({
  text: z.string().describe('The generated text content.'),
});
export type GenerateContentOutput = z.infer<typeof GenerateContentOutputSchema>;

// Exported function to call the flow
export async function generateContent(input: GenerateContentInput): Promise<GenerateContentOutput> {
  return generateContentFlow(input);
}

// Define the schema for the prompt's input, which includes processed history
const PromptInputSchema = GenerateContentInputSchema.extend({
    processedHistory: z.array(z.object({
        role: z.enum(['user', 'ai']),
        content: z.string(),
        isUser: z.boolean(),
        isAi: z.boolean(),
    })).optional(),
}).omit({ conversationHistory: true }); // Omit the original history field

// Define the Genkit prompt
const prompt = ai.definePrompt({
  name: 'generateContentPrompt',
  input: {
    schema: PromptInputSchema, // Use the schema with processed history
  },
  output: {
    schema: GenerateContentOutputSchema,
  },
  // Updated prompt to use boolean flags (isUser/isAi) instead of 'eq' helper
  prompt: `You are an expert AI assistant. Generate content based on the following information. Prioritize the user's prompt, but use the image, document text, and conversation history as context if provided.

{{#if processedHistory}}
Conversation History:
---
{{#each processedHistory}}
{{#if this.isUser}}
User: {{{this.content}}}
{{else if this.isAi}}
AI: {{{this.content}}}
{{/if}}
{{/each}}
---
{{/if}}

User Prompt: {{{prompt}}}

{{#if imageDataUri}}
Image Context:
{{media url=imageDataUri}}
{{/if}}

{{#if documentText}}
Document Context:
---
{{{documentText}}}
---
{{/if}}

Generate the response based on the prompt and any provided context.
`,
});

// Define the Genkit flow
const generateContentFlow = ai.defineFlow<
  typeof GenerateContentInputSchema, // Flow still takes the original input schema
  typeof GenerateContentOutputSchema
>(
  {
    name: 'generateContentFlow',
    inputSchema: GenerateContentInputSchema,
    outputSchema: GenerateContentOutputSchema,
  },
  async (input) => {
    // Basic validation or pre-processing could happen here if needed
    if (!input.prompt && !input.imageDataUri && !input.documentText) {
      // This should ideally be caught by the Zod refine, but added as a safeguard
      throw new Error('At least one input (prompt, image, or document) is required.');
    }

    // Prepare history with boolean flags for Handlebars
    const processedHistory = input.conversationHistory?.map(message => ({
      ...message,
      isUser: message.role === 'user',
      isAi: message.role === 'ai',
    }));

    // Prepare input for the prompt, removing original history and adding processed history
    const promptInput: z.infer<typeof PromptInputSchema> = {
        prompt: input.prompt,
        imageDataUri: input.imageDataUri,
        documentText: input.documentText,
        processedHistory: processedHistory,
    };


    const {output} = await prompt(promptInput); // Pass the correctly structured input

    // Ensure output is not null or undefined
    if (!output) {
        throw new Error('AI failed to generate a response.');
    }
    return output;
  }
);
