"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { useState, type ReactNode } from "react";
import type { AbstractIntlMessages } from "next-intl";

import { Toaster } from "@/components/ui/sonner";
import { LoginHandoffProvider } from "@/components/shared/login-handoff/login-handoff-provider";
import { SessionLifecycleProvider } from "@/components/shared/session-lifecycle-provider";
import type { AppLocale } from "@/i18n/config";

type ProvidersProps = {
  children: ReactNode;
  locale: AppLocale;
  messages: AbstractIntlMessages;
  timeZone: string;
};

export function Providers({ children, locale, messages, timeZone }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <QueryClientProvider client={queryClient}>
        <SessionLifecycleProvider>
          <LoginHandoffProvider>{children}</LoginHandoffProvider>
          <Toaster />
        </SessionLifecycleProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
