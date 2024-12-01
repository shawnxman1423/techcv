import { createZodDto } from "nestjs-zod/dto";
import { z } from "nestjs-zod/z";

export const importFileSchema = z.object({
  file: z.string(),
  type: z.enum(["pdf", "png", "jpg", "jpeg"]),
});

export class ImportFileDto extends createZodDto(importFileSchema) {}
