export function UserMessage({ content }: { content: string }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm text-white">
                <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
        </div>
    );
}
