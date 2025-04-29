'use server';
/**
 * @fileOverview A text generation AI agent.
 *
 * - generateText - A function that handles the text generation process.
 * - GenerateTextInput - The input type for the generateText function.
 * - GenerateTextOutput - The return type for the generateText function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTextInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate text from.'),
});
export type GenerateTextInput = z.infer<typeof GenerateTextInputSchema>;

const GenerateTextOutputSchema = z.object({
  text: z.string().describe('The generated text.'),
});
export type GenerateTextOutput = z.infer<typeof GenerateTextOutputSchema>;

export async function generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
  return generateTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTextPrompt',
  input: {
    schema: z.object({
      prompt: z.string().describe('The prompt to generate text from.'),
    }),
  },
  output: {
    schema: z.object({
      text: z.string().describe('The generated text.'),
    }),
  },
  prompt: `{{{prompt}}}`,
});

const generateTextFlow = ai.defineFlow<
  typeof GenerateTextInputSchema,
  typeof GenerateTextOutputSchema
>({
  name: 'generateTextFlow',
  inputSchema: GenerateTextInputSchema,
  outputSchema: GenerateTextOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
}
);
