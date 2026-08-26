interface EmptyStateProps {
  message: string;
  className?: string;
}

export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center text-sm text-muted-foreground ${className ?? ""}`}>
      {message}
    </div>
  );
}
