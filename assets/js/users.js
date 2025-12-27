// User Management Logic
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const createUserBtn = document.getElementById('btn-create-user');
  const createUserModal = document.getElementById('modal-create-user');
  const createUserForm = document.getElementById('form-create-user');
  const createUserError = document.getElementById('create-user-error');
  const createUserSuccess = document.getElementById('create-user-success');

  if (createUserBtn) {
    createUserBtn.addEventListener('click', () => {
      if (createUserModal) {
        createUserModal.classList.add('active');
        if (createUserForm) createUserForm.reset();
        if (createUserError) {
          createUserError.style.display = 'none';
          createUserError.textContent = '';
        }
        if (createUserSuccess) {
          createUserSuccess.style.display = 'none';
          createUserSuccess.textContent = '';
        }
        const telegramTokenInput = document.getElementById('new-user-telegram-token');
        if (telegramTokenInput) {
          telegramTokenInput.value = 'REMOVED_TELEGRAM_TOKEN';
        }
      }
    });
  }

  if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (createUserError) {
        createUserError.style.display = 'none';
        createUserError.textContent = '';
      }
      if (createUserSuccess) {
        createUserSuccess.style.display = 'none';
        createUserSuccess.textContent = '';
      }

      const email = document.getElementById('new-user-email').value.trim();
      const password = document.getElementById('new-user-password').value;
      const name = document.getElementById('new-user-name').value.trim();
      const chatId = document.getElementById('new-user-chat-id').value.trim();
      const telegramToken = document.getElementById('new-user-telegram-token').value.trim();

      if (!email || !password || !name) {
        if (createUserError) {
          createUserError.textContent = 'ایمیل، رمز عبور و نام الزامی هستند';
          createUserError.style.display = 'block';
        }
        return;
      }

      if (password.length < 6) {
        if (createUserError) {
          createUserError.textContent = 'رمز عبور باید حداقل 6 کاراکتر باشد';
          createUserError.style.display = 'block';
        }
        return;
      }

      const submitBtn = createUserForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'در حال ایجاد...';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session not found');
        }

        const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_CONFIG.anonKey,
          },
          body: JSON.stringify({
            email,
            password,
            name,
            chat_id: chatId || null,
            telegram_token: telegramToken || 'REMOVED_TELEGRAM_TOKEN',
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'خطا در ایجاد کاربر');
        }

        if (createUserSuccess) {
          createUserSuccess.textContent = `کاربر ${result.user?.email || email} با موفقیت ایجاد شد`;
          createUserSuccess.style.display = 'block';
        }

        createUserForm.reset();
        const telegramTokenInput = document.getElementById('new-user-telegram-token');
        if (telegramTokenInput) {
          telegramTokenInput.value = 'REMOVED_TELEGRAM_TOKEN';
        }

        setTimeout(() => {
          if (createUserModal) {
            createUserModal.classList.remove('active');
          }
        }, 2000);
      } catch (error) {
        if (createUserError) {
          createUserError.textContent = error.message || 'خطا در ایجاد کاربر';
          createUserError.style.display = 'block';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
});

