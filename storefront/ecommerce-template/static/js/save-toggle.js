document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.save-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;

      fetch(`/toggle-save/${productId}/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'saved') {
          button.innerHTML = '❤️'; // filled
          showMessage("Item saved");
        } else if (data.status === 'unsaved') {
          button.innerHTML = '🤍'; // unfilled
          showMessage("Item removed");
        }
      });
    });
  });

  function getCSRFToken() {
    return document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
  }

  function showMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'django-message fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow z-50';
    msg.innerText = text;
    document.body.appendChild(msg);
    setTimeout(() => {
      msg.style.opacity = 0;
      setTimeout(() => msg.remove(), 500);
    }, 3000);
  }
});
