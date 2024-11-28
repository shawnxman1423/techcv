import { createZodDto } from "nestjs-zod/dto";
import { z } from "nestjs-zod/z";

export const importFileSchema = z.object({
  title: z.string(),
  slug: z.string(),
  file: z.string(),
  type: z.enum(["pdf", "png", "jpg", "jpeg"]),
});

export class ImportFileDto extends createZodDto(importFileSchema) {}
