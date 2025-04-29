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
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'ai']),
    content: z.string(),
  })).optional().describe('Optional: The conversation history to maintain context.'),
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

// Define the Genkit prompt
const prompt = ai.definePrompt({
  name: 'generateContentPrompt',
  input: {
    schema: GenerateContentInputSchema,
  },
  output: {
    schema: GenerateContentOutputSchema,
  },
  // Updated prompt to handle optional image, document text, and conversation history
  prompt: `You are an expert AI assistant. Generate content based on the following information. Prioritize the user's prompt, but use the image, document text, and conversation history as context if provided.

{{#if conversationHistory}}
Conversation History:
---
{{#each conversationHistory}}
{{#if (eq this.role "user")}}
User: {{{this.content}}}
{{else}}
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
  typeof GenerateContentInputSchema,
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

    const {output} = await prompt(input);

    // Ensure output is not null or undefined
    if (!output) {
        throw new Error('AI failed to generate a response.');
    }
    return output;
  }
);
