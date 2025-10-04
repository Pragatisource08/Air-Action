export function MapSkeleton() {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gray-200 dark:bg-gray-800" style={{ height: '500px' }}>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer" />
      <div className="absolute top-4 left-4 space-y-2">
        <div className="h-10 w-32 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse" />
        <div className="h-10 w-40 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

export function ForecastChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function HealthAdviceSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export function DataSourceSkeleton() {
  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
      <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
      <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
    </div>
  )
}
