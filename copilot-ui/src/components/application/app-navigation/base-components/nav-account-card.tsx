import type { FC, HTMLAttributes, KeyboardEvent } from "react";
import { useCallback, useRef, useState } from "react";
import type { Placement } from "@react-types/overlays";
import { ChevronSelectorVertical, LogOut01, User01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useFocusManager } from "react-aria";
import type { DialogProps as AriaDialogProps } from "react-aria-components";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";

type NavAccountType = {
    /** Unique identifier for the nav item. */
    id: string;
    /** Name of the account holder. */
    name: string;
    /** Email address of the account holder. */
    email: string;
    /** Avatar image URL. */
    avatar: string;
    /** Online status of the account holder. This is used to display the online status indicator. */
    status: "online" | "offline";
};

/** `AriaDialog` n’expose pas `onKeyDown` dans ses props ; on le gère sur un conteneur interne. */
type NavAccountMenuProps = AriaDialogProps & {
    className?: string;
    accounts?: NavAccountType[];
    selectedAccountId?: string;
    onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
    showProfileAction?: boolean;
};

export const NavAccountMenu = ({
    className,
    onKeyDown: upstreamOnKeyDown,
    showProfileAction = true,
    ...dialogProps
}: NavAccountMenuProps) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { profile: profileHref } = useWorkspacePaths();
    const focusManager = useFocusManager();
    const dialogRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            upstreamOnKeyDown?.(e);
            if (e.defaultPrevented) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    focusManager?.focusNext({ tabbable: true, wrap: true });
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    focusManager?.focusPrevious({ tabbable: true, wrap: true });
                    break;
                default:
                    break;
            }
        },
        [upstreamOnKeyDown, focusManager],
    );

    return (
        <AriaDialog
            {...dialogProps}
            ref={dialogRef}
            className={cx("w-66 rounded-xl bg-secondary_alt shadow-lg ring ring-secondary_alt outline-hidden", className)}
        >
            <div onKeyDown={handleKeyDown}>
                {showProfileAction ? (
                    <div className="rounded-xl bg-primary ring-1 ring-secondary">
                        <div className="flex flex-col gap-0.5 py-1.5">
                            <NavAccountCardMenuItem label="View profile" icon={User01} shortcut="⌘K->P" href={profileHref} />
                        </div>
                    </div>
                ) : null}

                <div className="pt-1 pb-1.5">
                    <NavAccountCardMenuItem
                        label="Sign out"
                        icon={LogOut01}
                        shortcut="⌥⇧Q"
                        destructive={isLoggingOut}
                        onClick={() => {
                            setIsLoggingOut(true);
                            void logout().finally(() => navigate("/login", { replace: true }));
                        }}
                    />
                </div>
            </div>
        </AriaDialog>
    );
};

const NavAccountCardMenuItem = ({
    icon: Icon,
    label,
    shortcut,
    href,
    onClick,
    destructive,
    ...rest
}: {
    icon?: FC<{ className?: string }>;
    label: string;
    shortcut?: string;
    href?: string;
    onClick?: () => void;
    destructive?: boolean;
} & HTMLAttributes<HTMLButtonElement>) => {
    const content = (
        <div
            className={cx(
                "flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover",
                "outline-focus-ring group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
                destructive && "bg-[#ef4444]/10 text-[#ef4444] ring-1 ring-[#ef4444]/25 group-hover/item:bg-[#ef4444]/10",
            )}
        >
            <div className={cx("flex gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover", destructive && "text-[#ef4444]")}>
                {Icon && <Icon className={cx("size-5 text-fg-quaternary", destructive && "text-[#ef4444]")} />} {label}
            </div>
            {shortcut && (
                <kbd className="flex rounded px-1 py-px font-body text-xs font-medium text-tertiary ring-1 ring-secondary ring-inset">{shortcut}</kbd>
            )}
        </div>
    );

    if (href) {
        const isExternal = href.startsWith("http");
        return (
            <Button
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                color="tertiary"
                size="sm"
                className={cx("group/item w-full justify-start px-1.5 focus:outline-hidden", rest.className)}
            >
                {content}
            </Button>
        );
    }

    return (
        <button
            {...rest}
            type="button"
            onClick={onClick}
            className={cx("group/item w-full cursor-pointer px-1.5 focus:outline-hidden", rest.className)}
        >
            {content}
        </button>
    );
};

export const NavAccountCard = ({
    popoverPlacement,
    compact = false,
    showProfileAction = true,
}: {
    popoverPlacement?: Placement;
    compact?: boolean;
    showProfileAction?: boolean;
    selectedAccountId?: string;
    items?: NavAccountType[];
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint("lg");
    const { user } = useAuth();

    const displayName = user?.fullName?.trim() ?? "";
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    if (!user?.email) return null;

    if (compact) {
        return (
            <div ref={triggerRef} className="relative">
                <Avatar
                    size="sm"
                    src={null}
                    initials={initials || undefined}
                    alt={displayName || user.email}
                    status="online"
                />
            </div>
        );
    }

    return (
        <div ref={triggerRef} className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
            <AvatarLabelGroup
                size="md"
                src=""
                title={displayName || user.email}
                subtitle={user.email}
                status="online"
            />

            <div className="absolute top-1.5 right-1.5">
                <AriaDialogTrigger>
                    <AriaButton className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover pressed:text-fg-quaternary_hover">
                        <ChevronSelectorVertical className="size-4 shrink-0" />
                    </AriaButton>
                    <AriaPopover
                        placement={popoverPlacement ?? (isDesktop ? "right bottom" : "top right")}
                        triggerRef={triggerRef}
                        offset={8}
                        className={({ isEntering, isExiting }) =>
                            cx(
                                "origin-(--trigger-anchor-point) will-change-transform",
                                isEntering &&
                                    "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                                isExiting &&
                                    "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                            )
                        }
                    >
                        <NavAccountMenu showProfileAction={showProfileAction} />
                    </AriaPopover>
                </AriaDialogTrigger>
            </div>
        </div>
    );
};
