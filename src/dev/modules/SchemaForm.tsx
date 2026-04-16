import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function unwrapField(field: z.ZodTypeAny): z.ZodTypeAny {
  let current = field;

  for (let index = 0; index < 10; index += 1) {
    const ZodCatchCtor = Reflect.get(z, "ZodCatch");
    const ZodEffectsCtor = Reflect.get(z, "ZodEffects");

    if (
      current instanceof z.ZodDefault ||
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable ||
      (typeof ZodCatchCtor === "function" && current instanceof ZodCatchCtor)
    ) {
      const definition = Reflect.get(current, "_def") as unknown as
        | { innerType?: z.ZodTypeAny }
        | undefined;
      if (!definition?.innerType) {
        break;
      }
      current = definition.innerType;
      continue;
    }

    if (typeof ZodEffectsCtor === "function" && current instanceof ZodEffectsCtor) {
      const definition = Reflect.get(current, "_def") as unknown as
        | { schema?: z.ZodTypeAny }
        | undefined;
      if (!definition?.schema) {
        break;
      }
      current = definition.schema;
      continue;
    }

    break;
  }

  return current;
}

export function SchemaForm({
  schema,
  value,
  onChange,
}: {
  schema?: unknown;
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>) => void;
}) {
  if (!(schema instanceof z.ZodObject)) {
    return (
      <p className="text-sm text-muted-foreground">
        This module does not expose a configurable Zod object schema.
      </p>
    );
  }

  const fields = Object.entries(schema.shape as Record<string, z.ZodTypeAny>);
  if (!fields.length) {
    return (
      <p className="text-sm text-muted-foreground">
        This module does not require config fields.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map(([key, field]) => {
        const base = unwrapField(field);

        if (base instanceof z.ZodString) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`schema-${key}`}>{key}</Label>
              <Input
                id={`schema-${key}`}
                value={String(value[key] ?? "")}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]: event.target.value,
                  })
                }
              />
            </div>
          );
        }

        if (base instanceof z.ZodNumber) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`schema-${key}`}>{key}</Label>
              <Input
                id={`schema-${key}`}
                type="number"
                value={Number(value[key] ?? 0)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </div>
          );
        }

        if (base instanceof z.ZodBoolean) {
          return (
            <div key={key} className="flex items-center gap-2 py-2">
              <Checkbox
                id={`schema-${key}`}
                checked={Boolean(value[key])}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    [key]: Boolean(checked),
                  })
                }
              />
              <Label htmlFor={`schema-${key}`}>{key}</Label>
            </div>
          );
        }

        if (base instanceof z.ZodEnum) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`schema-${key}`}>{key}</Label>
              <select
                id={`schema-${key}`}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={String(value[key] ?? base.options[0] ?? "")}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]: event.target.value,
                  })
                }
              >
                {base.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return (
          <p key={key} className="text-xs text-muted-foreground">
            `{key}` is not supported in the generated form yet. Use the JSON
            editor below.
          </p>
        );
      })}
    </div>
  );
}
