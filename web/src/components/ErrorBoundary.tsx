'use client'

interface ErrorDisplayProps {
  error: Error | string
  onRetry?: () => void
  title?: string
}

export function ErrorDisplay({ error, onRetry, title = "Something went wrong" }: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-6 shadow-lg">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface NetworkErrorProps {
  onRetry?: () => void
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-3xl p-6 shadow-lg">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
            Connection Issue
          </h3>
          <p className="mt-2 text-sm text-orange-700 dark:text-orange-300">
            Unable to fetch air quality data. Please check your internet connection and try again.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface NoDataErrorProps {
  location?: string
  onSelectNewLocation?: () => void
}

export function NoDataError({ location, onSelectNewLocation }: NoDataErrorProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl p-6 shadow-lg">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
            No Data Available
          </h3>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            {location
              ? `No air quality data available for ${location}. Try selecting a different location.`
              : 'No air quality data available for this location. Try selecting a different location.'
            }
          </p>
          {onSelectNewLocation && (
            <button
              onClick={onSelectNewLocation}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors duration-200 text-sm font-medium"
            >
              Select Different Location
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
