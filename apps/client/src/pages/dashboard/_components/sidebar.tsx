import { t } from "@lingui/macro";
import { CreditCard, FadersHorizontal, ReadCvLogo } from "@phosphor-icons/react";
import { Button, KeyboardShortcut, Separator } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

// import { Copyright } from "@/client/components/copyright";
import { Icon } from "@/client/components/icon";
import { UserAvatar } from "@/client/components/user-avatar";
import { UserOptions } from "@/client/components/user-options";
import { useUser } from "@/client/services/user";

type Props = {
  className?: string;
};

const ActiveIndicator = ({ className }: Props) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={cn(
      "size-1.5 animate-pulse rounded-full bg-info shadow-[0_0_12px] shadow-info",
      className,
    )}
  />
);

type SidebarItem = {
  path: string;
  name: string;
  shortcut?: string;
  icon: React.ReactNode;
};

type SidebarItemProps = SidebarItem & {
  onClick?: () => void;
};

const SidebarItem = ({ path, name, shortcut, icon, onClick }: SidebarItemProps) => {
  const isActive = useLocation().pathname === path;

  return (
    <Button
      asChild
      size="lg"
      variant="ghost"
      className={cn(
        "h-auto justify-start px-4 py-3",
        isActive && "pointer-events-none bg-secondary/50 text-secondary-foreground",
      )}
      onClick={onClick}
    >
      <Link to={path}>
        <div className="me-3">{icon}</div>
        <span>{name}</span>
        {!isActive && <KeyboardShortcut className="ms-auto">{shortcut}</KeyboardShortcut>}
        {isActive && <ActiveIndicator className="ms-auto" />}
      </Link>
    </Button>
  );
};

type SidebarProps = {
  setOpen?: (open: boolean) => void;
};

export const Sidebar = ({ setOpen }: SidebarProps) => {
  const { user } = useUser();

  const sidebarItems: SidebarItem[] = [
    {
      path: "/dashboard/resumes",
      name: t`Resumes`,
      icon: <ReadCvLogo />,
    },
    {
      path: "/dashboard/billing",
      name: t`Billing`,
      icon: <CreditCard />,
    },
    {
      path: "/dashboard/settings",
      name: t`Settings`,
      icon: <FadersHorizontal />,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-y-4">
      <div className="ms-12 flex lg:ms-0">
        <Button asChild size="icon" variant="ghost" className="size-10 p-0">
          <Link to="/dashboard">
            <Icon size={24} className="mx-auto hidden lg:block" />
          </Link>
        </Button>
      </div>

      <Separator className="opacity-50" />

      <div className="grid gap-y-2">
        {sidebarItems.map((item) => (
          <SidebarItem {...item} key={item.path} onClick={() => setOpen?.(false)} />
        ))}
      </div>

      <div className="flex-1" />

      <Separator className="opacity-50" />

      <UserOptions>
        <Button size="lg" variant="ghost" className="w-full justify-start px-3">
          <UserAvatar size={24} className="me-3" />
          <span>{user?.name}</span>
        </Button>
      </UserOptions>

      {/* <Copyright className="ms-2" /> */}
    </div>
  );
};
