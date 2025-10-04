'use client'

interface DateIndicatorProps {
  selectedDate: string
  className?: string
}

export function DateIndicator({ selectedDate, className = '' }: DateIndicatorProps) {
  // Handle empty or invalid date
  if (!selectedDate) return null

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  selectedDateObj.setHours(0, 0, 0, 0)

  const isToday = selectedDateObj.toDateString() === today.toDateString()
  const isPast = selectedDateObj < today
  const isFuture = selectedDateObj > today

  const getDateType = () => {
    if (isToday) return { label: 'Current', color: 'bg-green-500', icon: '🔴' }
    if (isPast) return { label: 'Historical', color: 'bg-amber-500', icon: '📅' }
    if (isFuture) return { label: 'Forecast', color: 'bg-blue-500', icon: '🔮' }
    return { label: 'Current', color: 'bg-green-500', icon: '🔴' }
  }

  const formatDate = (dateStr: string) => {
    if (isToday) return 'Today'

    const date = new Date(dateStr)
    const isThisYear = date.getFullYear() === today.getFullYear()
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: isThisYear ? undefined : 'numeric'
    })
  }

  const getTimeDescription = () => {
    if (isToday) return 'Live data & real-time forecast'
    if (isPast) return 'Historical data & analysis'
    if (isFuture) return 'Predictive forecast'
    return ''
  }

  const dateType = getDateType()

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl ${dateType.color} bg-opacity-10 border border-current border-opacity-20`}>
        <span className="text-xs">{dateType.icon}</span>
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${isPast ? 'text-amber-700 dark:text-amber-400' : isFuture ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'}`}>
            {formatDate(selectedDate)}
          </span>
          <span className={`text-xs ${isPast ? 'text-amber-600 dark:text-amber-500' : isFuture ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'}`}>
            {dateType.label}
          </span>
        </div>
      </div>

      {/* Data Quality Indicator - shows on hover */}
      <div className="group relative">
        <svg className={`w-4 h-4 ${isPast ? 'text-amber-500' : isFuture ? 'text-blue-500' : 'text-green-500'}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>

        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg py-2 px-3 whitespace-nowrap">
            {getTimeDescription()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
          </div>
        </div>
      </div>
    </div>
  )
}