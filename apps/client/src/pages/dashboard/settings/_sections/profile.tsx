import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { useTheme } from "@reactive-resume/hooks";
import { Button, Form, FormField, FormItem, FormLabel } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { LocaleComboboxPopover } from "@/client/components/locale-combobox";
import { useLocale } from "@/client/hooks/use-locale";
import { useUpdateUser, useUser } from "@/client/services/user";

const formSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  locale: z.string().default("he-IL"),
});

type FormValues = z.infer<typeof formSchema>;

export const ProfileSettings = () => {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const { updateUser, loading } = useUpdateUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { theme, locale },
  });

  useEffect(() => {
    user && onReset();
  }, [user]);

  const onReset = () => {
    if (!user) return;

    form.reset({ theme, locale });
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    setTheme(data.theme);

    if (locale !== data.locale) {
      window.localStorage.setItem("locale", data.locale);
      await updateUser({ locale: data.locale });

      window.location.reload();
    }

    form.reset(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold leading-relaxed tracking-tight">{t`Profile`}</h3>
        <p className="leading-relaxed opacity-75">
          {t`Here, you can update your profile to customize and personalize your experience.`}
        </p>
      </div>

      <Form {...form}>
        <form className="grid gap-6 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
         {/*  <FormField
            name="theme"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Theme`}</FormLabel>
                <div className="w-full">
                  <Combobox
                    {...field}
                    searchPlaceholder={t`Search for an option`}
                    value={field.value}
                    options={[
                      { label: t`System`, value: "system" },
                      { label: t`Light`, value: "light" },
                      { label: t`Dark`, value: "dark" },
                    ]}
                    onValueChange={field.onChange}
                  />
                </div>
              </FormItem>
            )}
          /> */}

          <FormField
            name="locale"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Language`}</FormLabel>
                <div className="w-full">
                  <LocaleComboboxPopover value={field.value} onValueChange={field.onChange} />
                </div>
              </FormItem>
            )}
          />

          <div
            className={cn(
              "hidden items-center gap-2 self-center sm:col-start-2",
              form.formState.isDirty && "flex animate-in fade-in",
            )}
          >
            <Button type="submit" disabled={loading}>
              {t`Save Changes`}
            </Button>
            <Button type="reset" variant="ghost" onClick={onReset}>
              {t`Discard`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
