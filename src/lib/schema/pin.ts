import * as z from 'zod/mini';

export const pinSchema = z.object({
  x: z.number(),
  y: z.number(),
  label: z.optional(z.string().check(z.minLength(1))),
});

export const pinsSchema = z.array(pinSchema).check(z.minLength(1));

export type LoosePin = z.infer<typeof pinSchema>;
export type LoosePins = z.infer<typeof pinsSchema>;

export type Pin = Required<LoosePin>;
export type Pins = Required<Pin[]>;
