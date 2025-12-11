// Utility Functions

// Convert Gregorian to Jalali (Persian) date
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  let gy2 = (gy <= 1600) ? gy : gy - 1600;
  let days = (365 * gy2) + (parseInt((gy2 + 3) / 4)) - (parseInt((gy2 + 99) / 100)) + (parseInt((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days = days % 12053;
  jy += 4 * parseInt(days / 1461);
  days = days % 1461;
  if (days > 365) {
    jy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

// Convert Jalali (Persian) to Gregorian date
function jalaliToGregorian(jy, jm, jd) {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (parseInt(jy / 33) * 8) + (parseInt(((jy % 33) + 3) / 4)) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * parseInt(days / 146097);
  days = days % 146097;
  if (days > 36524) {
    gy += 100 * parseInt(--days / 36524);
    days = days % 36524;
    if (days >= 365) days++;
  }
  gy += 4 * parseInt(days / 1461);
  days = days % 1461;
  if (days > 365) {
    gy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > sal_a[gm]) {
    gd -= sal_a[gm];
    gm++;
  }
  return new Date(gy, gm - 1, gd);
}

// Convert English digits to Persian
function toPersianDigits(str) {
  if (!str && str !== 0) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
}

// Convert Persian digits to English
function toEnglishDigits(str) {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = String(str);
  persianDigits.forEach((persian, index) => {
    result = result.replace(new RegExp(persian, 'g'), index);
  });
  return result;
}

// Format Persian date (Jalali)
function formatDatePersian(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const gy = date.getFullYear();
    const gm = date.getMonth() + 1;
    const gd = date.getDate();
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
    
    const year = String(jy);
    const month = String(jm).padStart(2, '0');
    const day = String(jd).padStart(2, '0');
    const jalali = `${year}/${month}/${day}`;
    return toPersianDigits(jalali);
  } catch {
    return dateStr;
  }
}

// Parse Persian date to ISO
function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = toEnglishDigits(dateStr.trim());
  
  // Try Jalali date format (YYYY/MM/DD)
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      // Check if it's a Jalali date (year > 1300) or Gregorian
      if (year > 1300 && year < 1500) {
        // Jalali date
        try {
          const gregorian = jalaliToGregorian(year, month, day);
          return gregorian.toISOString();
        } catch {
          // Fall through to Gregorian
        }
      }
      
      // Try as Gregorian date
      try {
        const gregorian = new Date(year, month - 1, day);
        if (!isNaN(gregorian.getTime())) {
          return gregorian.toISOString();
        }
      } catch {
        // Fall through
      }
    }
  }
  
  // Try ISO format
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Fall through
  }
  
  return null;
}

// Format number with thousand separators and Persian digits
function formatNumber(num) {
  if (!num && num !== 0) return '';
  const formatted = parseInt(num).toLocaleString('fa-IR');
  return toPersianDigits(formatted);
}

// Calculate days until due date (returns number)
function daysUntilDue(dueDateStr) {
  if (!dueDateStr) return 0;
  try {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return 0;
  }
}

// Format days as Persian digits
function formatDays(days) {
  if (days === null || days === undefined) return '';
  return toPersianDigits(days);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

