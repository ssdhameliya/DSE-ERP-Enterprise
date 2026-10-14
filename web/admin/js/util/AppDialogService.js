/**
 * Jasvi Industries ERP - AppDialogService
 * Modal dialog renderer and notification system matching desktop AppDialogService
 */
window.AppDialogService = {
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
    modal.style.display = 'flex';
    modal.style.zIndex = '100010';
    modal.classList.add('active');
    const firstInput = modal.querySelector('input:not([type=hidden]):not([readonly]), select');
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (window.AudioSynthesizer) window.AudioSynthesizer.playClose();
    modal.style.display = 'none';
    modal.classList.remove('active');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.style.display = 'none';
      m.classList.remove('active');
    });
    const auth = document.getElementById('auth-overlay');
    if (auth) auth.style.display = 'none';
  }
};
