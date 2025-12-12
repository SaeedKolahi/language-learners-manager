// Learners Management
let currentLearnerId = null;
let currentReminderLearnerId = null;
let currentReminderLearnerName = '';
let currentReminderId = null;
let currentEditInstallmentsLearnerId = null;
let currentEditInstallments = [];
let openActionsMenuId = null;
let currentEditTotalAmount = 0;
let currentEditPaidSum = 0;
let manualEditedInstallments = new Set();

// Toggle installment fields
document.addEventListener('DOMContentLoaded', () => {
  const hasInstallmentCheck = document.getElementById('learner-has-installment');
  const installmentFields = document.getElementById('installment-fields');
  
  if (hasInstallmentCheck && installmentFields) {
    hasInstallmentCheck.addEventListener('change', () => {
      installmentFields.style.display = hasInstallmentCheck.checked ? 'block' : 'none';
      if (hasInstallmentCheck.checked && !document.getElementById('learner-start-date').value) {
        const today = new Date();
        document.getElementById('learner-start-date').value = formatDatePersian(today.toISOString());
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

  // Filter learners by status
  const filterStatus = document.getElementById('filter-learner-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      refreshLearners();
    });
  }

  // Format total amount input with thousand separators
  const totalAmountInput = document.getElementById('learner-total-amount');
  if (totalAmountInput) {
    totalAmountInput.addEventListener('input', (e) => {
      let value = e.target.value;
      // Remove all non-digit characters except Persian digits
      value = toEnglishDigits(value).replace(/\D/g, '');
      if (value) {
        // Format with thousand separators and convert to Persian
        const formatted = parseInt(value).toLocaleString('fa-IR');
        e.target.value = toPersianDigits(formatted);
      } else {
        e.target.value = '';
      }
    });
  }

  // Reminder form submit
  const reminderForm = document.getElementById('form-reminder');
  if (reminderForm) {
    reminderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveReminder();
    });
  }

  const saveEditInstallmentsBtn = document.getElementById('btn-save-installments');
  if (saveEditInstallmentsBtn) {
    saveEditInstallmentsBtn.addEventListener('click', async () => {
      await saveEditableInstallments();
    });
  }
});

// Open learner modal
function openLearnerModal(learnerId = null) {
  currentLearnerId = learnerId;
  const modal = document.getElementById('modal-learner');
  const title = document.getElementById('modal-learner-title');
  const form = document.getElementById('form-learner');
  const totalAmountInput = document.getElementById('learner-total-amount');
  
  // Reset total amount field state
  if (totalAmountInput) {
    totalAmountInput.readOnly = false;
    totalAmountInput.style.opacity = '1';
    totalAmountInput.style.cursor = 'text';
    totalAmountInput.title = '';
  }
  
  if (learnerId) {
    title.textContent = 'ویرایش زبان‌آموز';
    loadLearnerData(learnerId);
  } else {
    title.textContent = 'افزودن زبان‌آموز';
    form.reset();
    document.getElementById('learner-has-installment').checked = false;
    document.getElementById('installment-fields').style.display = 'none';
    document.getElementById('learner-status').value = '';
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
  document.getElementById('learner-status').value = data.status || '';
  
  const hasInstallment = data.has_installment || false;
  document.getElementById('learner-has-installment').checked = hasInstallment;
  document.getElementById('installment-fields').style.display = hasInstallment ? 'block' : 'none';
  
  if (hasInstallment) {
    if (data.start_date) {
      document.getElementById('learner-start-date').value = formatDatePersian(data.start_date);
    }
    document.getElementById('learner-total-amount').value = formatNumber(data.total_amount || 0);
    document.getElementById('learner-installment-count').value = data.installment_count || 0;
    
    // Check if there are paid installments and disable total amount field
    const { data: paidInstallments } = await supabase
      .from('installments')
      .select('id')
      .eq('learner_id', learnerId)
      .eq('status', 'پرداخت شده')
      .limit(1);
    
    if (paidInstallments && paidInstallments.length > 0) {
      const totalAmountInput = document.getElementById('learner-total-amount');
      totalAmountInput.readOnly = true;
      totalAmountInput.style.opacity = '0.6';
      totalAmountInput.style.cursor = 'not-allowed';
      totalAmountInput.title = 'نمی‌توانید مبلغ کل را تغییر دهید چون پرداختی ثبت شده است';
    } else {
      const totalAmountInput = document.getElementById('learner-total-amount');
      totalAmountInput.readOnly = false;
      totalAmountInput.style.opacity = '1';
      totalAmountInput.style.cursor = 'text';
      totalAmountInput.title = '';
    }
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

    const totalAmountStr = toEnglishDigits(document.getElementById('learner-total-amount').value).replace(/\D/g, '');
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
    status: document.getElementById('learner-status').value || null,
    has_installment: hasInstallment,
    start_date: startDate,
    total_amount: hasInstallment ? totalAmount : null,
    installment_count: hasInstallment ? installmentCount : null,
    installment_amount: hasInstallment ? installmentAmount : null
  };

  try {
    // Check for duplicate name
    let duplicateQuery = supabase
      .from('learners')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name);
    
    if (currentLearnerId) {
      duplicateQuery = duplicateQuery.neq('id', currentLearnerId);
    }
    
    const { data: duplicates, error: duplicateError } = await duplicateQuery;
    
    if (duplicateError) throw duplicateError;
    
    if (duplicates && duplicates.length > 0) {
      showToast('این نام قبلاً ثبت شده است', 'error');
      return;
    }

    if (currentLearnerId) {
      // Get old learner data for comparison (needed for validation and history)
      const { data: oldLearnerData } = await supabase
        .from('learners')
        .select('total_amount, start_date, installment_count, installment_amount, has_installment')
        .eq('id', currentLearnerId)
        .single();
      
      // Check if user is trying to remove installment when there are payments
      if (oldLearnerData && oldLearnerData.has_installment && !hasInstallment) {
        // Check if there are any paid installments
        const { data: paidInstallments } = await supabase
          .from('installments')
          .select('id')
          .eq('learner_id', currentLearnerId)
          .eq('status', 'پرداخت شده')
          .limit(1);
        
        if (paidInstallments && paidInstallments.length > 0) {
          alert('نمیتوانید تقسیط دوره را حذف کنید چون پرداختی ثبت شده است.');
          return;
        }
      }
      
      // Check if learner has paid installments
      if (hasInstallment && installmentCount > 0) {
        const { data: existingInstallments } = await supabase
          .from('installments')
          .select('*')
          .eq('learner_id', currentLearnerId)
          .order('installment_number', { ascending: true });
        
        if (existingInstallments && existingInstallments.length > 0) {
          // Check if there are any paid installments
          const paidInstallments = existingInstallments.filter(inst => inst.status === 'پرداخت شده');
          
          if (paidInstallments.length > 0) {
            // Check if total amount is being changed
            if (oldLearnerData && oldLearnerData.total_amount !== totalAmount) {
              showToast('نمی‌توانید مبلغ کل را تغییر دهید چون پرداختی ثبت شده است', 'error');
              return;
            }
            
            // Calculate total paid amount
            const totalPaidAmount = paidInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
            
            // Check if new total amount is less than paid amount
            if (totalAmount < totalPaidAmount) {
              showToast(`نمی‌توانید مبلغ کل را کمتر از مبلغ پرداخت شده (${formatNumber(totalPaidAmount)} تومان) قرار دهید`, 'error');
              return;
            }
            
            // Check if installment count or amount changed
            const oldTotalAmount = oldLearnerData ? (oldLearnerData.installment_count * oldLearnerData.installment_amount) : 0;
            const newTotalAmount = installmentCount * installmentAmount;
            
            // If total amount changed (through count or installment amount), check if it's less than paid
            if (oldTotalAmount !== newTotalAmount && newTotalAmount < totalPaidAmount) {
              showToast(`با تعداد اقساط جدید (${installmentCount}) و مبلغ هر قسط (${formatNumber(installmentAmount)} تومان)، مجموع اقساط (${formatNumber(newTotalAmount)} تومان) کمتر از مبلغ پرداخت شده (${formatNumber(totalPaidAmount)} تومان) می‌شود`, 'error');
              return;
            }
            
            // Validation: if count is less than number of paid installments, show error
            if (installmentCount < paidInstallments.length) {
              alert(`نمی‌توانید تعداد اقساط را به ${toPersianDigits(installmentCount)} تغییر دهید چون ${toPersianDigits(paidInstallments.length)} قسط پرداخت شده است. تعداد اقساط باید حداقل ${toPersianDigits(paidInstallments.length)} باشد.`);
              return;
            }
            
            // Validation: if count equals number of paid installments and total paid is less than total amount, show error
            if (installmentCount === paidInstallments.length && totalPaidAmount < totalAmount) {
              const remainingAmount = totalAmount - totalPaidAmount;
              alert(`نمی‌توانید تعداد اقساط را به ${toPersianDigits(installmentCount)} تغییر دهید چون ${toPersianDigits(paidInstallments.length)} قسط پرداخت شده است و مبلغ پرداخت شده (${formatNumber(totalPaidAmount)} تومان) کمتر از مبلغ کل (${formatNumber(totalAmount)} تومان) است. هنوز ${formatNumber(remainingAmount)} تومان بدهکار است.`);
              return;
            }
            
            // Validation: if all installments are paid, don't allow changing count
            if (paidInstallments.length >= (oldLearnerData?.installment_count || 0)) {
              if (installmentCount !== (oldLearnerData?.installment_count || 0)) {
                showToast('نمی‌توانید تعداد اقساط را تغییر دهید چون همه اقساط پرداخت شده است', 'error');
                return;
              }
            }
          }
          
          // Update existing installments
          await updateInstallments(currentLearnerId, name, phone, installmentCount, installmentAmount, startDate, existingInstallments, oldLearnerData);
        } else {
          // If no installments exist, generate them
          await generateInstallments(currentLearnerId, name, phone, installmentCount, installmentAmount, startDate);
        }
      }
      
      // Update learner data (excluding total_amount if there are paid installments)
      if (hasInstallment && installmentCount > 0) {
        const { data: existingInstallments } = await supabase
          .from('installments')
          .select('status')
          .eq('learner_id', currentLearnerId)
          .eq('status', 'پرداخت شده')
          .limit(1);
        
        // If there are paid installments, don't update total_amount, but allow installment_amount to update
        if (existingInstallments && existingInstallments.length > 0) {
          delete learnerData.total_amount;
          // Keep installment_amount so it can be updated when count changes
        }
      }
      
      // Update
      const { error } = await supabase
        .from('learners')
        .update(learnerData)
        .eq('id', currentLearnerId);
      
      if (error) throw error;

      // Sync reminder learner name
      await syncReminderLearnerName(currentLearnerId, name);
      
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

// Update existing installments
async function updateInstallments(learnerId, learnerName, phone, count, amount, startDate, existingInstallments, oldLearnerData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const startDateObj = new Date(startDate);
  
  // Separate paid and unpaid installments
  const paidInstallments = existingInstallments.filter(inst => inst.status === 'پرداخت شده');
  const unpaidInstallments = existingInstallments.filter(inst => inst.status !== 'پرداخت شده');
  
  // Calculate adjustment if there are paid installments
  let adjustmentHistory = null;
  let adjustmentAmount = 0;
  
  if (paidInstallments.length > 0 && oldLearnerData) {
    const oldCount = oldLearnerData.installment_count || 0;
    const oldAmount = oldLearnerData.installment_amount || 0;
    const oldTotal = oldCount * oldAmount;
    const newTotal = count * amount;
    
    // Calculate total paid amount (using original amounts from paid installments)
    const totalPaidAmount = paidInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    
    // Calculate what should be paid in new plan for remaining installments
    const paidCount = paidInstallments.length;
    const remainingCount = Math.max(0, count - paidCount); // Ensure non-negative
    
    // Total amount that should be collected: newTotal
    // Amount already paid: totalPaidAmount
    // Amount remaining to collect: newTotal - totalPaidAmount
    // In new plan, remaining installments would normally be: remainingCount * amount
    // But we need to collect: newTotal - totalPaidAmount
    // So adjustment needed: (newTotal - totalPaidAmount) - (remainingCount * amount)
    // Simplifying: newTotal - totalPaidAmount - remainingCount * amount
    // = count * amount - totalPaidAmount - (count - paidCount) * amount
    // = count * amount - totalPaidAmount - count * amount + paidCount * amount
    // = paidCount * amount - totalPaidAmount
    // So: adjustmentAmount = totalPaidAmount - paidCount * amount (negated)
    const newExpectedForPaid = paidCount * amount;
    adjustmentAmount = newExpectedForPaid - totalPaidAmount;
    
    // Create adjustment history entry
    const today = new Date();
    const todayPersian = formatDatePersian(today.toISOString());
    
    // Check if there was any change (count or amount)
    const countChanged = oldCount !== count;
    const amountChanged = oldAmount !== amount;
    
    // Always record history if there was a change
    if (countChanged || amountChanged) {
      if (remainingCount > 0) {
        if (adjustmentAmount > 0) {
          // User paid less than expected in new plan - add to remaining installments
          adjustmentHistory = `${todayPersian}: تعداد اقساط از ${toPersianDigits(oldCount)} به ${toPersianDigits(count)} تغییر کرد. مبلغ هر قسط از ${formatNumber(oldAmount)} به ${formatNumber(amount)} تغییر کرد. مبلغ پرداخت شده (${formatNumber(totalPaidAmount)}) کمتر از مبلغ مورد انتظار در طرح جدید برای ${toPersianDigits(paidCount)} قسط پرداخت شده (${formatNumber(newExpectedForPaid)}) است. مبلغ کمبود ${formatNumber(adjustmentAmount)} تومان به صورت مساوی به ${toPersianDigits(remainingCount)} قسط باقیمانده اضافه شد.`;
        } else if (adjustmentAmount < 0) {
          // User paid more than expected in new plan - subtract from remaining installments
          adjustmentHistory = `${todayPersian}: تعداد اقساط از ${toPersianDigits(oldCount)} به ${toPersianDigits(count)} تغییر کرد. مبلغ هر قسط از ${formatNumber(oldAmount)} به ${formatNumber(amount)} تغییر کرد. مبلغ پرداخت شده (${formatNumber(totalPaidAmount)}) بیشتر از مبلغ مورد انتظار در طرح جدید برای ${toPersianDigits(paidCount)} قسط پرداخت شده (${formatNumber(newExpectedForPaid)}) است. مبلغ اضافی ${formatNumber(Math.abs(adjustmentAmount))} تومان به صورت مساوی از ${toPersianDigits(remainingCount)} قسط باقیمانده کسر شد.`;
        } else {
          // No adjustment needed, but still record the change
          adjustmentHistory = `${todayPersian}: تعداد اقساط از ${toPersianDigits(oldCount)} به ${toPersianDigits(count)} تغییر کرد. مبلغ هر قسط از ${formatNumber(oldAmount)} به ${formatNumber(amount)} تغییر کرد. مبلغ پرداخت شده (${formatNumber(totalPaidAmount)}) با مبلغ مورد انتظار در طرح جدید برای ${toPersianDigits(paidCount)} قسط پرداخت شده (${formatNumber(newExpectedForPaid)}) برابر است.`;
        }
      } else {
        // remainingCount === 0 means count <= paidCount
        // Check if count is less than paidCount (shouldn't happen, but handle it)
        if (count < paidCount) {
          // Count was reduced below number of paid installments (should have been prevented by validation)
          adjustmentHistory = `${todayPersian}: تعداد اقساط از ${toPersianDigits(oldCount)} به ${toPersianDigits(count)} تغییر کرد. مبلغ هر قسط از ${formatNumber(oldAmount)} به ${formatNumber(amount)} تغییر کرد. توجه: ${toPersianDigits(paidCount)} قسط پرداخت شده است اما تعداد اقساط به ${toPersianDigits(count)} کاهش یافته است.`;
        } else if (count === paidCount && totalPaidAmount >= (count * amount)) {
          // All installments are paid and total amount is covered
          adjustmentHistory = `${todayPersian}: تعداد اقساط از ${toPersianDigits(oldCount)} به ${toPersianDigits(count)} تغییر کرد. مبلغ هر قسط از ${formatNumber(oldAmount)} به ${formatNumber(amount)} تغییر کرد. همه اقساط قبلاً پرداخت شده است.`;
        } else {
          // Count equals paidCount but total amount is not fully paid
          adjustmentHistory = `${todayPersian}: تعداد اقساط از ${toPersianDigits(oldCount)} به ${toPersianDigits(count)} تغییر کرد. مبلغ هر قسط از ${formatNumber(oldAmount)} به ${formatNumber(amount)} تغییر کرد. ${toPersianDigits(paidCount)} قسط پرداخت شده است.`;
        }
      }
    }
  }
  
  // Calculate adjusted amount per remaining installment
  const remainingCount = count - paidInstallments.length;
  const adjustmentPerInstallment = remainingCount > 0 ? Math.floor(adjustmentAmount / remainingCount) : 0;
  const remainder = remainingCount > 0 ? adjustmentAmount % remainingCount : 0;
  
  // Update unpaid installments with adjusted amounts
  let remainderApplied = 0;
  for (const inst of unpaidInstallments) {
    if (inst.installment_number > count) {
      // Delete if beyond new count
      await supabase.from('installments').delete().eq('id', inst.id);
      continue;
    }
    
    const updateData = {
      learner_name: learnerName,
      phone: phone || null,
      total_installments: count
    };
    
    // Calculate adjusted amount
    let adjustedAmount = amount;
    if (adjustmentAmount !== 0 && remainingCount > 0) {
      adjustedAmount = amount + adjustmentPerInstallment;
      // Apply remainder to first unpaid installment
      if (remainderApplied === 0 && remainder !== 0) {
        adjustedAmount += remainder;
        remainderApplied = 1;
      }
    }
    
    updateData.amount = adjustedAmount;
    
    // Recalculate due date based on new start date
    const installmentNumber = inst.installment_number || 1;
    const newDueDate = new Date(startDateObj);
    newDueDate.setDate(newDueDate.getDate() + (30 * (installmentNumber - 1)));
    updateData.due_date = newDueDate.toISOString();
    
    // Update installment
    const { error } = await supabase
      .from('installments')
      .update(updateData)
      .eq('id', inst.id);
    
    if (error) {
      console.error('Error updating installment:', error);
    }
  }
  
  // Update paid installments (only name, phone, total_installments, and due_date if start date changed)
  for (const inst of paidInstallments) {
    const updateData = {
      learner_name: learnerName,
      phone: phone || null,
      total_installments: count
    };
    
    // Update due date if start date changed
    const installmentNumber = inst.installment_number || 1;
    const newDueDate = new Date(startDateObj);
    newDueDate.setDate(newDueDate.getDate() + (30 * (installmentNumber - 1)));
    updateData.due_date = newDueDate.toISOString();
    
    await supabase
      .from('installments')
      .update(updateData)
      .eq('id', inst.id);
  }
  
  // If count increased, add new installments with adjusted amounts
  if (count > existingInstallments.length) {
    const newInstallments = [];
    for (let i = existingInstallments.length + 1; i <= count; i++) {
      const dueDate = new Date(startDateObj);
      dueDate.setDate(dueDate.getDate() + (30 * (i - 1)));
      
      // Calculate adjusted amount for new installments
      let adjustedAmount = amount;
      if (adjustmentAmount !== 0 && remainingCount > 0) {
        adjustedAmount = amount + adjustmentPerInstallment;
        // Apply remainder to first new installment if not already applied
        if (remainderApplied === 0 && remainder !== 0) {
          adjustedAmount += remainder;
          remainderApplied = 1;
        }
      }
      
      newInstallments.push({
        user_id: user.id,
        learner_id: learnerId,
        learner_name: learnerName,
        phone: phone || null,
        amount: adjustedAmount,
        due_date: dueDate.toISOString(),
        status: 'در انتظار',
        payment_date: null,
        payment_note: null,
        installment_note: null,
        installment_number: i,
        total_installments: count
      });
    }
    
    if (newInstallments.length > 0) {
      const { error } = await supabase
        .from('installments')
        .insert(newInstallments);
      
      if (error) {
        console.error('Error adding new installments:', error);
      }
    }
  }
  
  // Check if start date changed
  let startDateHistory = null;
  if (oldLearnerData && oldLearnerData.start_date) {
    const oldStartDate = new Date(oldLearnerData.start_date);
    const newStartDate = new Date(startDate);
    
    // Compare dates (ignore time)
    oldStartDate.setHours(0, 0, 0, 0);
    newStartDate.setHours(0, 0, 0, 0);
    
    if (oldStartDate.getTime() !== newStartDate.getTime()) {
      const today = new Date();
      const todayPersian = formatDatePersian(today.toISOString());
      const oldStartDatePersian = formatDatePersian(oldLearnerData.start_date);
      const newStartDatePersian = formatDatePersian(startDate);
      
      startDateHistory = `${todayPersian}: تاریخ شروع از ${oldStartDatePersian} به ${newStartDatePersian} تغییر کرد.`;
    }
  }
  
  // Update learner's adjustment history
  const historyEntries = [];
  if (adjustmentHistory) {
    historyEntries.push(adjustmentHistory);
  }
  if (startDateHistory) {
    historyEntries.push(startDateHistory);
  }
  
  if (historyEntries.length > 0) {
    const { data: currentLearner } = await supabase
      .from('learners')
      .select('adjustment_history')
      .eq('id', learnerId)
      .single();
    
    const existingHistory = currentLearner?.adjustment_history || '';
    const newHistoryEntries = historyEntries.join('\n\n');
    const newHistory = existingHistory ? `${existingHistory}\n\n${newHistoryEntries}` : newHistoryEntries;
    
    await supabase
      .from('learners')
      .update({ adjustment_history: newHistory })
      .eq('id', learnerId);
  }
  
  return adjustmentHistory || startDateHistory;
}

// Sync reminder learner names after edit
async function syncReminderLearnerName(learnerId, name) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from('reminders')
      .update({ learner_name: name })
      .eq('learner_id', learnerId)
      .eq('user_id', user.id);
  } catch (err) {
    console.error('Error syncing reminder learner name', err);
  }
}

// Refresh learners table
async function refreshLearners() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const searchTerm = document.getElementById('search-learners')?.value.toLowerCase() || '';
  const filterStatus = document.getElementById('filter-learner-status')?.value || 'all';
  
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
    tbody.innerHTML = '<tr><td colspan="11" class="empty-state"><p>هیچ زبان‌آموزی ثبت نشده است.</p></td></tr>';
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

    if (filterStatus !== 'all' && learner.status !== filterStatus) {
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

    const status = learner.status || '';
    const statusDisplay = status ? `<span class="${getStatusClass(status)}">${escapeHtml(status)}</span>` : '';
    
    const safeName = JSON.stringify(learner.name || '').replace(/"/g, '&quot;');
    const actionsMenuId = `learner-actions-${learner.id}`;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(learner.name)}</td>
      <td>${formatPhoneLink(learner.phone)}</td>
      <td>${learner.start_date ? formatDatePersian(learner.start_date) : ''}</td>
      <td>${learner.total_amount ? formatNumber(learner.total_amount) : ''}</td>
      <td>${learner.installment_count ? toPersianDigits(learner.installment_count) : ''}</td>
      <td>${learner.installment_amount ? formatNumber(learner.installment_amount) : ''}</td>
      <td>${learner.has_installment ? toPersianDigits(paidCount) : ''}</td>
      <td>${learner.has_installment ? toPersianDigits(pendingCount) : ''}</td>
      <td>${learner.has_installment ? toPersianDigits(overdueCount) : ''}</td>
      <td>${statusDisplay}</td>
      <td class="actions-cell">
        <div class="action-dropdown">
          <button class="btn-ghost action-toggle" onclick="toggleLearnerActions('${learner.id}')">عملیات ▾</button>
          <div class="action-menu" id="${actionsMenuId}">
            <button onclick="openReminderModal('${learner.id}', ${safeName})">افزودن یادآور</button>
            <button onclick="showLearnerDetails('${learner.id}')">نمایش جزئیات زبان‌آموز</button>
            <button onclick="openLearnerModal('${learner.id}')">ویرایش زبان‌آموز</button>
            ${learner.has_installment ? `<button onclick="openEditInstallmentsModal('${learner.id}', ${safeName})">ویرایش اقساط</button>` : ''}
            <button class="danger" onclick="deleteLearner('${learner.id}', ${safeName})">حذف</button>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Toggle actions dropdown for learners table
function toggleLearnerActions(learnerId) {
  const menuId = `learner-actions-${learnerId}`;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  if (openActionsMenuId && openActionsMenuId !== learnerId) {
    closeLearnerActionsMenu(openActionsMenuId);
  }

  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    openActionsMenuId = null;
  } else {
    menu.classList.add('open');
    openActionsMenuId = learnerId;
  }
}

function closeLearnerActionsMenu(learnerId) {
  const menu = document.getElementById(`learner-actions-${learnerId}`);
  if (menu) {
    menu.classList.remove('open');
  }
  openActionsMenuId = null;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.action-dropdown')) {
    if (openActionsMenuId) {
      closeLearnerActionsMenu(openActionsMenuId);
    }
  }
});

// Get status CSS class
function getStatusClass(status) {
  switch(status) {
    case 'فروش رفته':
      return 'status-sold';
    case 'در شرف خرید':
      return 'status-about-to-buy';
    case 'نیاز به پیگیری':
      return 'status-needs-followup';
    case 'انصراف داده':
      return 'status-cancelled';
    default:
      return 'status-needs-followup';
  }
}

// Delete learner
async function deleteLearner(learnerId, learnerName) {
  if (!confirm(`آیا مطمئن هستید که می‌خواهید زبان‌آموز "${learnerName}" را با تمام اطلاعات و اقساطش حذف کنید؟\n\nاین عمل قابل بازگشت نیست!`)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('learners')
      .delete()
      .eq('id', learnerId);
    
    if (error) throw error;
    
    showToast('زبان‌آموز با موفقیت حذف شد', 'success');
    refreshLearners();
    if (window.refreshInstallments) refreshInstallments();
  } catch (error) {
    showToast(error.message || 'خطا در حذف', 'error');
  }
}

// Show learner details
async function showLearnerDetails(learnerId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // Load learner data
    const { data: learner, error: learnerError } = await supabase
      .from('learners')
      .select('*')
      .eq('id', learnerId)
      .single();

    if (learnerError) throw learnerError;

    // Load installments
    const { data: installments, error: installmentsError } = await supabase
      .from('installments')
      .select('*')
      .eq('learner_id', learnerId)
      .order('installment_number', { ascending: true });

    if (installmentsError) throw installmentsError;

    // Build details HTML
    let html = '<div style="line-height: 2;">';
    
    // Basic Info
    html += '<h3 style="margin-top: 0; color: var(--accent-1);">اطلاعات اصلی</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-bottom: 20px;">';
    html += `<div><strong>نام:</strong></div><div>${escapeHtml(learner.name)}</div>`;
    html += `<div><strong>شماره تماس:</strong></div><div>${learner.phone ? formatPhoneLink(learner.phone) : '-'}</div>`;
    html += `<div><strong>سن:</strong></div><div>${learner.age || '-'}</div>`;
    html += `<div><strong>سطح زبان:</strong></div><div>${learner.level || '-'}</div>`;
    html += `<div><strong>هدف یادگیری:</strong></div><div>${learner.goal || '-'}</div>`;
    html += `<div><strong>شغل/وضعیت تحصیلی:</strong></div><div>${learner.occupation || '-'}</div>`;
    if (learner.status) {
      html += `<div><strong>وضعیت:</strong></div><div><span class="${getStatusClass(learner.status)}">${escapeHtml(learner.status)}</span></div>`;
    }
    if (learner.notes) {
      html += `<div><strong>توضیحات تکمیلی:</strong></div><div>${escapeHtml(learner.notes)}</div>`;
    }
    html += '</div>';

    // Installment Info
    if (learner.has_installment) {
      html += '<h3 style="color: var(--accent-1); margin-top: 30px;">اطلاعات اقساط</h3>';
      html += '<div style="display: flex; flex-wrap: wrap; gap: 15px 25px; margin-bottom: 20px; font-size: 0.9rem;">';
      html += `<span><strong>تاریخ شروع:</strong> ${learner.start_date ? formatDatePersian(learner.start_date) : '-'}</span>`;
      html += `<span><strong>مبلغ کل:</strong> ${formatNumber(learner.total_amount)} تومان</span>`;
      html += `<span><strong>تعداد اقساط:</strong> ${toPersianDigits(learner.installment_count)}</span>`;
      html += `<span><strong>مبلغ هر قسط:</strong> ${formatNumber(learner.installment_amount)} تومان</span>`;
      html += '</div>';

      // Calculate installment statistics
      if (installments && installments.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let paidCount = 0;
        let pendingCount = 0;
        let overdueCount = 0;
        let totalPaidAmount = 0;
        let totalPendingAmount = 0;
        let totalOverdueAmount = 0;
        let totalRemainingAmount = 0;
        
        installments.forEach(inst => {
          if (inst.status === 'پرداخت شده') {
            paidCount++;
            totalPaidAmount += inst.amount || 0;
          } else {
            const dueDate = new Date(inst.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const amount = inst.amount || 0;
            totalRemainingAmount += amount;
            
            if (dueDate < today) {
              overdueCount++;
              totalOverdueAmount += amount;
            } else {
              pendingCount++;
              totalPendingAmount += amount;
            }
          }
        });
        
        html += '<h3 style="color: var(--accent-1); margin-top: 20px;">آمار اقساط</h3>';
        html += '<div style="display: flex; flex-wrap: wrap; gap: 15px 25px; margin-bottom: 20px; font-size: 0.9rem;">';
        html += `<span><strong>اقساط پرداخت شده:</strong> ${toPersianDigits(paidCount)} قسط (${totalPaidAmount > 0 ? formatNumber(totalPaidAmount) + ' تومان' : '0 تومان'})</span>`;
        html += `<span><strong>اقساط در انتظار:</strong> ${toPersianDigits(pendingCount)} قسط (${pendingCount > 0 ? formatNumber(totalPendingAmount) + ' تومان' : '0 تومان'})</span>`;
        html += `<span><strong>اقساط عقب افتاده:</strong> ${toPersianDigits(overdueCount)} قسط (${overdueCount > 0 ? formatNumber(totalOverdueAmount) + ' تومان' : '0 تومان'})</span>`;
        html += `<span><strong>مبلغ کل پرداخت شده:</strong> ${formatNumber(totalPaidAmount)} تومان</span>`;
        html += `<span><strong>مبلغ کل باقیمانده:</strong> ${formatNumber(totalRemainingAmount)} تومان</span>`;
        html += '</div>';
      }

      // Installments List
      if (installments && installments.length > 0) {
        html += '<h3 style="color: var(--accent-1); margin-top: 30px;">لیست اقساط</h3>';
        html += '<div style="overflow-x: auto; margin-bottom: 20px;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: var(--panel);">';
        html += '<th style="padding: 10px; border: 1px solid var(--border);">شماره</th>';
        html += '<th style="padding: 10px; border: 1px solid var(--border);">مبلغ</th>';
        html += '<th style="padding: 10px; border: 1px solid var(--border);">تاریخ سررسید</th>';
        html += '<th style="padding: 10px; border: 1px solid var(--border);">وضعیت</th>';
        html += '<th style="padding: 10px; border: 1px solid var(--border);">تاریخ پرداخت</th>';
        html += '</tr></thead><tbody>';
        
        installments.forEach(inst => {
          // Calculate status based on payment status and due date
          let statusText = inst.status;
          let statusStyle = '';
          
          if (inst.status === 'پرداخت شده') {
            statusStyle = 'color: var(--accent);'; // Green color for paid
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(inst.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const days = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (days < 0) {
              statusText = 'عقب افتاده';
              statusStyle = 'color: var(--danger);';
            } else {
              statusText = 'در انتظار';
              statusStyle = 'color: var(--pending);';
            }
          }
          
          html += '<tr>';
          html += `<td style="padding: 8px; border: 1px solid var(--border); text-align: center;">${toPersianDigits(inst.installment_number)}</td>`;
          html += `<td style="padding: 8px; border: 1px solid var(--border); text-align: center;">${formatNumber(inst.amount)}</td>`;
          html += `<td style="padding: 8px; border: 1px solid var(--border); text-align: center;">${formatDatePersian(inst.due_date)}</td>`;
          html += `<td style="padding: 8px; border: 1px solid var(--border); text-align: center; ${statusStyle}">${statusText}</td>`;
          html += `<td style="padding: 8px; border: 1px solid var(--border); text-align: center;">${inst.payment_date || '-'}</td>`;
          html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '</div>';
      }

      // Adjustment History
      if (learner.adjustment_history) {
        html += '<h3 style="color: var(--accent-1); margin-top: 30px;">تاریخچه تغییرات اقساط</h3>';
        html += '<div style="background: var(--panel); padding: 15px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 20px;">';
        html += `<div style="white-space: pre-wrap; line-height: 1.8;">${escapeHtml(learner.adjustment_history)}</div>`;
        html += '</div>';
      }
    }

    html += '</div>';

    // Update modal
    document.getElementById('learner-details-title').textContent = `جزئیات زبان‌آموز: ${escapeHtml(learner.name)}`;
    document.getElementById('learner-details-content').innerHTML = html;
    document.getElementById('modal-learner-details').classList.add('active');
  } catch (error) {
    console.error('Error loading learner details:', error);
    showToast('خطا در بارگذاری جزئیات', 'error');
  }
}

// Open edit installments modal (manual amount change for unpaid installments)
async function openEditInstallmentsModal(learnerId, learnerName) {
  currentEditInstallmentsLearnerId = learnerId;
  currentEditInstallments = [];
  manualEditedInstallments = new Set();
  currentEditTotalAmount = 0;
  currentEditPaidSum = 0;

  const titleEl = document.getElementById('edit-installments-title');
  if (titleEl) {
    titleEl.textContent = `ویرایش اقساط: ${learnerName}`;
  }

  const contentEl = document.getElementById('edit-installments-content');
  if (!contentEl) return;

  contentEl.innerHTML = '<p class="text-muted">در حال بارگذاری...</p>';
  document.getElementById('modal-edit-installments')?.classList.add('active');

  const [{ data: installments, error }, { data: learnerData }] = await Promise.all([
    supabase
      .from('installments')
      .select('*')
      .eq('learner_id', learnerId)
      .order('installment_number', { ascending: true }),
    supabase
      .from('learners')
      .select('total_amount')
      .eq('id', learnerId)
      .single()
  ]);

  if (error) {
    showToast('خطا در بارگذاری اقساط', 'error');
    contentEl.innerHTML = '<p class="text-danger">بارگذاری اقساط با خطا مواجه شد.</p>';
    return;
  }

  if (!installments || installments.length === 0) {
    contentEl.innerHTML = '<p class="text-muted">قسط پرداخت‌نشده‌ای برای ویرایش وجود ندارد.</p>';
    return;
  }

  currentEditInstallments = installments;
  currentEditTotalAmount = learnerData?.total_amount || 0;
  currentEditPaidSum = installments
    .filter(inst => inst.status === 'پرداخت شده')
    .reduce((sum, inst) => sum + (inst.amount || 0), 0);

  const rowsHtml = installments.map(inst => {
    const dueDate = new Date(inst.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let statusText = 'در انتظار';
    let statusClass = 'status-text-pending';
    const isPaid = inst.status === 'پرداخت شده';

    if (isPaid) {
      statusText = 'پرداخت شده';
      statusClass = 'status-text-paid';
    } else if (dueDate < today) {
      statusText = 'عقب افتاده';
      statusClass = 'status-text-overdue';
    }

    const paymentDateDisplay = inst.payment_date ? formatDatePersian(inst.payment_date) : '-';
    const readonlyAttr = isPaid ? 'disabled title="قسط پرداخت شده قابل ویرایش نیست"' : '';

    return `
      <tr>
        <td>${toPersianDigits(inst.installment_number)}</td>
        <td class="amount-cell">
          <input type="text" class="installment-amount-input" data-installment-id="${inst.id}" value="${formatNumber(inst.amount || 0)}" ${readonlyAttr}>
        </td>
        <td>${formatDatePersian(inst.due_date)}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${paymentDateDisplay}</td>
      </tr>
    `;
  }).join('');

  contentEl.innerHTML = `
    <div class="table-container edit-table-container">
      <table class="edit-installments-table">
        <thead>
          <tr>
            <th>شماره</th>
            <th>مبلغ</th>
            <th>تاریخ سررسید</th>
            <th>وضعیت</th>
            <th>تاریخ پرداخت</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
  setupInstallmentAmountInputs();
}

// Setup formatting for installment amount inputs
function setupInstallmentAmountInputs() {
  document.querySelectorAll('.installment-amount-input').forEach(input => {
    input.addEventListener('input', handleInstallmentInputChange);
  });
}

// Handle live redistribution after an amount change
function handleInstallmentInputChange(event) {
  const input = event.target;
  const id = input.dataset.installmentId;
  if (!id) return;
  if (input.disabled) return;

  manualEditedInstallments.add(id);

  const inputs = Array.from(document.querySelectorAll('.installment-amount-input'));
  const editable = inputs.filter(i => !i.disabled);

  // Normalize current input value
  const english = toEnglishDigits(input.value).replace(/\D/g, '');
  const currentValue = english ? Math.max(1, parseInt(english, 10)) : 0;
  input.value = currentValue ? toPersianDigits(currentValue.toLocaleString('fa-IR')) : '';

  // Recompute totals
  const paidSum = currentEditPaidSum;
  let manualSum = 0;
  const manualInputs = [];
  const autoInputs = [];

  editable.forEach(el => {
    const eng = toEnglishDigits(el.value).replace(/\D/g, '');
    const val = eng ? Math.max(1, parseInt(eng, 10)) : 0;
    if (manualEditedInstallments.has(el.dataset.installmentId)) {
      manualInputs.push({ el, val });
      manualSum += val;
    } else {
      autoInputs.push({ el, val });
    }
  });

  const targetTotal = currentEditTotalAmount || 0;
  const remainingTarget = targetTotal - paidSum - manualSum;

  if (remainingTarget < 0) {
    showToast('مجموع مبالغ از مبلغ کل بیشتر شد. مقادیر را کاهش دهید.', 'error');
    return;
  }

  if (autoInputs.length > 0) {
    const per = autoInputs.length > 0 ? Math.floor(remainingTarget / autoInputs.length) : 0;
    let remainder = remainingTarget - (per * autoInputs.length);
    autoInputs.forEach(item => {
      let newVal = per;
      if (remainder > 0) {
        newVal += 1;
        remainder -= 1;
      }
      newVal = Math.max(0, newVal);
      item.el.value = newVal ? toPersianDigits(newVal.toLocaleString('fa-IR')) : '';
    });
  } else {
    // همه اقساط قابل ویرایش دستی شده‌اند؛ آخرین ورودی را تنظیم می‌کنیم تا جمع درست شود
    const last = manualInputs[manualInputs.length - 1];
    if (last) {
      const adjusted = Math.max(1, last.val + remainingTarget);
      last.el.value = toPersianDigits(adjusted.toLocaleString('fa-IR'));
    }
  }
}

// Save manual installment amount edits
async function saveEditableInstallments() {
  if (!currentEditInstallmentsLearnerId) return;
  const container = document.querySelector('#edit-installments-content');
  if (!container) return;

  const inputs = container.querySelectorAll('.installment-amount-input');
  if (inputs.length === 0) {
    document.getElementById('modal-edit-installments')?.classList.remove('active');
    return;
  }

  const updates = [];
  for (const input of inputs) {
    if (input.disabled) continue;
    const raw = toEnglishDigits(input.value).replace(/\D/g, '');
    const amount = parseInt(raw, 10);
    if (!amount || amount <= 0) {
      showToast('مبلغ هر قسط باید بیشتر از صفر باشد', 'error');
      return;
    }
    updates.push({ id: input.dataset.installmentId, amount });
  }

  const totalFromInputs = updates.reduce((sum, u) => sum + u.amount, 0) + currentEditPaidSum;
  if (currentEditTotalAmount && totalFromInputs !== currentEditTotalAmount) {
    const diff = currentEditTotalAmount - totalFromInputs;
    showToast(`مجموع اقساط با مبلغ کل برابر نیست. اختلاف: ${formatNumber(Math.abs(diff))} تومان`, 'error');
    return;
  }

  try {
    await Promise.all(updates.map(u => supabase
      .from('installments')
      .update({ amount: u.amount })
      .eq('id', u.id)
    ));

    // Refresh learner totals based on all installments
    const { data: allInstallments } = await supabase
      .from('installments')
      .select('amount')
      .eq('learner_id', currentEditInstallmentsLearnerId);

    if (allInstallments && allInstallments.length > 0) {
      const totalAmount = allInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
      const averageAmount = Math.floor(totalAmount / allInstallments.length);
      await supabase
        .from('learners')
        .update({ total_amount: totalAmount, installment_amount: averageAmount })
        .eq('id', currentEditInstallmentsLearnerId);
    }

    showToast('اقساط به‌روزرسانی شد', 'success');
    document.getElementById('modal-edit-installments')?.classList.remove('active');
    refreshInstallments();
    refreshLearners();
  } catch (error) {
    showToast(error.message || 'خطا در ذخیره اقساط', 'error');
  }
}

// Make functions globally available
window.openLearnerModal = openLearnerModal;
window.deleteLearner = deleteLearner;
window.refreshLearners = refreshLearners;
window.showLearnerDetails = showLearnerDetails;
window.openReminderModal = openReminderModal;
window.openEditInstallmentsModal = openEditInstallmentsModal;
window.toggleLearnerActions = toggleLearnerActions;

// Open reminder modal
function openReminderModal(learnerId, learnerName, reminder = null) {
  currentReminderLearnerId = learnerId;
  currentReminderLearnerName = learnerName;
  currentReminderId = reminder?.id || null;

  const modal = document.getElementById('modal-reminder');
  document.getElementById('reminder-learner-name').value = learnerName;

  if (reminder) {
    const dt = new Date(reminder.reminder_at);
    const dateStr = formatDatePersian(reminder.reminder_at);
    const timeStr = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('reminder-date').value = dateStr;
    document.getElementById('reminder-time').value = timeStr; // keep English digits for time input
    document.getElementById('reminder-description').value = reminder.description || '';
  } else {
    document.getElementById('reminder-date').value = '';
    document.getElementById('reminder-time').value = '';
    document.getElementById('reminder-description').value = '';
  }
  modal.classList.add('active');
}

// Save reminder (create or update)
async function saveReminder() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !currentReminderLearnerId) return;

  const dateStr = document.getElementById('reminder-date').value.trim();
  const timeStr = document.getElementById('reminder-time').value.trim();
  const desc = document.getElementById('reminder-description').value.trim();

  if (!dateStr) {
    showToast('تاریخ یادآور را وارد کنید', 'error');
    return;
  }
  if (!timeStr) {
    showToast('ساعت یادآور را وارد کنید', 'error');
    return;
  }

  const baseDateIso = parseDate(dateStr);
  if (!baseDateIso) {
    showToast('فرمت تاریخ صحیح نیست', 'error');
    return;
  }

  const timeEnglish = toEnglishDigits(timeStr);
  const timeParts = timeEnglish.split(':');
  if (timeParts.length !== 2) {
    showToast('فرمت ساعت صحیح نیست', 'error');
    return;
  }
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59 || hours < 0 || minutes < 0) {
    showToast('فرمت ساعت صحیح نیست', 'error');
    return;
  }

  const reminderDate = new Date(baseDateIso);
  reminderDate.setHours(hours, minutes, 0, 0);

  try {
    if (currentReminderId) {
      const { error } = await supabase
        .from('reminders')
        .update({
          reminder_at: reminderDate.toISOString(),
          description: desc || null,
          sent: false,
          sent_at: null,
          completed: false,
          completed_at: null
        })
        .eq('id', currentReminderId)
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          learner_id: currentReminderLearnerId,
          learner_name: currentReminderLearnerName,
          reminder_at: reminderDate.toISOString(),
          description: desc || null,
          sent: false,
          completed: false
        });
      if (error) throw error;
    }

    document.getElementById('modal-reminder').classList.remove('active');
    showToast('یادآور ذخیره شد', 'success');
    if (window.refreshReminders) window.refreshReminders();
  } catch (error) {
    showToast(error.message || 'خطا در ذخیره یادآور', 'error');
  }
}

// Send due reminders to Telegram (client-side polling)
let reminderSendInProgress = false;
async function processDueReminders() {
  if (reminderSendInProgress) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const chatId = window.userProfile?.chatId;
  const token = window.userProfile?.telegramToken;
  if (!chatId || !token) return;

  reminderSendInProgress = true;
  try {
    const nowIso = new Date().toISOString();
    const fiveMinutesLaterIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('sent', false)
      .eq('completed', false)
      .lte('reminder_at', fiveMinutesLaterIso)
      .order('reminder_at', { ascending: true });

    if (error || !reminders || reminders.length === 0) {
      reminderSendInProgress = false;
      return;
    }

    const userName = window.userProfile?.name || 'کاربر';

    for (const reminder of reminders) {
      const timeStr = new Date(reminder.reminder_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const phoneText = reminder.phone ? `\nشماره تماس: ${reminder.phone}` : '';
      const descText = reminder.description ? `\nتوضیحات: ${reminder.description}` : '';
      const reminderText = `سلام ${userName} 👋\n⏰ یادآور زبان‌آموز\nنام: ${reminder.learner_name}${phoneText}\nزمان: ${formatDatePersian(reminder.reminder_at)} ${timeStr}${descText}`;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: reminderText
        })
      });

      if (res.ok) {
        await supabase
          .from('reminders')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', reminder.id);
      }
    }
  } catch (err) {
    console.error('reminder send error', err);
  } finally {
    reminderSendInProgress = false;
  }
}

setInterval(processDueReminders, 60000);

