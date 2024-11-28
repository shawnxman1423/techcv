import { ImportFileDto, ResumeDto } from "@reactive-resume/dto";
import { useMutation } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

import { axios } from "@/client/libs/axios";
import { queryClient } from "@/client/libs/query-client";

export const importFileResume = async (data: ImportFileDto) => {
  const response = await axios.post<ImportFileDto, AxiosResponse<ResumeDto>, ImportFileDto>(
    "/resume/import-file",
    data,
  );
  return response.data;
};

export const useImportFileResume = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: importFileResumeFn,
  } = useMutation({
    mutationFn: importFileResume,
    onSuccess: (data) => {
      queryClient.setQueryData<ResumeDto>(["resume", { id: data.id }], data);

      queryClient.setQueryData<ResumeDto[]>(["resumes"], (cache) => {
        if (!cache) return [data];
        return [...cache, data];
      });
    },
  });

    return { importFileResume: importFileResumeFn, loading, error };
};
