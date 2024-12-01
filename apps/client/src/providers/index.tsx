import { TooltipProvider } from "@reactive-resume/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Outlet, useSearchParams } from "react-router-dom";

import { helmetContext } from "../constants/helmet";
import { queryClient } from "../libs/query-client";
import { AuthRefreshProvider } from "./auth-refresh";
import { DialogProvider } from "./dialog";
import { LocaleProvider } from "./locale";
import { ThemeProvider } from "./theme";
import { Toaster } from "./toaster";

export const Providers = () => {
  const [searchParams] = useSearchParams();
  const redirectAfterLogin = searchParams.get("redirectAfterLogin");

  useEffect(() => {
    if (redirectAfterLogin) {
      localStorage.setItem("redirectAfterLogin", redirectAfterLogin);
      searchParams.delete("redirectAfterLogin");
    }
  }, [redirectAfterLogin]);

  return (
    <LocaleProvider>
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <AuthRefreshProvider>
            <ThemeProvider>
              <TooltipProvider>
                <DialogProvider>
                  <Outlet />

                  <Toaster />
                </DialogProvider>
              </TooltipProvider>
            </ThemeProvider>
          </AuthRefreshProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </LocaleProvider>
  );
};
