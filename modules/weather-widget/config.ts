import { z } from "zod";

export const schema = z.object({
  city: z.string().min(1).default("Madrid"),
  units: z.enum(["metric", "imperial"]).default("metric"),
  language: z.enum(["es", "en", "fr", "de"]).default("es"),
});

export default schema;
