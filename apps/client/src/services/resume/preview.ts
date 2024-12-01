import { ResumeData } from "@reactive-resume/schema";
import { useCallback, useEffect, useRef, useState } from "react";

export const useResumePreview = (resume: ResumeData) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateResumeInFrame = useCallback(() => {
    if (!frameRef.current?.contentWindow) return;
    const message = { type: "SET_RESUME", payload: resume };

    const timer = setTimeout(() => {
      setIsLoading(false);
      frameRef.current?.contentWindow?.postMessage(message, "*");
    }, 1000);

    (() => {
      frameRef.current.contentWindow.postMessage(message, "*");
    })();

    return () => {
      clearTimeout(timer);
    };
  }, [frameRef, resume]);

  useEffect(() => {
    if (!frameRef.current) return;
    frameRef.current.addEventListener("load", updateResumeInFrame);

    return () => frameRef.current?.removeEventListener("load", updateResumeInFrame);
  }, [frameRef]);

  return { frameRef, isLoading };
};