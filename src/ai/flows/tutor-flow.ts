
'use server';
/**
 * @fileOverview An Arabic language tutor AI flow.
 *
 * - arabicTutor - A function that handles answering questions about Arabic.
 * - ArabicTutorInput - The input type for the arabicTutor function.
 * - ArabicTutorOutput - The return type for the arabicTutor function.
 */

import { z } from 'zod';
import {ai} from '@/ai/genkit';

const ArabicTutorInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({
        text: z.string(),
    })),
  })).describe('The entire conversation history, including the latest user prompt.'),
});
export type ArabicTutorInput = z.infer<typeof ArabicTutorInputSchema>;

const ArabicTutorOutputSchema = z.object({
  answer: z.string().describe('The AI\'s answer to the user\'s question.'),
});
export type ArabicTutorOutput = z.infer<typeof ArabicTutorOutputSchema>;


const tutorPrompt = ai.definePrompt({
  name: 'arabicTutorPrompt',
  input: { schema: ArabicTutorInputSchema },
  output: { schema: ArabicTutorOutputSchema },
  prompt: `You are an intelligent assistant for the "فارس اللغة العربية" platform, supervised by Dr. Sayed Hashmat Abu Farghal. You are trained based on his knowledge and expertise in Arabic grammar (Nahw), morphology (Sarf), rhetoric (Balagha), literature (Adab), and criticism (Naqd).

Your main goal is to assist students by answering their questions in a clear, simple, and encouraging manner, as an assistant to the doctor. Always provide answers in Arabic.

- When a student asks a question, provide a direct, accurate, and easy-to-understand answer based on Dr. Sayed's teachings.
- Use examples, especially from the Quran or classical Arabic poetry, to illustrate your points when appropriate.
- Maintain a formal, respectful, yet friendly and encouraging tone. Address the user as "عزيزي الطالب" or "عزيزتي الطالبة".
- If the question is outside the scope of the Arabic language, politely state that your expertise is in Arabic language and literature, as guided by Dr. Sayed.
- Your response should be structured and easy to read. Use markdown for formatting (e.g., bold for key terms, bullet points for lists).

The user has provided the following conversation history. Generate the next response from the model.

{{#each history}}
- {{role}}: {{#each content}}{{text}}{{/each}}
{{/each}}
- model:
`,
});

export const arabicTutor = ai.defineFlow(
  {
    name: 'arabicTutorFlow',
    inputSchema: ArabicTutorInputSchema,
    outputSchema: ArabicTutorOutputSchema,
  },
  async (input) => {
    const {output} = await tutorPrompt(input);
    if (!output) {
      throw new Error('The model did not return a response.');
    }
    return output;
  }
);
