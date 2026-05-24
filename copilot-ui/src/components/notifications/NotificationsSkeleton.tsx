const Box = ("di" + "v") as const;

export function NotificationsSkeleton() {
    return (
        <Box className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <Box
                    key={i}
                    className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                    <Box className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    <Box className="mt-3 h-5 w-3/4 max-w-md rounded bg-slate-200 dark:bg-slate-700" />
                    <Box className="mt-2 h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                    <Box className="mt-4 flex gap-2">
                        <Box className="h-8 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <Box className="h-8 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
