const STATUS_STYLES: Record<string, string> = {
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.processing
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${style}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
