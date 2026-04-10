import type { FC, HTMLAttributes } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { Placement } from "@react-types/overlays";
import { ChevronSelectorVertical, LogOut01, Settings01, User01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { useAuth } from "@/providers/auth-provider";
import { getDisplayName } from "@/utils/profile-storage";
import { useFocusManager } from "react-aria";
import type { DialogProps as AriaDialogProps } from "react-aria-components";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
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

const placeholderAccounts: NavAccountType[] = [
    {
        id: "olivia",
        name: "Olivia Rhye",
        email: "olivia@untitledui.com",
        avatar: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80",
        status: "online",
    },
    {
        id: "sienna",
        name: "Sienna Hewitt",
        email: "sienna@untitledui.com",
        avatar: "https://www.untitledui.com/images/avatars/transparent/sienna-hewitt?bg=%23E0E0E0",
        status: "online",
    },
];

export const NavAccountMenu = ({
    className,
    isAdmin = false,
    ...dialogProps
}: AriaDialogProps & { className?: string; accounts?: NavAccountType[]; selectedAccountId?: string; isAdmin?: boolean }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const focusManager = useFocusManager();
    const dialogRef = useRef<HTMLDivElement>(null);

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    focusManager?.focusNext({ tabbable: true, wrap: true });
                    break;
                case "ArrowUp":
                    focusManager?.focusPrevious({ tabbable: true, wrap: true });
                    break;
            }
        },
        [focusManager],
    );

    useEffect(() => {
        const element = dialogRef.current;
        if (element) {
            element.addEventListener("keydown", onKeyDown);
        }

        return () => {
            if (element) {
                element.removeEventListener("keydown", onKeyDown);
            }
        };
    }, [onKeyDown]);

    return (
        <AriaDialog
            {...dialogProps}
            ref={dialogRef}
            className={cx("w-66 rounded-xl bg-secondary_alt shadow-lg ring ring-secondary_alt outline-hidden", className)}
        >
            <div className="rounded-xl bg-primary ring-1 ring-secondary">
                <div className="flex flex-col gap-0.5 py-1.5">
                    <NavAccountCardMenuItem label="View profile" icon={User01} shortcut="⌘K->P" href="/profile" />
                    {isAdmin && (
                        <NavAccountCardMenuItem label="Account settings" icon={Settings01} shortcut="⌘S" href="/account-settings" />
                    )}
                </div>
            </div>

            <div className="pt-1 pb-1.5">
                <NavAccountCardMenuItem
                    label="Sign out"
                    icon={LogOut01}
                    shortcut="⌥⇧Q"
                    onClick={() => {
                        logout();
                        navigate("/login", { replace: true });
                    }}
                />
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
    ...rest
}: {
    icon?: FC<{ className?: string }>;
    label: string;
    shortcut?: string;
    href?: string;
    onClick?: () => void;
} & HTMLAttributes<HTMLButtonElement>) => {
    const content = (
        <div
            className={cx(
                "flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover",
                "outline-focus-ring group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
            )}
        >
            <div className="flex gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover">
                {Icon && <Icon className="size-5 text-fg-quaternary" />} {label}
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
            onClick={onClick ?? rest.onClick}
            className={cx("group/item w-full cursor-pointer px-1.5 focus:outline-hidden", rest.className)}
        >
            {content}
        </button>
    );
};

export const NavAccountCard = ({
    popoverPlacement,
}: {
    popoverPlacement?: Placement;
    selectedAccountId?: string;
    items?: NavAccountType[];
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint("lg");
    const { user } = useAuth();

    const displayName = user?.email ? getDisplayName(user.email) : "";
    const isAdmin = user?.role === "admin";

    if (!user?.email) return null;

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
                        <NavAccountMenu isAdmin={isAdmin} />
                    </AriaPopover>
                </AriaDialogTrigger>
            </div>
        </div>
    );
};
