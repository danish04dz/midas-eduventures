/**
 * Utility to calculate real-time week info (Monday to Saturday), current date, and month dynamically.
 */
function getRealTimeWeekInfo(dateInput = new Date()) {
  const today = new Date(dateInput);
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayDayCode = dayNames[dayOfWeek];

  // Monday as 1st day of the week
  const monday = new Date(today);
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  monday.setDate(today.getDate() + diffToMonday);

  // Saturday as 6th day
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthsFullProper = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const formatDateShort = (d) => `${String(d.getDate()).padStart(2, '0')} ${monthsShort[d.getMonth()]}`;
  const formatDateFull = (d) => `${String(d.getDate()).padStart(2, '0')} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
  const formatDateISO = (d) => d.toISOString().split('T')[0];

  const currentDateLong = `${daysFull[dayOfWeek]}, ${String(today.getDate()).padStart(2, '0')} ${monthsFullProper[today.getMonth()]} ${today.getFullYear()}`;
  const monthYearStr = `${monthsFullProper[today.getMonth()]} ${today.getFullYear()}`;

  const weekTitle = `Current Week Schedule (${monthYearStr})`;
  const monthName = `${monthsFull[today.getMonth()]} ${today.getFullYear()}`;

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const academicYear = currentMonth >= 4 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekNumber = Math.ceil((today.getDate() + firstDayOfMonth.getDay()) / 7);

  const dayDates = {};
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach((code, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    dayDates[code] = {
      dateStr: formatDateShort(dayDate),
      fullDateStr: formatDateFull(dayDate),
      isToday: code === todayDayCode
    };
  });

  return {
    todayDayCode,
    weekTitle,
    monthName,
    monthYearStr,
    currentDateLong,
    academicYear,
    weekNumber,
    startDate: formatDateISO(monday),
    endDate: formatDateISO(saturday),
    dayDates,
    currentDateFormatted: formatDateFull(today)
  };
}

module.exports = { getRealTimeWeekInfo };
