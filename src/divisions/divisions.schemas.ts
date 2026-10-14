import z from "zod";

export const DivisionSchema = z.object({
  name: z.string().nonempty(),
  color: z.string().length(6),
});

export const DivisionsListSchema = z.object({
  soldier: z.array(DivisionSchema),
  demoman: z.array(DivisionSchema),
});
