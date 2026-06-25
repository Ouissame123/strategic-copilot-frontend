import { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { RhRequestRow } from "@/components/rh-requests/manager-requests/RequestCard";
import type { InboxSourceTabId } from "@/components/rh/inbox/InboxSourceTabs";
import { INBOX_SOURCE_TABS } from "@/components/rh/inbox/InboxSourceTabs";

type UseInboxKeyboardOptions = {
    items: RhRequestRow[];
    enabled?: boolean;
    onOpenDetail: (item: RhRequestRow) => void;
    onQuickAccept: (item: RhRequestRow) => void;
    onQuickReject: (item: RhRequestRow) => void;
    onClosePanel: () => void;
    onOpenCommandPalette: () => void;
    onSourceChange: (id: InboxSourceTabId) => void;
    panelOpen: boolean;
};

const SOURCE_BY_KBD: Record<string, InboxSourceTabId> = Object.fromEntries(
    INBOX_SOURCE_TABS.map((t) => [t.kbd, t.id]),
);

export function useInboxKeyboard({
    items,
    enabled = true,
    onOpenDetail,
    onQuickAccept,
    onQuickReject,
    onClosePanel,
    onOpenCommandPalette,
    onSourceChange,
    panelOpen,
}: UseInboxKeyboardOptions) {
    const [focusIndex, setFocusIndex] = useState(0);

    useEffect(() => {
        if (focusIndex >= items.length) setFocusIndex(Math.max(0, items.length - 1));
    }, [items.length, focusIndex]);

    const focusedItem = items[focusIndex] ?? null;
    const listEnabled = enabled && !panelOpen;

    useHotkeys(
        "mod+k",
        (e) => {
            e.preventDefault();
            onOpenCommandPalette();
        },
        { enabled, enableOnFormTags: false },
        [enabled, onOpenCommandPalette],
    );

    useHotkeys("j", () => setFocusIndex((i) => Math.min(items.length - 1, i + 1)), {
        enabled: listEnabled,
        enableOnFormTags: false,
    });

    useHotkeys("k", () => setFocusIndex((i) => Math.max(0, i - 1)), {
        enabled: listEnabled,
        enableOnFormTags: false,
    });

    useHotkeys(
        "d",
        () => {
            if (focusedItem) onOpenDetail(focusedItem);
        },
        { enabled: listEnabled && Boolean(focusedItem), enableOnFormTags: false },
        [listEnabled, focusedItem, onOpenDetail],
    );

    useHotkeys(
        "a",
        () => {
            if (focusedItem) onQuickAccept(focusedItem);
        },
        { enabled: listEnabled && Boolean(focusedItem), enableOnFormTags: false },
        [listEnabled, focusedItem, onQuickAccept],
    );

    useHotkeys(
        "r",
        () => {
            if (focusedItem) onQuickReject(focusedItem);
        },
        { enabled: listEnabled && Boolean(focusedItem), enableOnFormTags: false },
        [listEnabled, focusedItem, onQuickReject],
    );

    useHotkeys(
        "escape",
        () => {
            if (panelOpen) onClosePanel();
        },
        { enabled: panelOpen, enableOnFormTags: true },
        [panelOpen, onClosePanel],
    );

    useHotkeys(
        "1,2,3,4,5",
        (_e, handler) => {
            const key = handler.keys?.join("") ?? "";
            const source = SOURCE_BY_KBD[key];
            if (source) onSourceChange(source);
        },
        { enabled: listEnabled, enableOnFormTags: false },
        [listEnabled, onSourceChange],
    );

    useHotkeys(
        "/",
        (e) => {
            e.preventDefault();
            const input = document.querySelector<HTMLInputElement>('[data-inbox-search="true"]');
            input?.focus();
        },
        { enabled: listEnabled, enableOnFormTags: false },
    );

    return { focusIndex, focusedItem, setFocusIndex };
}
