let breakingContainer, toastContainer;
let breakingTimer = null;
let toastTimer = null;

export function initToastContainers() {
    breakingContainer = document.getElementById('breaking-toast-container');
    toastContainer = document.getElementById('toast-container');
}

function clearTimer(timer) {
    if (timer) {
        clearTimeout(timer);
        return null;
    }
    return null;
}

export function showBreakingToast(title, text) {
    breakingTimer = clearTimer(breakingTimer);

    breakingContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'breaking-toast';
    toast.innerHTML = `<span class="breaking-label">BREAKING:</span> ${title}<br><span class="breaking-text">${text}</span>`;
    breakingContainer.appendChild(toast);
    breakingContainer.classList.add('has-toast');

    breakingTimer = setTimeout(() => {
        breakingContainer.innerHTML = '';
        breakingContainer.classList.remove('has-toast');
        breakingTimer = null;
    }, 5000);
}

export function showToast(title, text) {
    toastTimer = clearTimer(toastTimer);

    toastContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>${title}</strong><br>${text}`;
    toastContainer.appendChild(toast);
    toastContainer.classList.add('has-toast');

    toastTimer = setTimeout(() => {
        toastContainer.innerHTML = '';
        toastContainer.classList.remove('has-toast');
        toastTimer = null;
    }, 5000);
}