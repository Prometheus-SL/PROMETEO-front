# Contribuir módulos al Marketplace

Coloca tu módulo dentro de la carpeta `/modules/<tu-id>/` con al menos estos archivos:

- `module.json` (obligatorio)
- `index.tsx` (obligatorio) exportando por defecto un componente React: `export default function MyModule({ config }) { ... }`
- `config.ts` (opcional) exportando un schema Zod por defecto `export default schema`
- `preview.png` (opcional)

Ejemplo de `module.json`:

{
"id": "weather-widget",
"name": "Weather Widget",
"description": "Muestra el tiempo actual en tu ciudad.",
"category": "utilidades",
"size": "2x1",
"entry": "./index.tsx",
"configSchema": "./config.ts",
"preview": "./preview.png"
}

Requisitos:

- Usa TypeScript.
- Mantén el componente principal desacoplado, recibiendo `config` como prop.
- Si defines `config.ts`, exporta un schema con Zod para que el configurador pueda generar un formulario.
- No uses APIs externas sin declarar dependencias o mocks.
