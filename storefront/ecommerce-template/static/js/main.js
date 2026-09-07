// Enable JS class early
document.documentElement.classList.add('js-enabled');


document.addEventListener('DOMContentLoaded', () => {
  const switcher = document.getElementById('languageSwitcher');
  const dropdown = document.getElementById('languageDropdown');

  // Toggle on click
  switcher.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from bubbling up
    dropdown.classList.toggle('open');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !switcher.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
});

// CART PANEL JS
// This script handles the cart panel toggle functionality

document.addEventListener('DOMContentLoaded', () => {
  const cartPanel = document.getElementById('cartPanel');
  const openCartBtn = document.querySelector('.cart-icon-wrapper');
  const closeCartBtn = document.getElementById('closeCartBtn');

  if (openCartBtn && closeCartBtn && cartPanel) {
    openCartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cartPanel.classList.add('open');
    });

    closeCartBtn.addEventListener('click', () => {
      cartPanel.classList.remove('open');
    });

    // Optional: close on outside click
    window.addEventListener('click', (e) => {
      if (cartPanel.classList.contains('open') && !cartPanel.contains(e.target) && !openCartBtn.contains(e.target)) {
        cartPanel.classList.remove('open');
      }
    });
  }
});


//SEARCH PANEL JS
// This script handles the search panel toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchPanel = document.getElementById('searchPanel');
  const openSearchBtn = document.getElementById('openSearchBtn');
  const closeSearchBtn = document.getElementById('closeSearchBtn');

  function openSearch() {
    searchPanel.classList.add('open');
    searchPanel.classList.remove('hidden');
  }

  function closeSearch() {
    searchPanel.classList.remove('open');
    setTimeout(() => {
      searchPanel.classList.add('hidden');
    }, 300);
  }

  openSearchBtn?.addEventListener('click', openSearch);
  closeSearchBtn?.addEventListener('click', closeSearch);

  // Optional: Close when clicking outside
  document.addEventListener('click', (e) => {
    if (
      searchPanel.classList.contains('open') &&
      !searchPanel.contains(e.target) &&
      !openSearchBtn.contains(e.target)
    ) {
      closeSearch();
    }
  });
});

//carousel sliding 
const track = document.querySelector('.carousel-track');
  const slides = Array.from(track.children);
  const dotsContainer = document.getElementById('carouselDots');
  let currentSlide = 0;

  // Create dots
  slides.forEach((_, index) => {
    const dot = document.createElement('span');
    if (index === 0) dot.classList.add('active');
    dotsContainer.appendChild(dot);
    dot.addEventListener('click', () => goToSlide(index));
  });

  const dots = Array.from(dotsContainer.children);

  function goToSlide(index) {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach(dot => dot.classList.remove('active'));
    dots[index].classList.add('active');
    currentSlide = index;
  }

  function autoSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    goToSlide(currentSlide);
  }

  let auto = setInterval(autoSlide, 5000);

  //django messages 
  setTimeout(() => {
    document.querySelectorAll('.message').forEach(msg => {
      msg.style.opacity = '0';
      msg.style.pointerEvents = 'none';
    });
  }, 4000); // 4 seconds

document.addEventListener("DOMContentLoaded", function () {
    const toggles = document.querySelectorAll(".footer-toggle-btn");

    toggles.forEach((btn) => {
      btn.addEventListener("click", function () {
        const submenu = btn.nextElementSibling;
        if (submenu.style.display === "block") {
          submenu.style.display = "none";
        } else {
          submenu.style.display = "block";
        }
      });
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.footer-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      this.parentElement.classList.toggle('open');
    });
  });
});

//hamburger toogle
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('nav-open');
    });

    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('nav-open');
      }
    });
  }
});

//products page toogle
function toggleSortDropdown() {
  const dropdown = document.getElementById('sort-dropdown');
  dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function (e) {
  const sortToggle = document.querySelector('.sort-toggle');
  const dropdown = document.getElementById('sort-dropdown');

  if (!sortToggle.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

function changeImage(imageUrl, element) {
  const mainImage = document.getElementById('main-image');
  mainImage.style.opacity = 0;

  setTimeout(() => {
    mainImage.src = imageUrl;
    mainImage.style.opacity = 1;
  }, 300);

  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
  element.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const colorBoxes = document.querySelectorAll('.pd-color-box');

  colorBoxes.forEach(box => {
    const hex = box.getAttribute('data-color-code') || '#ccc';
    box.style.backgroundColor = hex;
  });
});
