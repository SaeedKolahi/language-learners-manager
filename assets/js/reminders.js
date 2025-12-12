// Reminders list and actions

async function refreshReminders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const filter = document.getElementById('filter-reminders')?.value || 'all';
  const tbody = document.getElementById('reminders-tbody');
  if (!tbody) return;

  let query = supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('reminder_at', { ascending: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (filter === 'today') {
    query = query
      .eq('completed', false)
      .gte('reminder_at', today.toISOString())
      .lt('reminder_at', tomorrow.toISOString());
  } else if (filter === 'completed') {
    query = query.eq('completed', true);
  } else {
    query = query.eq('completed', false); // exclude completed in "همه"
  }

  const { data: reminders, error } = await query;
  if (error) {
    console.error('Error loading reminders:', error);
    return;
  }

  // Fetch learners to get latest names/phones
  const { data: learners } = await supabase
    .from('learners')
    .select('id, phone, name')
    .eq('user_id', user.id);
  const phoneMap = {};
  const nameMap = {};
  (learners || []).forEach(l => {
    phoneMap[l.id] = l.phone || '';
    nameMap[l.id] = l.name || '';
  });

  tbody.innerHTML = '';

  if (!reminders || reminders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>هیچ یادآوری ثبت نشده است.</p></td></tr>';
    return;
  }

  reminders.forEach(rem => {
    const dt = new Date(rem.reminder_at);
    const dateStr = formatDatePersian(rem.reminder_at);
    const timeStr = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    let statusText = 'در انتظار';
    let statusClass = 'status-pending';
    const now = new Date();
    if (rem.completed) {
      statusText = 'تکمیل شده';
      statusClass = 'status-sold';
    } else if (rem.sent) {
      statusText = 'ارسال شده';
      statusClass = 'status-about-to-buy';
    } else if (dt < now) {
      statusText = 'پیگیری نشده';
      statusClass = 'status-overdue';
    }

    const displayName = nameMap[rem.learner_id] || rem.learner_name || '';
    const phone = phoneMap[rem.learner_id] || '';
    const fullDesc = rem.description || '';
    const escapedFullDesc = escapeHtml(fullDesc);
    const shortDesc = escapeHtml(fullDesc.substring(0, 50));
    const hasMore = fullDesc.length > 50;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(displayName)}</td>
      <td>${phone ? formatPhoneLink(phone) : ''}</td>
      <td>${dateStr} ${timeStr}</td>
      <td class="note-cell" ${hasMore ? `data-full-note="${escapedFullDesc.replace(/"/g, '&quot;')}" style="cursor: pointer; color: var(--accent-2); text-decoration: underline;"` : ''}>${hasMore ? `${shortDesc}...` : shortDesc}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
      <td>
        <button class="btn-ghost" onclick="openReminderModal('${rem.learner_id}', '${escapeHtml(displayName)}', ${serializeReminder({ ...rem, learner_name: displayName })})" style="margin-left: 4px;">پیگیری مجدد</button>
        ${rem.completed ? '' : `<button class="btn-primary" onclick="markReminderCompleted('${rem.id}')" style="margin-left: 4px;">تکمیل شد</button>`}
      </td>
    `;
    tbody.appendChild(row);
  });

  // Add click listeners to description cells
  document.querySelectorAll('#reminders-table .note-cell[data-full-note]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const fullNote = cell.getAttribute('data-full-note');
      if (fullNote) {
        showNoteTooltip(e, fullNote);
      }
    });
  });
}

// Serialize reminder object for inline handler
function serializeReminder(rem) {
  const safeDesc = rem.description ? rem.description.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
  return `{
    id: '${rem.id}',
    learner_id: '${rem.learner_id}',
    learner_name: '${rem.learner_name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}',
    reminder_at: '${rem.reminder_at}',
    description: '${safeDesc}'
  }`;
}

// Mark reminder as completed
async function markReminderCompleted(reminderId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('reminders')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', reminderId)
    .eq('user_id', user.id);

  if (error) {
    showToast('خطا در به‌روزرسانی یادآور', 'error');
  } else {
    showToast('یادآور تکمیل شد', 'success');
    refreshReminders();
  }
}

// Bind filter change
document.addEventListener('DOMContentLoaded', () => {
  const filter = document.getElementById('filter-reminders');
  if (filter) {
    filter.addEventListener('change', () => {
      refreshReminders();
    });
  }
});

// Expose
window.refreshReminders = refreshReminders;
window.markReminderCompleted = markReminderCompleted;

