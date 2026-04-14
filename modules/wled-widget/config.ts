import { z } from "zod"

export const schema = z.object({
    deviceIp: z.string().min(1, "La IP del dispositivo WLED es obligatoria"),
    refreshInterval: z.number().min(1).max(60).default(5),
    useSsl: z.boolean().default(false),
})

export default schema
