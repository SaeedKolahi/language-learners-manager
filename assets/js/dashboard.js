// Dashboard Main Logic
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  // Get user data and display greeting
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Load user profile from database
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, chat_id, telegram_token')
      .eq('user_id', user.id)
      .single();
    
    window.userProfile = {
      name: userProfile?.name,
      chatId: userProfile?.chat_id || null,
      telegramToken: userProfile?.telegram_token || null
    };
    
    const userName = userProfile?.name || user.email?.split('@')[0] || 'کاربر';
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
      greetingEl.textContent = `سلام ${userName}!👋`;
    }

    // Show create user button only for admin
    const ADMIN_UID = 'REMOVED_ADMIN_UID';
    const createUserBtn = document.getElementById('btn-create-user');
    if (createUserBtn && user.id === ADMIN_UID) {
      createUserBtn.style.display = 'block';
    }
  }

  // Set today's date
  const today = new Date();
  const todayStr = formatDatePersian(today.toISOString());
  const todayEl = document.getElementById('today-date');
  if (todayEl) {
    todayEl.textContent = `امروز: ${todayStr}`;
  }

  // User menu dropdown
  const userMenuBtn = document.getElementById('btn-user-menu');
  const userMenu = document.getElementById('user-menu');
  const logoutBtn = document.getElementById('btn-logout');
  const changePasswordBtn = document.getElementById('btn-change-password');

  if (userMenuBtn && userMenu) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove('open');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    });
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      const modal = document.getElementById('modal-change-password');
      if (modal) {
        userMenu.classList.remove('open');
        modal.classList.add('active');
        document.getElementById('form-change-password').reset();
        document.getElementById('change-password-error').style.display = 'none';
        document.getElementById('change-password-success').style.display = 'none';
      }
    });
  }

  // Change password form
  const changePasswordForm = document.getElementById('form-change-password');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('change-password-error');
      const successEl = document.getElementById('change-password-success');
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      errorEl.style.display = 'none';
      successEl.style.display = 'none';

      if (newPassword.length < 6) {
        errorEl.textContent = 'رمز عبور جدید باید حداقل 6 کاراکتر باشد';
        errorEl.style.display = 'block';
        return;
      }

      if (newPassword !== confirmPassword) {
        errorEl.textContent = 'رمز عبور جدید و تکرار آن یکسان نیستند';
        errorEl.style.display = 'block';
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        errorEl.textContent = 'کاربر یافت نشد';
        errorEl.style.display = 'block';
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        errorEl.textContent = updateError.message || 'خطا در تغییر پسورد';
        errorEl.style.display = 'block';
      } else {
        successEl.textContent = 'رمز عبور با موفقیت تغییر یافت';
        successEl.style.display = 'block';
        changePasswordForm.reset();
        setTimeout(() => {
          const modal = document.getElementById('modal-change-password');
          if (modal) {
            modal.classList.remove('active');
          }
        }, 2000);
      }
    });
  }

  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // Refresh data when switching tabs
      if (targetTab === 'learners') {
        if (window.refreshLearners) window.refreshLearners();
      } else if (targetTab === 'installments') {
        if (window.refreshInstallments) window.refreshInstallments();
      } else if (targetTab === 'payments') {
        if (window.refreshPayments) window.refreshPayments();
      } else if (targetTab === 'reminders') {
        if (window.refreshReminders) window.refreshReminders();
      }
    });
  });

  // Modal handling
  const modals = document.querySelectorAll('.modal');
  const modalCloses = document.querySelectorAll('.modal-close, [data-modal]');

  modalCloses.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal || btn.closest('.modal')?.id;
      if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.remove('active');
        }
      }
    });
  });

  // Close modal on outside click
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Initialize data
  if (window.refreshLearners) window.refreshLearners();
  if (window.refreshInstallments) window.refreshInstallments();
  if (window.refreshPayments) window.refreshPayments();
  if (window.refreshReminders) window.refreshReminders();

  // Init custom selects ( وضعیت و فیلترها )
  if (window.initCustomSelect) {
    initCustomSelect('learner-status');
    initCustomSelect('filter-learner-status');
    initCustomSelect('filter-status');
    initCustomSelect('filter-reminders');
  }

  // Init Jalali datepicker watcher
  if (window.jalaliDatepicker) {
    window.jalaliDatepicker.startWatch();
  }
});

