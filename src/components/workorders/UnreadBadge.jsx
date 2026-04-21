import { cn } from "@/lib/utils";

export default function UnreadBadge({ count, className }) {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span className={cn(
      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full",
      "bg-red-500 text-white text-[10px] font-bold leading-none",
      className
    )}>
      {label}
    </span>
  );
}