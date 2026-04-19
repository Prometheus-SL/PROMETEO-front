import { z } from "zod";

const schema = z.object({
  title: z.string().default("Your Widget"),
  subtitle: z
    .string()
    .default("Replace this text with a short explanation for the widget."),
  value: z.string().default("42"),
  status: z.enum(["ready", "warning"]).default("ready"),
  showSecondaryNote: z.boolean().default(true),
});

export default schema;
