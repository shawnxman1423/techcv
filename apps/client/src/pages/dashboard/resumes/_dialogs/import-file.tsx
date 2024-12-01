import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { Plus, Spinner } from "@phosphor-icons/react";
import { createResumeSchema, ImportFileDto, importFileSchema } from "@reactive-resume/dto";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@reactive-resume/ui";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z, ZodError } from "zod";

import { useToast } from "@/client/hooks/use-toast";
import { useImportFileResume } from "@/client/services/resume/import-file";
import { importLinkedinResume } from "@/client/services/resume/import-linkedin";
import { useDialog } from "@/client/stores/dialog";

const formSchema = z.object({
  ...createResumeSchema.shape,
  ...importFileSchema.shape,
  file: z.instanceof(File),
  type: z.enum(["pdf", "png", "jpg", "jpeg"]),
});

const formLinkedinSchema = z.object({
  linkedinUrl: z
    .string()
    .url()
    .refine((value) => value.includes("linkedin.com/in/")),
});

type FormLinkedinValues = z.infer<typeof formLinkedinSchema>;

type FormValues = z.infer<typeof formSchema>;

export const ImportFileDialog = () => {
  const { isOpen, close } = useDialog<ImportFileDto[]>("import-file");
  const { importFileResume, loading } = useImportFileResume();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      file: undefined,
      type: "pdf",
    },
  });

  const linkedinForm = useForm<FormLinkedinValues>({
    defaultValues: {
      linkedinUrl: "",
    },
    resolver: zodResolver(formLinkedinSchema),
  });

  const filetype = form.watch("type");

  const accept = useMemo(() => {
    if (filetype === "pdf") return ".pdf";
    if (filetype === "png") return ".png";
    if (filetype === "jpg") return ".jpg";
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (filetype === "jpeg") return ".jpeg";
    return "";
  }, [filetype]);

  const onLinkedinImport = async () => {
    try {
      const { linkedinUrl } = formLinkedinSchema.parse(linkedinForm.getValues());
      await importLinkedinResume({ linkedinURL: linkedinUrl });
      close();
    } catch (error) {
      if (error instanceof ZodError) {
        toast({
          variant: "error",
          title: t`An error occurred while validating the LinkedIn URL.`,
        });
      } else if (error instanceof Error) {
        toast({
          variant: "error",
          title: t`Oops, the server returned an error.`,
          description: error.message,
        });
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    const file = values.file;
    const base64 = await fileToBase64(file);

    await importFileResume({
      file: base64.split(",")[1],
      type: values.type,
    });

    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-h-screen overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2.5">
              <Plus />
              <h2>{t`Import existing resume`}</h2>
            </div>
          </DialogTitle>
          <DialogDescription>{t`Upload your resume file`}</DialogDescription>
        </DialogHeader>

        <Form {...linkedinForm}>
          <form className="space-y-4">
            <FormField
              name="linkedinUrl"
              control={linkedinForm.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`LinkedIn Profile URL`}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://www.linkedin.com/in/ryanroslansky/" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <div className="flex justify-end gap-2">
          <Button type="button" disabled={loading} onClick={onLinkedinImport}>
            {loading && <Spinner size={16} className="me-2 animate-spin" />}
            {t`Import`}
          </Button>
        </div>

        <Separator />
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="type"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Filetype`}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t`Please select a file type`} />
                      </SelectTrigger>
                      <SelectContent>
                        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                        <SelectItem value="pdf">PDF</SelectItem>
                        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                        <SelectItem value="png">PNG</SelectItem>
                        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                        <SelectItem value="jpg">JPG</SelectItem>
                        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                        <SelectItem value="jpeg">JPEG</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="file"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`File`}</FormLabel>
                  <FormControl>
                    <Input
                      key={`${accept}-${filetype}`}
                      type="file"
                      accept={accept}
                      onChange={(event) => {
                        if (!event.target.files?.length) return;
                        field.onChange(event.target.files[0]);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {accept && (
                    <FormDescription>
                      {t({
                        message: `Accepts only ${accept} files`,
                        comment:
                          "Helper text to let the user know what filetypes are accepted. {accept} can be .pdf or .json.",
                      })}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter>
              <div className="flex items-center">
                <Button type="submit" disabled={loading} className="rounded-r-none">
                  {loading && <Spinner className="me-2 animate-spin" />}
                  {t`Create`}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener("load", () => {
      resolve(reader.result as string);
    });
    reader.addEventListener("error", (error) => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(error);
    });
  });
};
