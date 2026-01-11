// Get day type (weekday or weekend)
export const getDayType = (date = new Date()) => {
  const day = date.getDay();
  return (day === 0 || day === 6) ? 'weekend' : 'weekday';
};

// Format date for display (Spanish locale)
export const formatDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Format time for display
export const formatTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Format date and time together
export const formatDateTime = (date) => {
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
};

// Get start and end of current day
export const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

// Get start and end of current week
export const getWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

// Get start and end of current month
export const getMonthRange = () => {
  const now = new Date();
  
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
};

// Day names in Spanish
export const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const shortDayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
