import z from "zod";

export const CreateRoleSchema = z.object({
  name: z.string().nonempty(),
  claimIds: z.array(z.number().positive()),
});
