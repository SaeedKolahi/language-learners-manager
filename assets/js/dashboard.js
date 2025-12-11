// Dashboard Main Logic
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  // Set today's date
  const today = new Date();
  const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
  const todayEl = document.getElementById('today-date');
  if (todayEl) {
    todayEl.textContent = `امروز: ${todayStr}`;
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = 'index.html';
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
});

