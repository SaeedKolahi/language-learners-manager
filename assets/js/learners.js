// Learners Management
let currentLearnerId = null;

// Toggle installment fields
document.addEventListener('DOMContentLoaded', () => {
  const hasInstallmentCheck = document.getElementById('learner-has-installment');
  const installmentFields = document.getElementById('installment-fields');
  
  if (hasInstallmentCheck && installmentFields) {
    hasInstallmentCheck.addEventListener('change', () => {
      installmentFields.style.display = hasInstallmentCheck.checked ? 'block' : 'none';
      if (hasInstallmentCheck.checked && !document.getElementById('learner-start-date').value) {
        const today = new Date();
        document.getElementById('learner-start-date').value = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
      }
    });
  }

  // Add learner button
  const addBtn = document.getElementById('btn-add-learner');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openLearnerModal();
    });
  }

  // Learner form submit
  const form = document.getElementById('form-learner');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveLearner();
    });
  }

  // Search learners
  const searchInput = document.getElementById('search-learners');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      refreshLearners();
    });
  }
});

// Open learner modal
function openLearnerModal(learnerId = null) {
  currentLearnerId = learnerId;
  const modal = document.getElementById('modal-learner');
  const title = document.getElementById('modal-learner-title');
  const form = document.getElementById('form-learner');
  
  if (learnerId) {
    title.textContent = 'ویرایش زبان‌آموز';
    loadLearnerData(learnerId);
  } else {
    title.textContent = 'افزودن زبان‌آموز';
    form.reset();
    document.getElementById('learner-has-installment').checked = false;
    document.getElementById('installment-fields').style.display = 'none';
  }
  
  modal.classList.add('active');
}

// Load learner data for editing
async function loadLearnerData(learnerId) {
  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .eq('id', learnerId)
    .single();
  
  if (error) {
    showToast('خطا در بارگذاری داده', 'error');
    return;
  }
  
  document.getElementById('learner-name').value = data.name || '';
  document.getElementById('learner-phone').value = data.phone || '';
  document.getElementById('learner-age').value = data.age || '';
  document.getElementById('learner-level').value = data.level || '';
  document.getElementById('learner-goal').value = data.goal || '';
  document.getElementById('learner-occupation').value = data.occupation || '';
  document.getElementById('learner-notes').value = data.notes || '';
  
  const hasInstallment = data.has_installment || false;
  document.getElementById('learner-has-installment').checked = hasInstallment;
  document.getElementById('installment-fields').style.display = hasInstallment ? 'block' : 'none';
  
  if (hasInstallment) {
    if (data.start_date) {
      document.getElementById('learner-start-date').value = formatDatePersian(data.start_date);
    }
    document.getElementById('learner-total-amount').value = formatNumber(data.total_amount || 0);
    document.getElementById('learner-installment-count').value = data.installment_count || 0;
  }
}

// Save learner
async function saveLearner() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const name = document.getElementById('learner-name').value.trim();
  if (!name) {
    showToast('لطفاً نام را وارد کنید', 'error');
    return;
  }

  const phone = document.getElementById('learner-phone').value.trim().replace(/[^0-9]/g, '');
  if (phone && phone.length !== 11) {
    showToast('شماره تماس باید 11 رقمی باشد', 'error');
    return;
  }

  const hasInstallment = document.getElementById('learner-has-installment').checked;
  let startDate = null;
  let totalAmount = 0;
  let installmentCount = 0;
  let installmentAmount = 0;

  if (hasInstallment) {
    const startDateStr = document.getElementById('learner-start-date').value.trim();
    if (!startDateStr) {
      showToast('لطفاً تاریخ شروع را وارد کنید', 'error');
      return;
    }
    startDate = parseDate(startDateStr);
    if (!startDate) {
      showToast('فرمت تاریخ صحیح نیست', 'error');
      return;
    }

    const totalAmountStr = document.getElementById('learner-total-amount').value.replace(/,/g, '');
    totalAmount = parseInt(totalAmountStr) || 0;
    if (totalAmount <= 0) {
      showToast('مبلغ کل باید بیشتر از صفر باشد', 'error');
      return;
    }

    installmentCount = parseInt(document.getElementById('learner-installment-count').value) || 0;
    if (installmentCount <= 0) {
      showToast('تعداد اقساط باید بیشتر از صفر باشد', 'error');
      return;
    }

    installmentAmount = Math.floor(totalAmount / installmentCount);
  }

  const learnerData = {
    user_id: user.id,
    name,
    phone: phone || null,
    age: document.getElementById('learner-age').value.trim() || null,
    level: document.getElementById('learner-level').value.trim() || null,
    goal: document.getElementById('learner-goal').value.trim() || null,
    occupation: document.getElementById('learner-occupation').value.trim() || null,
    notes: document.getElementById('learner-notes').value.trim() || null,
    has_installment: hasInstallment,
    start_date: startDate,
    total_amount: hasInstallment ? totalAmount : null,
    installment_count: hasInstallment ? installmentCount : null,
    installment_amount: hasInstallment ? installmentAmount : null
  };

  try {
    if (currentLearnerId) {
      // Update
      const { error } = await supabase
        .from('learners')
        .update(learnerData)
        .eq('id', currentLearnerId);
      
      if (error) throw error;
      showToast('زبان‌آموز ویرایش شد', 'success');
    } else {
      // Insert
      const { data, error } = await supabase
        .from('learners')
        .insert(learnerData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Generate installments
      if (hasInstallment && installmentCount > 0) {
        await generateInstallments(data.id, data.name, phone, installmentCount, installmentAmount, startDate);
      }
      
      showToast('زبان‌آموز اضافه شد', 'success');
    }
    
    document.getElementById('modal-learner').classList.remove('active');
    refreshLearners();
    if (window.refreshInstallments) refreshInstallments();
  } catch (error) {
    showToast(error.message || 'خطا در ذخیره', 'error');
  }
}

// Generate installments
async function generateInstallments(learnerId, learnerName, phone, count, amount, startDate) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const installments = [];
  for (let i = 1; i <= count; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (30 * (i - 1)));
    
    installments.push({
      user_id: user.id,
      learner_id: learnerId,
      learner_name: learnerName,
      phone: phone || null,
      amount,
      due_date: dueDate.toISOString(),
      status: 'در انتظار',
      payment_date: null,
      payment_note: null,
      installment_note: null,
      installment_number: i,
      total_installments: count
    });
  }

  const { error } = await supabase
    .from('installments')
    .insert(installments);
  
  if (error) {
    console.error('Error generating installments:', error);
  }
}

// Refresh learners table
async function refreshLearners() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const searchTerm = document.getElementById('search-learners')?.value.toLowerCase() || '';
  
  const { data: learners, error } = await supabase
    .from('learners')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading learners:', error);
    return;
  }

  const tbody = document.getElementById('learners-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!learners || learners.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><p>هیچ زبان‌آموزی ثبت نشده است.</p></td></tr>';
    return;
  }

  // Get installments for statistics
  const { data: installments } = await supabase
    .from('installments')
    .select('*')
    .eq('user_id', user.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  learners.forEach(learner => {
    if (searchTerm && !learner.name.toLowerCase().includes(searchTerm)) {
      return;
    }

    const learnerInstallments = (installments || []).filter(inst => inst.learner_id === learner.id);
    
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    if (learner.has_installment) {
      learnerInstallments.forEach(inst => {
        if (inst.status === 'پرداخت شده') {
          paidCount++;
        } else {
          const dueDate = new Date(inst.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            overdueCount++;
          } else {
            pendingCount++;
          }
        }
      });
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(learner.name)}</td>
      <td>${learner.phone || ''}</td>
      <td>${learner.start_date ? formatDatePersian(learner.start_date) : ''}</td>
      <td>${learner.total_amount ? formatNumber(learner.total_amount) : ''}</td>
      <td>${learner.installment_count || ''}</td>
      <td>${learner.installment_amount ? formatNumber(learner.installment_amount) : ''}</td>
      <td>${learner.has_installment ? paidCount : ''}</td>
      <td>${learner.has_installment ? pendingCount : ''}</td>
      <td>${learner.has_installment ? overdueCount : ''}</td>
      <td>
        <button class="btn-ghost" onclick="openLearnerModal('${learner.id}')" style="margin-left: 4px;">ویرایش</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Make functions globally available
window.openLearnerModal = openLearnerModal;
window.refreshLearners = refreshLearners;

