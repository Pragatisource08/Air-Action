'use client'

import { useState, useRef, useEffect } from 'react'

interface DateSelectorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [openUpward, setOpenUpward] = useState(true)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCalendarOpen])

  // Helper function to format Date object to YYYY-MM-DD in local timezone
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date'
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDateType = (dateStr: string) => {
    if (!dateStr) return { type: 'today', icon: '📅', label: 'Select Date', color: 'text-gray-600' }

    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date.toDateString() === today.toDateString()) {
      return { type: 'today', icon: '📍', label: 'Today', color: 'text-blue-600' }
    } else if (date < today) {
      return { type: 'historical', icon: '📅', label: 'Historical', color: 'text-amber-600' }
    } else {
      return { type: 'future', icon: '🔮', label: 'Forecast', color: 'text-purple-600' }
    }
  }

  const isValidDate = (date: Date) => {
    const today = new Date()
    const twoYearsAgo = new Date(today)
    const twoYearsFromNow = new Date(today)

    twoYearsAgo.setFullYear(today.getFullYear() - 2)
    twoYearsFromNow.setFullYear(today.getFullYear() + 2)

    return date >= twoYearsAgo && date <= twoYearsFromNow
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)

    startDate.setDate(startDate.getDate() - startDate.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const handleDateSelect = (date: Date) => {
    if (isValidDate(date)) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      onDateChange(dateStr)
      setIsCalendarOpen(false)
    }
  }

  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const days = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  const dateType = getDateType(selectedDate)

  return (
    <div className="relative z-10" ref={calendarRef}>
      <button
        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <span className="text-lg">{dateType.icon}</span>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDisplayDate(selectedDate)}
          </div>
          <div className={`text-xs ${dateType.color} dark:opacity-90`}>
            {dateType.label}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isCalendarOpen && (
        <div className="absolute top-0 left-full ml-8 z-[60] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 min-w-[320px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {monthYear}
            </h3>

            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              const isSelected = formatDateToLocal(date) === selectedDate
              const isToday = date.toDateString() === new Date().toDateString()
              const isValid = isValidDate(date)

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  disabled={!isValid}
                  className={`
                    p-2 text-sm rounded-xl transition-all duration-150
                    ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}
                    ${isSelected ? 'bg-blue-500 text-white shadow-md' : ''}
                    ${isToday && !isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium' : ''}
                    ${isValid && !isSelected ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    ${!isValid ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between">
              <button
                onClick={() => handleDateSelect(new Date())}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Today
              </button>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                2-year range available
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}