// Installments Management
let currentInstallmentId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Payment form
  const paymentForm = document.getElementById('form-payment');
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePayment();
    });
  }

  // Installment note form
  const noteForm = document.getElementById('form-installment-note');
  if (noteForm) {
    noteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveInstallmentNote();
    });
  }

  // Filters
  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      refreshInstallments();
    });
  }

  const searchInput = document.getElementById('search-installments');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      refreshInstallments();
    });
  }

  // Payments search
  const paymentsSearch = document.getElementById('search-payments');
  if (paymentsSearch) {
    paymentsSearch.addEventListener('input', () => {
      refreshPayments();
    });
  }
});

// Open payment modal
function openPaymentModal(installmentId) {
  currentInstallmentId = installmentId;
  loadInstallmentForPayment(installmentId);
  document.getElementById('modal-payment').classList.add('active');
}

// Load installment data for payment
async function loadInstallmentForPayment(installmentId) {
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .eq('id', installmentId)
    .single();
  
  if (error) {
    showToast('خطا در بارگذاری داده', 'error');
    return;
  }
  
  document.getElementById('payment-learner-name').value = data.learner_name || '';
  document.getElementById('payment-amount').value = formatNumber(data.amount || 0);
  document.getElementById('payment-due-date').value = formatDatePersian(data.due_date);
  // Set today's date as default if payment_date is empty
  if (data.payment_date) {
    document.getElementById('payment-date').value = data.payment_date;
  } else {
    const today = new Date();
    document.getElementById('payment-date').value = formatDatePersian(today.toISOString());
  }
  document.getElementById('payment-note').value = data.payment_note || '';
}

// Save payment
async function savePayment() {
  const paymentDate = document.getElementById('payment-date').value.trim();
  const paymentNote = document.getElementById('payment-note').value.trim();

  const updateData = {
    payment_note: paymentNote || null
  };

  if (paymentDate) {
    const parsedDate = parseDate(paymentDate);
    if (!parsedDate) {
      showToast('فرمت تاریخ صحیح نیست', 'error');
      return;
    }
    updateData.payment_date = paymentDate;
    updateData.status = 'پرداخت شده';
  } else {
    updateData.payment_date = null;
    updateData.status = 'در انتظار';
  }

  try {
    const { error } = await supabase
      .from('installments')
      .update(updateData)
      .eq('id', currentInstallmentId);
    
    if (error) throw error;
    
    showToast('پرداخت ذخیره شد', 'success');
    document.getElementById('modal-payment').classList.remove('active');
    refreshInstallments();
    refreshPayments();
    if (window.refreshLearners) refreshLearners();
  } catch (error) {
    showToast(error.message || 'خطا در ذخیره', 'error');
  }
}

// Open installment note modal
function openInstallmentNoteModal(installmentId) {
  currentInstallmentId = installmentId;
  loadInstallmentForNote(installmentId);
  document.getElementById('modal-installment-note').classList.add('active');
}

// Load installment for note
async function loadInstallmentForNote(installmentId) {
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .eq('id', installmentId)
    .single();
  
  if (error) {
    showToast('خطا در بارگذاری داده', 'error');
    return;
  }
  
  document.getElementById('note-learner-name').value = data.learner_name || '';
  document.getElementById('note-text').value = data.installment_note || '';
}

// Save installment note
async function saveInstallmentNote() {
  const note = document.getElementById('note-text').value.trim();

  try {
    const { error } = await supabase
      .from('installments')
      .update({ installment_note: note || null })
      .eq('id', currentInstallmentId);
    
    if (error) throw error;
    
    showToast('توضیحات ذخیره شد', 'success');
    document.getElementById('modal-installment-note').classList.remove('active');
    refreshInstallments();
  } catch (error) {
    showToast(error.message || 'خطا در ذخیره', 'error');
  }
}

// Delete payment (restore to pending)
async function deletePayment(installmentId) {
  if (!confirm('آیا مطمئن هستید که می‌خواهید این پرداخت را حذف کنید؟')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('installments')
      .update({
        status: 'در انتظار',
        payment_date: null,
        payment_note: null
      })
      .eq('id', installmentId);
    
    if (error) throw error;
    
    showToast('پرداخت حذف شد', 'success');
    refreshInstallments();
    refreshPayments();
    if (window.refreshLearners) refreshLearners();
  } catch (error) {
    showToast(error.message || 'خطا در حذف', 'error');
  }
}

// Refresh installments table
async function refreshInstallments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const filterStatus = document.getElementById('filter-status')?.value || 'all';
  const searchTerm = document.getElementById('search-installments')?.value.toLowerCase() || '';
  
  let query = supabase
    .from('installments')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'پرداخت شده')
    .order('due_date', { ascending: true });
  
  const { data: installments, error } = await query;
  
  if (error) {
    console.error('Error loading installments:', error);
    return;
  }

  const tbody = document.getElementById('installments-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!installments || installments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>هیچ قسطی وجود ندارد.</p></td></tr>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter and process installments
  const filtered = installments.filter(inst => {
    const dueDate = new Date(inst.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const days = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    
    // Only show overdue installments or installments due within next 30 days
    if (days > 30) {
      return false;
    }
    
    // Search filter
    if (searchTerm && !inst.learner_name?.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Status filter
    if (filterStatus === 'all') return true;
    
    if (filterStatus === 'pending' && days >= 0) return true;
    if (filterStatus === 'overdue' && days < 0) return true;
    if (filterStatus === 'with-note' && inst.installment_note) return true;
    
    return false;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>نتیجه‌ای یافت نشد.</p></td></tr>';
    return;
  }

  filtered.forEach(inst => {
    const dueDate = new Date(inst.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const days = daysUntilDue(inst.due_date);
    
    let statusText = 'در انتظار';
    let statusClass = 'status-pending';
    let rowClass = 'row-pending';
    
    if (days < 0) {
      statusText = 'عقب مانده';
      statusClass = 'status-overdue';
      rowClass = 'row-overdue';
    }
    
    if (inst.installment_note) {
      rowClass = 'row-with-note';
    }

    const row = document.createElement('tr');
    row.className = rowClass;
    row.innerHTML = `
      <td>${escapeHtml(inst.learner_name || '')}</td>
      <td>${inst.phone || ''}</td>
      <td>${formatNumber(inst.amount || 0)}</td>
      <td>${formatDatePersian(inst.due_date)}</td>
      <td>${formatDays(days)}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
      <td class="note-cell" ${inst.installment_note && inst.installment_note.length > 50 ? `data-full-note="${escapeHtml(inst.installment_note).replace(/"/g, '&quot;')}" style="cursor: pointer; color: var(--accent-2); text-decoration: underline;"` : ''}>${escapeHtml((inst.installment_note || '').substring(0, 50))}${inst.installment_note && inst.installment_note.length > 50 ? '...' : ''}</td>
      <td>
        <button class="btn-primary" onclick="openPaymentModal('${inst.id}')" style="margin-left: 4px; font-size: 0.85rem; padding: 6px 10px;">پرداخت</button>
        <button class="btn-ghost" onclick="openInstallmentNoteModal('${inst.id}')" style="margin-left: 4px; font-size: 0.85rem; padding: 6px 10px;">${inst.installment_note ? 'ویرایش توضیحات' : 'ثبت توضیحات'}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Add click listeners to note cells
  document.querySelectorAll('.note-cell[data-full-note]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const fullNote = cell.getAttribute('data-full-note');
      if (fullNote) {
        showNoteTooltip(e, fullNote);
      }
    });
  });
}

// Refresh payments table
async function refreshPayments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const searchTerm = document.getElementById('search-payments')?.value.toLowerCase() || '';
  
  const { data: payments, error } = await supabase
    .from('installments')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'پرداخت شده')
    .order('payment_date', { ascending: false });
  
  if (error) {
    console.error('Error loading payments:', error);
    return;
  }

  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filtered = (payments || []).filter(p => {
    if (searchTerm && !p.learner_name?.toLowerCase().includes(searchTerm)) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>هیچ پرداختی ثبت نشده است.</p></td></tr>';
    return;
  }

  filtered.forEach(payment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(payment.learner_name || '')}</td>
      <td>${payment.phone || ''}</td>
      <td>${formatNumber(payment.amount || 0)}</td>
      <td>${formatDatePersian(payment.due_date)}</td>
      <td>${payment.payment_date ? formatDatePersian(payment.payment_date) : ''}</td>
      <td>${escapeHtml(payment.payment_note || '')}</td>
      <td>
        <button class="btn-danger" onclick="deletePayment('${payment.id}')" style="font-size: 0.85rem; padding: 6px 10px;">حذف</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Show note tooltip
function showNoteTooltip(event, noteText) {
  console.log('showNoteTooltip called with:', noteText);
  event.stopPropagation();
  event.preventDefault();
  
  // Remove existing tooltip if any
  const existingTooltip = document.getElementById('note-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
    return;
  }
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'note-tooltip';
  tooltip.className = 'note-tooltip';
  tooltip.innerHTML = `
    <div class="note-tooltip-content">
      <div class="note-tooltip-header">
        <span>توضیحات کامل</span>
        <button class="note-tooltip-close" onclick="document.getElementById('note-tooltip').remove()">&times;</button>
      </div>
      <div class="note-tooltip-body">${escapeHtml(noteText)}</div>
    </div>
  `;
  
  document.body.appendChild(tooltip);
  
  // Position tooltip near the clicked element
  const rect = event.target.getBoundingClientRect();
  tooltip.style.top = `${rect.top + window.scrollY - 10}px`;
  tooltip.style.right = `${window.innerWidth - rect.right}px`;
  
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeTooltip(e) {
      if (!tooltip.contains(e.target) && e.target !== event.target) {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
      }
    });
  }, 100);
}

// Make functions globally available
window.openPaymentModal = openPaymentModal;
window.openInstallmentNoteModal = openInstallmentNoteModal;
window.deletePayment = deletePayment;
window.showNoteTooltip = showNoteTooltip;
window.refreshInstallments = refreshInstallments;
window.refreshPayments = refreshPayments;

