import { t } from "@lingui/macro";
import { FilePdf } from "@phosphor-icons/react";
import { KeyboardShortcut } from "@reactive-resume/ui";

import { useSubscription } from "@/client/services/user";
import { useDialog } from "@/client/stores/dialog";

import { BaseListItem } from "./base-item";

export const ImportFileListItem = () => {
  const subscription = useSubscription();
  const { open: openPremium } = useDialog("premium");
  const { open: openImportFile } = useDialog("import-file");

  return (
    <BaseListItem
      start={<FilePdf size={18} />}
      title={
        <>
          <span>{t`Import an existing resume`}</span>
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          <KeyboardShortcut className="ms-2">^K</KeyboardShortcut>
        </>
      }
      description={t`LinkedIn, PDF, etc.`}
      onClick={() => {
        if (subscription.isPro) openImportFile("create");
        else openPremium("update");
      }}
    />
  );
};
