import { z } from "zod"

export const schema = z.object({
  title: z.string().default("Scene Orchestrator"),
  focusQuery: z.string().default("pause,mute,off,refresh"),
  ambientQuery: z.string().default("play,on,subir volumen"),
  resetQuery: z.string().default("refresh,resumen,next"),
})

export default schema
