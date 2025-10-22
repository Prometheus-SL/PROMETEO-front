import { z } from "zod"

// Schema de configuración para el widget de Spotify
// Solo guarda los tokens - Client ID y Secret vienen del .env
// Estos campos son internos y no se muestran al usuario
export const schema = z.object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenExpiry: z.number().optional(),
})

export default schema
