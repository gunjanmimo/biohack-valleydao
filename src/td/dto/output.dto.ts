import { z } from 'zod';
export const StepGenerationSchema = z.object({
  steps: z.array(
    z.object({
      stepIndex: z.number(),
      step: z.string(),
      description: z.string(),
    }),
  ),
});
export const QueryGenerationSchema = z.object({
  generated_queries: z.array(
    z.object({
      query: z.string(),
      focusAreaIndex: z.number(),
    }),
  ),
});
