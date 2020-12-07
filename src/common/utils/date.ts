const monthsAbbreviation= [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
const monthsComplete= [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export function getCurrentDate(abbreviateMonth: boolean = false) {
  const today = new Date()
  
  const currentYear = today.getFullYear()
  const currentMonth = 
    abbreviateMonth
    ? monthsAbbreviation[today.getMonth()]
    : monthsComplete[today.getMonth()]

  const currentDay = today.getDate();

  const currentHours = today.getHours()
  const currentMinutes = today.getMinutes()
  const currentSeconds = today.getSeconds()

  const currentDate = `${currentYear}-${currentMonth}-${currentDay}`

  return currentDate
}

export function getCurrentTime(abbreviateMonth: boolean = false) {
  const today = new Date()
  
  const currentYear = today.getFullYear()
  const currentMonth = 
    abbreviateMonth
    ? monthsAbbreviation[today.getMonth()]
    : monthsComplete[today.getMonth()]

  const currentDay = today.getDate();

  const currentHours = today.getHours()
  const currentMinutes = today.getMinutes()
  const currentSeconds = today.getSeconds()

  const currentTime =  `${currentHours}:${currentMinutes}:${currentSeconds}`

  return currentTime
}
