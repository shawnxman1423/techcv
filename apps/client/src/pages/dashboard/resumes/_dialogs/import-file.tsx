import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { MagicWand, Plus, Spinner } from "@phosphor-icons/react";
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
  Tooltip,
} from "@reactive-resume/ui";
import { generateRandomName, kebabCase } from "@reactive-resume/utils";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useToast } from "@/client/hooks/use-toast";
import { useImportFileResume } from "@/client/services/resume/import-file";
import { useDialog } from "@/client/stores/dialog";

const formSchema = z.object({
  ...createResumeSchema.shape,
  ...importFileSchema.shape,
  file: z.instanceof(File),
  type: z.enum(["pdf", "png", "jpg", "jpeg"]),
});

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

  const filetype = form.watch("type");

  const accept = useMemo(() => {
    if (filetype === "pdf") return ".pdf";
    if (filetype === "png") return ".png";
    if (filetype === "jpg") return ".jpg";
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (filetype === "jpeg") return ".jpeg";
    return "";
  }, [filetype]);

  const onSubmit = async (values: FormValues) => {
    const file = values.file;
    const base64 = await fileToBase64(file);

    console.log(base64);

    await importFileResume({
      title: values.title,
      slug: values.slug,
      file: base64.split(",")[1],
      type: values.type,
    });

    close();
  };

  const onGenerateRandomName = () => {
    const name = generateRandomName();
    form.setValue("title", name);
    form.setValue("slug", kebabCase(name));
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-h-screen overflow-y-scroll">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2.5">
                  <Plus />
                  <h2>{t`Import existing resume`}</h2>
                </div>
              </DialogTitle>
              <DialogDescription>{t`Upload your resume file`}</DialogDescription>
            </DialogHeader>

            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Title`}</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-between gap-x-2">
                      <Input {...field} className="flex-1" />

                      <Tooltip content={t`Generate a random title for your resume`}>
                        <Button
                          size="icon"
                          type="button"
                          variant="outline"
                          onClick={onGenerateRandomName}
                        >
                          <MagicWand />
                        </Button>
                      </Tooltip>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t`Tip: You can name the resume referring to the position you are applying for.`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="slug"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Slug`}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
