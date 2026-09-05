export function AppFooter() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center text-xs text-foreground-muted sm:px-6">
      <p>
        TopicPulse — provided &quot;as is,&quot; without warranty of any kind. Demo mode uses synthetic sample data only.
      </p>
      <p className="mt-1">
        © {new Date().getFullYear()}{" "}
        <a href="mailto:lalitnayyar@gmail.com" className="font-medium text-primary-600 hover:underline">
          Lalit Nayyar
        </a>
      </p>
    </footer>
  );
}
