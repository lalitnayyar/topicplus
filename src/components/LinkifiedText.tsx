import { splitTextAndUrls } from "@/lib/linkify";

export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {splitTextAndUrls(text).map((segment, i) =>
        segment.isUrl ? (
          <a
            key={i}
            href={segment.text}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary-600 underline underline-offset-2 hover:text-primary-700"
          >
            {segment.text}
          </a>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}
