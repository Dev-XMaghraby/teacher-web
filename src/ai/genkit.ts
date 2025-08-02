
'use server';
/**
 * @fileoverview This file initializes and configures the Genkit AI library.
 * It sets up the necessary plugins and exports a single, shared `ai` instance.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
