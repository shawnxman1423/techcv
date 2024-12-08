import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { Plus, Spinner } from "@phosphor-icons/react";
import { ResumeDto } from "@reactive-resume/dto";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from "@reactive-resume/ui";
import { cn, generateRandomName, kebabCase } from "@reactive-resume/utils";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateAiResume, useResumes } from "@/client/services/resume";
import { useDialog } from "@/client/stores/dialog";

const formSchema = z.object({
  existingResumeId: z.string().min(1).optional(),
  jobDescription: z.string().min(1).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const CreateAiDialog = () => {
  const { isOpen, close } = useDialog<ResumeDto[]>("create-ai");
  const { resumes } = useResumes();
  const { createAiResume, loading: createAiLoading } = useCreateAiResume();

  const loading = createAiLoading;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      existingResumeId: "",
      jobDescription: "",
    },
  });

  useEffect(() => {
    if (isOpen) onReset();
  }, [isOpen]);

  const onSubmit = async (values: FormValues) => {
    const title = generateRandomName();
    const slug = kebabCase(title);

    await createAiResume({
      title,
      slug,
      visibility: "private",
      existingResumeId: values.existingResumeId,
      jobDescription: values.jobDescription,
    });

    close();
  };

  const onReset = () => {
    form.reset({
      existingResumeId: "",
      jobDescription: "",
    });
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
                  <h2>{t`Create a resume with AI`}</h2>
                </div>
              </DialogTitle>
              <DialogDescription>{t`Let the AI do the work`}</DialogDescription>
            </DialogHeader>

            <FormField
              name="existingResumeId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Resume`}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t`Please select an existing resume`} />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes?.map((resume: ResumeDto) => (
                          <SelectItem key={resume.id} value={resume.id}>
                            {resume.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="jobDescription"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Job Description`}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <div className="flex items-center">
                <Button type="submit" disabled={loading} className={cn("rounded-r-none")}>
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
