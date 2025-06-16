import { z } from 'zod';

export const asterVoipTriggerSchema = z.object({
  customerPhone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
});