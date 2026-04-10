import { z } from "zod";

// Spotify ya no guarda secretos ni tokens en el dashboard.
// El schema vacio permite sanear configuraciones legacy al volver a guardar.
export const schema = z.object({}).strip();

export default schema;
