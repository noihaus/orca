export function DoorayIcon({
  className,
  size
}: {
  className?: string
  size?: number
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
      width={size}
      height={size}
    >
      <path d="M4.5 3A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h7.25C16.86 21 21 16.97 21 12s-4.14-9-9.25-9H4.5Zm3 4.5h4.25c2.62 0 4.75 2.02 4.75 4.5s-2.13 4.5-4.75 4.5H7.5v-9Z" />
    </svg>
  )
}
