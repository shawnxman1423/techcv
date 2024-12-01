import { fromStorage } from "@lingui/detect-locale";
import { fromUrl } from "@lingui/detect-locale";
import { detect } from "@lingui/detect-locale";
import { useMemo } from "react";

import { defaultLocale } from "../libs/lingui";

export const useLocale = () => {
  const detectedLocal = useMemo(
    () => detect(fromUrl("locale"), fromStorage("locale"), defaultLocale) ?? defaultLocale,
    [],
  );
  return detectedLocal;
};
