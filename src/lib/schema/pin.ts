import * as z from 'zod/mini';

export const pinSchema = z.object({
  x: z.number({ error: 'Pin x must be a number' }),
  y: z.number({ error: 'Pin y must be a number' }),
  label: z.optional(
    z
      .string({ error: 'Pin label must be a string' })
      .check(z.minLength(1, 'Pin label cannot be empty')),
  ),
});

export const pinsSchema = z.array(pinSchema).check(z.minLength(1, 'At least one pin is required'));

export type LoosePin = z.infer<typeof pinSchema>;
export type LoosePins = z.infer<typeof pinsSchema>;

export type Pin = Required<LoosePin>;
export type Pins = Required<Pin[]>;
