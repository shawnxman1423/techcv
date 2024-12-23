import { t } from "@lingui/macro";
import { DownloadSimple } from "@phosphor-icons/react";
import { KeyboardShortcut } from "@reactive-resume/ui";

import { useDialog } from "@/client/stores/dialog";

import { BaseListItem } from "./base-item";

export const ImportResumeListItem = () => {
  const { open } = useDialog("import");
  return (
    <BaseListItem
      start={<DownloadSimple size={18} />}
      title={
        <>
          <span>{t`Import from backup`}</span>
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          <KeyboardShortcut className="ms-2">^I</KeyboardShortcut>
        </>
      }
      description={t`JSON Resume, etc...`}
      onClick={() => {
        open("create");
      }}
    />
  );
};
