import "@/client/libs/dayjs";

import { i18n } from "@lingui/core";
import { detect, fromStorage, fromUrl } from "@lingui/detect-locale";
import { I18nProvider } from "@lingui/react";
import { languages } from "@reactive-resume/utils";
import React, { lazy, useEffect, useMemo } from "react";

import { defaultLocale, dynamicActivate } from "../libs/lingui";
import { updateUser } from "../services/user";
import { useAuthStore } from "../stores/auth";

const RtlProvider = lazy(() => {
  const comp = import("./rtl");
  return comp;
});

type Props = {
  children: React.ReactNode;
};

export const LocaleProvider = ({ children }: Props) => {
  const userLocale = useAuthStore((state) => state.user?.locale);

  const detectedLocal = useMemo(
    () => detect(fromUrl("locale"), fromStorage("locale"), defaultLocale) ?? defaultLocale,
    [userLocale],
  );

  console.log(detectedLocal);

  useEffect(() => {
    const detectedLocale =
      detect(fromUrl("locale"), fromStorage("locale"), defaultLocale) ?? defaultLocale;
    // Activate the locale only if it's supported
    if (languages.some((lang) => lang.locale === detectedLocale)) {
      void dynamicActivate(detectedLocale);
    } else {
      void dynamicActivate(defaultLocale);
    }
  }, [userLocale]);

  return (
    <I18nProvider i18n={i18n}>
      <>
        <React.Suspense fallback={null}>
          {detectedLocal === "he-IL" && <RtlProvider />}
        </React.Suspense>
        {children}
      </>
    </I18nProvider>
  );
};

export const changeLanguage = async (locale: string) => {
  // Update locale in local storage
  window.localStorage.setItem("locale", locale);

  // Update locale in user profile, if authenticated
  const state = useAuthStore.getState();
  if (state.user) await updateUser({ locale }).catch(() => null);

  // Reload the page for language switch to take effect
  window.location.reload();
};
