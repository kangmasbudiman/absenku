export default function ScheduleLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg mb-1" />
      <div className="h-4 w-64 bg-gray-100 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-12 bg-gray-50 border-b border-gray-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50">
            <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="flex gap-4 ml-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="w-10 h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
