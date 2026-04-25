// Mobile Navigation Toggle
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');

if (hamburgerBtn && navLinks) {
  hamburgerBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburgerBtn.classList.toggle('active');
    
    // Close all dropdowns when hamburger is clicked
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  });

  // Close mobile menu when clicking on a link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      hamburgerBtn.classList.remove('active');
    });
  });
}

// Dropdown functionality for all screen sizes
document.querySelectorAll('.dropdown > a, .dropdown > p').forEach(dropdownTrigger => {
  dropdownTrigger.addEventListener('click', function(e) {
    // Only handle click on mobile (≤900px)
    if (window.innerWidth <= 900) {
      e.preventDefault();
      const dropdown = this.parentElement;
      dropdown.classList.toggle('active');
      
      // Close other dropdowns
      document.querySelectorAll('.dropdown').forEach(otherDropdown => {
        if (otherDropdown !== dropdown) {
          otherDropdown.classList.remove('active');
        }
      });
    }
  });
});

// Close dropdowns when clicking outside (desktop only)
document.addEventListener('click', function(e) {
  if (window.innerWidth > 900) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  }
});

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    
    // Save theme preference
    localStorage.setItem('theme', newTheme);
  });

  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
  }
}

// Background contact form submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const contactSubmit = contactForm.querySelector('[data-contact-submit]');
  const contactStatus = document.getElementById('contactStatus');
  const submittedAtField = contactForm.querySelector('input[name="submittedAt"]');
  const contactDefaultHtml = contactSubmit ? contactSubmit.innerHTML : 'Send Project Request 🚀';
  const contactSelectControllers = [];

  function setContactStatus(message, type = '') {
    if (!contactStatus) return;

    contactStatus.textContent = message;
    contactStatus.classList.remove('success', 'error');

    if (type) {
      contactStatus.classList.add(type);
    }
  }

  function setContactLoading(isLoading) {
    if (!contactSubmit) return;

    contactSubmit.disabled = isLoading;
    contactSubmit.setAttribute('aria-busy', String(isLoading));
    contactSubmit.classList.toggle('is-loading', isLoading);
    contactSubmit.innerHTML = isLoading
      ? '<span class="button-spinner" aria-hidden="true"></span><span>Opening...</span>'
      : contactDefaultHtml;
  }

  function refreshSubmittedAt() {
    if (submittedAtField) {
      submittedAtField.value = Date.now().toString();
    }
  }

  function normalizeSingleLine(value, maxLength = 120) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/\u0000/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function normalizeMultiline(value, maxLength = 2000) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/\u0000/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()
      .slice(0, maxLength);
  }

  function buildContactMessage(data) {
    const reference = data.reference || 'N/A';

    return [
      '🚀 NEW CLIENT INQUIRY',
      '',
      'Client Details',
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      '',
      'Project Information',
      `Project Title: ${data.projectTitle}`,
      `Service Required: ${data.service}`,
      '',
      'Project Description',
      data.description,
      '',
      'Reference (Optional)',
      reference,
      '',
      'Source',
      'Portfolio Website',
    ].join('\n');
  }

  function buildRedirectUrl(contactMethod, message) {
    const encodedMessage = encodeURIComponent(message);

    if (contactMethod === 'whatsapp') {
      return `https://wa.me/9277072409?text=${encodedMessage}`;
    }

    if (contactMethod === 'gmail') {
      const subject = encodeURIComponent('New Client Inquiry – Portfolio Website');
      return `https://mail.google.com/mail/?view=cm&fs=1&to=arvind90782@gmail.com&su=${subject}&body=${encodedMessage}`;
    }

    return '';
  }

  refreshSubmittedAt();

  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!this.reportValidity()) {
      return;
    }

    if (!validateContactSelects()) {
      return;
    }

    setContactStatus('');
    setContactLoading(true);

    try {
      const formData = new FormData(this);
      const payload = Object.fromEntries(formData.entries());

      const name = normalizeSingleLine(payload.name, 80);
      const email = normalizeSingleLine(payload.email, 120).toLowerCase();
      const phone = normalizeSingleLine(payload.phone, 30);
      const projectTitle = normalizeSingleLine(payload.projectTitle, 120);
      const service = normalizeSingleLine(payload.service, 60);
      const description = normalizeMultiline(payload.description, 2000);
      const reference = normalizeSingleLine(payload.reference, 300);
      const contactMethod = normalizeSingleLine(payload.contactMethod, 30).toLowerCase();

      if (!name || !email || !phone || !projectTitle || !service || !description) {
        throw new Error('Please complete all required fields before continuing.');
      }

      if (!contactMethod) {
        throw new Error('Please choose WhatsApp or Gmail.');
      }

      const message = buildContactMessage({
        name,
        email,
        phone,
        projectTitle,
        service,
        description,
        reference,
      });

      const targetUrl = buildRedirectUrl(contactMethod, message);

      if (!targetUrl) {
        throw new Error('Please choose WhatsApp or Gmail.');
      }

      setContactLoading(true);
      window.location.assign(targetUrl);
    } catch (error) {
      setContactStatus(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setContactLoading(false);
    }
  });

  function syncContactSelectStates() {
    contactSelectControllers.forEach((controller) => {
      controller.sync();
      controller.close(false);
      controller.wrapper.classList.remove('is-invalid');
    });
  }

  function validateContactSelects() {
    const missingController = contactSelectControllers.find((controller) => !controller.select.value);

    contactSelectControllers.forEach((controller) => {
      controller.wrapper.classList.toggle('is-invalid', !controller.select.value);
    });

    if (missingController) {
      setContactStatus('Please choose values for the dropdown fields before sending.', 'error');
      missingController.open();
      missingController.trigger.focus();
      return false;
    }

    return true;
  }

  function enhanceContactSelect(select) {
    if (!select || select.dataset.customSelectEnhanced === 'true') {
      return;
    }

    select.dataset.customSelectEnhanced = 'true';
    select.removeAttribute('required');
    select.classList.add('contact-select__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const wrapper = document.createElement('div');
    wrapper.className = 'contact-select';

    const triggerId = select.id ? `${select.id}-trigger` : `contact-select-${contactSelectControllers.length + 1}-trigger`;
    const listboxId = select.id ? `${select.id}-listbox` : `contact-select-${contactSelectControllers.length + 1}-listbox`;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'contact-select__trigger';
    trigger.id = triggerId;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', listboxId);

    const valueEl = document.createElement('span');
    valueEl.className = 'contact-select__value';

    const iconEl = document.createElement('span');
    iconEl.className = 'contact-select__icon';
    iconEl.setAttribute('aria-hidden', 'true');

    trigger.append(valueEl, iconEl);

    const menu = document.createElement('div');
    menu.className = 'contact-select__menu';
    menu.id = listboxId;
    menu.setAttribute('role', 'listbox');

    const optionList = document.createElement('div');
    optionList.className = 'contact-select__list';
    menu.appendChild(optionList);

    const label = select.labels && select.labels[0] ? select.labels[0] : null;
    if (label) {
      label.addEventListener('click', (event) => {
        event.preventDefault();
        openMenu();
      });
    }

    const parent = select.parentNode;
    parent.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    const optionButtons = [];

    function updateState() {
      const selectedOption = select.options[select.selectedIndex];
      const hasValue = Boolean(select.value);

      valueEl.textContent = hasValue
        ? selectedOption.textContent.trim()
        : (select.options[0] ? select.options[0].textContent.trim() : 'Select an option');
      valueEl.classList.toggle('is-placeholder', !hasValue);
      trigger.classList.toggle('has-value', hasValue);
      wrapper.classList.toggle('has-value', hasValue);

      optionButtons.forEach((button) => {
        const isSelected = button.dataset.value === select.value;
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-selected', String(isSelected));
      });
    }

    function closeMenu(focusTrigger = false) {
      wrapper.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');

      if (focusTrigger) {
        trigger.focus();
      }
    }

    function openMenu() {
      if (wrapper.classList.contains('is-open')) {
        return;
      }

      contactSelectControllers.forEach((controller) => {
        if (controller.select !== select) {
          controller.close();
        }
      });

      wrapper.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');

      requestAnimationFrame(() => {
        const selectedButton =
          optionButtons.find((button) => button.classList.contains('is-selected')) ||
          optionButtons[0];

        if (selectedButton) {
          selectedButton.focus();
        }
      });
    }

    function setValue(value) {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.removeAttribute('aria-invalid');
      wrapper.classList.remove('is-invalid');
      updateState();
      closeMenu(true);
    }

    [...select.options].forEach((option, index) => {
      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'contact-select__option';
      optionButton.dataset.value = option.value;
      optionButton.setAttribute('role', 'option');
      optionButton.setAttribute('aria-selected', String(option.selected));
      optionButton.textContent = option.textContent.trim();

      if (index === 0 && !option.value) {
        optionButton.classList.add('is-placeholder');
      }

      optionButton.addEventListener('click', () => {
        setValue(option.value);
      });

      optionButton.addEventListener('keydown', (event) => {
        const currentIndex = optionButtons.indexOf(optionButton);

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          (optionButtons[currentIndex + 1] || optionButtons[0]).focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          (optionButtons[currentIndex - 1] || optionButtons[optionButtons.length - 1]).focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          optionButtons[0].focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          optionButtons[optionButtons.length - 1].focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu(true);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setValue(optionButton.dataset.value);
        }
      });

      optionList.appendChild(optionButton);
      optionButtons.push(optionButton);
    });

    trigger.addEventListener('click', () => {
      if (wrapper.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (wrapper.classList.contains('is-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      } else if (event.key === 'Escape') {
        closeMenu();
      }
    });

    wrapper.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) {
          closeMenu();
        }
      }, 0);
    });

    select.addEventListener('change', () => {
      updateState();
      wrapper.classList.remove('is-invalid');
    });
    updateState();

    contactSelectControllers.push({
      wrapper,
      select,
      trigger,
      open: openMenu,
      close: closeMenu,
      sync: updateState,
    });
  }

  contactForm.querySelectorAll('select.form-input').forEach(enhanceContactSelect);

  contactForm.addEventListener('reset', () => {
    window.setTimeout(syncContactSelectStates, 0);
  });

  document.addEventListener('click', (event) => {
    contactSelectControllers.forEach((controller) => {
      if (!controller.wrapper.contains(event.target)) {
        controller.close();
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      contactSelectControllers.forEach((controller) => controller.close());
    }
  });
}

// Lightbox Functionality
const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightboxContent');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let currentItems = [];
let currentIndex = 0;
let currentVideo = null;

// Function to pause video
function pauseCurrentVideo() {
  if (currentVideo) {
    currentVideo.pause();
    currentVideo.currentTime = 0;
    currentVideo = null;
  }
}

// Function to open lightbox
function openLightbox(items, index) {
  currentItems = items;
  currentIndex = index;
  updateLightbox();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Function to update lightbox content
function updateLightbox() {
  const item = currentItems[currentIndex];
  const isVideo = item.dataset.type === 'video';
  
  if (isVideo) {
    lightboxContent.innerHTML = `
      <video controls style="max-width: 100%; max-height: 90vh; border-radius: 10px;">
        <source src="${item.dataset.src}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
    
    // Store reference to current video
    currentVideo = lightboxContent.querySelector('video');
    currentVideo.addEventListener('play', function() {
      currentVideo = this;
    });
    
    // Auto play video
    setTimeout(() => {
      if (currentVideo) {
        currentVideo.play().catch(e => console.log('Autoplay prevented:', e));
      }
    }, 300);
  } else {
    lightboxContent.innerHTML = `
      <img src="${item.dataset.src}" alt="Lightbox Image" style="max-width: 100%; max-height: 90vh; border-radius: 10px;">
    `;
  }
}

// Function to close lightbox
function closeLightbox() {
  // Pause video if playing
  pauseCurrentVideo();
  
  lightbox.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// Function to navigate to previous item
function prevItem() {
  pauseCurrentVideo();
  currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
  updateLightbox();
}

// Function to navigate to next item
function nextItem() {
  pauseCurrentVideo();
  currentIndex = (currentIndex + 1) % currentItems.length;
  updateLightbox();
}

// Initialize lightbox if elements exist
if (lightbox && lightboxContent) {
  // Collect all clickable items
  const clickableItems = document.querySelectorAll('.video');
  
  clickableItems.forEach(item => {
    item.addEventListener('click', () => {
      // Get all items in the same section
      const section = item.closest('section');
      const items = section.querySelectorAll('.video');
      const itemArray = Array.from(items);
      const index = itemArray.indexOf(item);
      
      openLightbox(itemArray, index);
    });
  });
  
  // Lightbox controls
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', prevItem);
  if (lightboxNext) lightboxNext.addEventListener('click', nextItem);
  
  // Close lightbox on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
    if (e.key === 'ArrowLeft' && lightbox.classList.contains('active')) {
      prevItem();
    }
    if (e.key === 'ArrowRight' && lightbox.classList.contains('active')) {
      nextItem();
    }
  });
  
  // Close lightbox when clicking outside content
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
}

// Fade In on Scroll Animation
function checkScroll() {
  const sections = document.querySelectorAll('.section');
  
  sections.forEach(section => {
    const sectionTop = section.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    
    if (sectionTop < windowHeight * 0.85) {
      section.classList.add('visible');
    }
  });
}

// Initialize scroll animation after full page load to avoid forced-layout warnings
let scrollTicking = false;
let scrollAnimationInitialized = false;

function onScrollCheck() {
  if (scrollTicking) return;
  scrollTicking = true;

  requestAnimationFrame(() => {
    checkScroll();
    scrollTicking = false;
  });
}

function initScrollAnimation() {
  if (scrollAnimationInitialized) return;
  scrollAnimationInitialized = true;

  requestAnimationFrame(checkScroll);
  window.addEventListener('scroll', onScrollCheck, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimation, { once: true });
} else {
  initScrollAnimation();
}

window.addEventListener('load', checkScroll, { once: true });

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    
    // Skip if it's a link to another page
    if (href.includes('.html')) return;
    
    e.preventDefault();
    
    const targetId = this.getAttribute('href').substring(1);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  });
});

// Close mobile menu when resizing to desktop
window.addEventListener('resize', function() {
  if (window.innerWidth > 900) {
    navLinks.classList.remove('active');
    hamburgerBtn.classList.remove('active');
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }
});
// Project Submission Form Handler - UPDATED
const projectForm = document.getElementById('projectForm');
if (projectForm) {
  projectForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const name = this.querySelector('input[name="name"]').value;
    const contactMethod = this.querySelector('select[name="contactMethod"]').value;
    const projectType = this.querySelector('select[name="projectType"]').value;
    const footageLink = this.querySelector('input[name="footageLink"]').value;
    const instructions = this.querySelector('textarea[name="instructions"]').value;
    
    // Basic validation
    if (!contactMethod) {
      alert('Please select a contact method (WhatsApp or Email) so we can open the correct channel.');
      return;
    }

    // Create message body
    const emailBody = `Hello,\n\nNew project submission:\n\nClient Name: ${name}\nProject Type: ${projectType}\nRaw Footage Link: ${footageLink}\n\nSpecial Instructions:\n${instructions}\n\nPlease review this project and get back to the client.\n\nThanks!`;
    
    // Business contact destinations
    const BUSINESS_WHATSAPP = '919277072409'; // international format without '+' for wa.me
    const BUSINESS_EMAIL = 'Arvind90782@gmail.com';

    // Handle WhatsApp submission -> open business WhatsApp with pre-filled message
    if (contactMethod === 'whatsapp') {
      const whatsappMessage = encodeURIComponent(`Hello Nishant,\n\nI submitted a project:\n\nClient Name: ${name}\nProject Type: ${projectType}\nRaw Footage Link: ${footageLink}\n\nInstructions:\n${instructions}`);
      window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${whatsappMessage}`, '_blank');
      alert('Opening WhatsApp to contact Editor Nishant...');
    }

    // Handle Email submission -> open email client addressed to business
    else if (contactMethod === 'email') {
      const emailSubject = encodeURIComponent(`New Project Submission from ${name}`);
      window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${emailSubject}&body=${encodeURIComponent(emailBody)}`;
      alert('Opening your email client to message Editor Nishant...');
    }

    // Reset form after a delay
    setTimeout(() => {
      this.reset();
      // clear selection
      const methodEl = document.getElementById('contactMethod');
      if (methodEl) methodEl.value = '';
    }, 1000);
  });
}


const shortVideos = document.querySelectorAll("#videos .video");
const seeMoreBtn = document.querySelector(".see-more-btn");
const upDownICon = document.querySelector(".fa-caret-down");
const hideShow = document.querySelector(".hide-show");

let expanded = false;
const mediaQuery = window.matchMedia("(max-width: 992px)");

if (shortVideos.length && seeMoreBtn && upDownICon && hideShow) {
  function applyToggleLogic() {
    if (!mediaQuery.matches) {
      // Desktop: show all videos & hide toggle button
      shortVideos.forEach(video => {
        video.style.display = "block";
      });
      seeMoreBtn.style.display = "none";
      return;
    }

    // Mobile/Tablet: show first 3 videos by default
    seeMoreBtn.style.display = "flex";
    shortVideos.forEach((video, index) => {
      video.style.display = index < 3 ? "block" : "none";
    });

    expanded = false;
    hideShow.textContent = "See More";
    upDownICon.classList.remove("fa-caret-up");
    upDownICon.classList.add("fa-caret-down");
  }

  // Initial run
  applyToggleLogic();

  // Toggle button click
  seeMoreBtn.addEventListener("click", () => {
    if (!mediaQuery.matches) return;

    expanded = !expanded;

    shortVideos.forEach((video, index) => {
      video.style.display = expanded || index < 3 ? "block" : "none";
    });

    hideShow.textContent = expanded ? "See Less" : "See More";

    if (expanded) {
      upDownICon.classList.replace("fa-caret-down", "fa-caret-up");
    } else {
      upDownICon.classList.replace("fa-caret-up", "fa-caret-down");
    }
  });

  // Re-check on viewport change
  mediaQuery.addEventListener("change", applyToggleLogic);
}

// Client Reviews
(function initClientReviews() {
  const reviewSection = document.getElementById('reviews');
  const reviewsTrack = document.getElementById('reviewsTrack');
  const reviewAverageValue = document.getElementById('reviewAverageValue');
  const reviewCountText = document.getElementById('reviewCountText');
  const loadMoreReviewsBtn = document.getElementById('loadMoreReviewsBtn');
  const openReviewModalBtn = document.getElementById('openReviewModalBtn');
  const reviewModal = document.getElementById('reviewModal');
  const reviewForm = document.getElementById('reviewForm');
  const reviewNameInput = document.getElementById('reviewName');
  const reviewTextInput = document.getElementById('reviewText');
  const reviewRatingInput = document.getElementById('reviewRating');
  const reviewStars = document.getElementById('reviewStars');
  const reviewRatingHint = document.getElementById('reviewRatingHint');
  const reviewFormStatus = document.getElementById('reviewFormStatus');
  const reviewSubmitBtn = reviewForm ? reviewForm.querySelector('[data-review-submit]') : null;

  if (
    !reviewSection ||
    !reviewsTrack ||
    !reviewAverageValue ||
    !reviewCountText ||
    !loadMoreReviewsBtn ||
    !openReviewModalBtn ||
    !reviewModal ||
    !reviewForm ||
    !reviewNameInput ||
    !reviewTextInput ||
    !reviewRatingInput ||
    !reviewStars ||
    !reviewRatingHint ||
    !reviewFormStatus ||
    !reviewSubmitBtn
  ) {
    return;
  }

  const INITIAL_VISIBLE_REVIEWS = 3;
  const LOAD_MORE_REVIEWS = 6;
  const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const reviewState = {
    reviews: [],
    visibleCount: INITIAL_VISIBLE_REVIEWS,
    selectedRating: 5,
    observer: null,
    loading: false,
    postTimer: null,
    triggerEl: null,
  };

  const reviewStarButtons = Array.from(reviewStars.querySelectorAll('.review-star'));
  const reviewSubmitDefaultHtml = reviewSubmitBtn.innerHTML;
  const REVIEWS_ENDPOINT = '/api/reviews';
  const compactReviewsQuery = window.matchMedia('(max-width: 640px)');

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hashString(value) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 360;
    }

    return hash;
  }

  function formatReviewDate(value) {
    const parsedDate = new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return String(value || '');
    }

    return DATE_FORMATTER.format(parsedDate);
  }

  function getInitials(name) {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return '?';
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  async function readJsonResponse(response, fallbackMessage) {
    const raw = await response.text();
    const trimmed = raw.trim();

    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(fallbackMessage);
    }
  }

  function renderStarsMarkup(rating) {
    return Array.from({ length: 5 }, (_, index) => {
      const isFilled = index < rating;
      return `<span class="review-card-star${isFilled ? ' is-filled' : ''}" aria-hidden="true">&#9733;</span>`;
    }).join('');
  }

  function setReviewStatus(message = '', tone = '') {
    reviewFormStatus.textContent = message;
    reviewFormStatus.className = 'review-form__status';

    if (tone) {
      reviewFormStatus.classList.add(tone);
    }
  }

  function setReviewLoading(isLoading) {
    reviewState.loading = isLoading;
    reviewSubmitBtn.disabled = isLoading;
    reviewSubmitBtn.setAttribute('aria-busy', String(isLoading));
    reviewSubmitBtn.classList.toggle('is-loading', isLoading);
    reviewSubmitBtn.innerHTML = isLoading
      ? '<span class="button-spinner" aria-hidden="true"></span><span>Submitting...</span>'
      : reviewSubmitDefaultHtml;
  }

  function paintStars(rating) {
    reviewStarButtons.forEach((button) => {
      const starValue = Number(button.dataset.rating || '0');
      const isFilled = starValue <= rating;

      button.classList.toggle('is-filled', isFilled);
      button.setAttribute('aria-checked', String(starValue === rating));
    });
  }

  function setRating(rating, options = {}) {
    const nextRating = Math.max(1, Math.min(5, Number(rating) || 5));
    reviewState.selectedRating = nextRating;
    reviewRatingInput.value = String(nextRating);
    paintStars(nextRating);

    if (options.updateHint !== false) {
      reviewRatingHint.textContent = `${nextRating} star${nextRating === 1 ? '' : 's'} selected.`;
    }
  }

  function previewRating(rating) {
    const nextRating = Math.max(1, Math.min(5, Number(rating) || 5));
    paintStars(nextRating);
  }

  function commitCurrentRating() {
    setRating(reviewState.selectedRating, { updateHint: false });
  }

  function isCompactReviewsLayout() {
    return compactReviewsQuery.matches;
  }

  function scrollReviewsToStart(behavior = 'auto') {
    if (typeof reviewsTrack.scrollTo === 'function') {
      reviewsTrack.scrollTo({
        left: 0,
        behavior,
      });
      return;
    }

    reviewsTrack.scrollLeft = 0;
  }

  function scrollReviewCardIntoView(index, behavior = 'smooth') {
    const targetCard = reviewsTrack.children[index];

    if (!targetCard) {
      scrollReviewsToStart(behavior);
      return;
    }

    if (typeof targetCard.scrollIntoView === 'function') {
      targetCard.scrollIntoView({
        behavior,
        block: 'nearest',
        inline: 'start',
      });
      return;
    }

    scrollReviewsToStart(behavior);
  }

  function observeReviewCard(card) {
    if (!card) {
      return;
    }

    if (reviewState.observer) {
      reviewState.observer.observe(card);
      return;
    }

    card.classList.add('is-visible');
  }

  function createReviewCard(review, index) {
    const card = document.createElement('article');
    const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
    const name = String(review.name || '').trim();
    const text = String(review.review || '').trim();
    const hue = (hashString(name) + index * 23) % 360;

    card.className = 'review-card';
    card.setAttribute('role', 'listitem');
    card.style.setProperty('--review-hue', String(hue));
    card.innerHTML = `
      <div class="review-card__top">
        <div class="review-card__avatar" aria-hidden="true">${escapeHtml(getInitials(name))}</div>
        <div class="review-card__head">
          <h3 class="review-card__name">${escapeHtml(name)}</h3>
          <p class="review-card__date">${escapeHtml(formatReviewDate(review.date))}</p>
        </div>
      </div>
      <div class="review-card__rating" aria-label="${rating} out of 5 stars">
        ${renderStarsMarkup(rating)}
      </div>
      <p class="review-card__text">${escapeHtml(text).replace(/\n/g, '<br>')}</p>
    `;

    return card;
  }

  function createMessageCard(title, message) {
    const card = document.createElement('article');
    card.className = 'review-card review-card--empty is-visible';
    card.setAttribute('role', 'status');
    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    `;
    return card;
  }

  function updateSummary() {
    const totalReviews = reviewState.reviews.length;

    if (!totalReviews) {
      reviewAverageValue.textContent = '0.0';
      reviewCountText.textContent = 'Based on 0 reviews';
      return;
    }

    const totalRating = reviewState.reviews.reduce((sum, review) => {
      return sum + Math.max(1, Math.min(5, Number(review.rating) || 0));
    }, 0);
    const average = totalRating / totalReviews;

    reviewAverageValue.textContent = average.toFixed(1);
    reviewCountText.textContent = totalReviews === 1
      ? 'Based on 1 review'
      : `Based on ${totalReviews} reviews`;
  }

  function refreshLoadMoreButton() {
    if (!loadMoreReviewsBtn) {
      return;
    }

    const totalReviews = reviewState.reviews.length;
    const canToggle = totalReviews > INITIAL_VISIBLE_REVIEWS;

    loadMoreReviewsBtn.hidden = !canToggle;

    if (!canToggle) {
      return;
    }

    const isExpanded = reviewState.visibleCount >= totalReviews;
    loadMoreReviewsBtn.textContent = isExpanded ? 'See Less Reviews' : 'See More Reviews';
    loadMoreReviewsBtn.setAttribute('aria-expanded', String(isExpanded));
  }

  function renderReviews(options = {}) {
    const preserveScroll = Boolean(options.preserveScroll);
    const scrollLeft = preserveScroll ? reviewsTrack.scrollLeft : 0;
    const visibleReviews = reviewState.reviews.slice(0, reviewState.visibleCount);

    reviewsTrack.innerHTML = '';

    if (!visibleReviews.length) {
      reviewsTrack.appendChild(
        createMessageCard(
          'No reviews yet',
          'Be the first to share your experience.'
        )
      );
    } else {
      visibleReviews.forEach((review, index) => {
        const card = createReviewCard(review, index);
        reviewsTrack.appendChild(card);
        observeReviewCard(card);
      });
    }

    updateSummary();
    refreshLoadMoreButton();

    if (preserveScroll) {
      window.requestAnimationFrame(() => {
        reviewsTrack.scrollLeft = scrollLeft;
      });
    }
  }

  function renderLoadingState() {
    reviewsTrack.innerHTML = '';
    reviewsTrack.appendChild(
      createMessageCard('Loading reviews', 'Fetching the latest client feedback...')
    );
    reviewAverageValue.textContent = '0.0';
    reviewCountText.textContent = 'Loading reviews...';
    refreshLoadMoreButton();
  }

  function applyServerReviews(reviews) {
    reviewState.reviews = Array.isArray(reviews) ? reviews : [];
    reviewState.visibleCount = Math.min(INITIAL_VISIBLE_REVIEWS, reviewState.reviews.length);
    renderReviews();
  }

  function openReviewModal() {
    reviewState.triggerEl = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : openReviewModalBtn;

    if (reviewState.postTimer) {
      window.clearTimeout(reviewState.postTimer);
      reviewState.postTimer = null;
    }

    reviewModal.classList.add('is-open');
    reviewModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('review-modal-open');
    reviewForm.reset();
    reviewState.selectedRating = 5;
    reviewRatingInput.value = '5';
    setRating(5);
    setReviewStatus('');

    window.requestAnimationFrame(() => {
      reviewNameInput.focus();
    });
  }

  function closeReviewModal() {
    if (reviewState.postTimer) {
      window.clearTimeout(reviewState.postTimer);
      reviewState.postTimer = null;
    }

    reviewModal.classList.remove('is-open');
    reviewModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('review-modal-open');
    reviewForm.reset();
    reviewState.selectedRating = 5;
    reviewRatingInput.value = '5';
    setRating(5);
    setReviewStatus('');

    if (reviewState.triggerEl && typeof reviewState.triggerEl.focus === 'function') {
      reviewState.triggerEl.focus();
    } else {
      openReviewModalBtn.focus();
    }
  }

  function addSubmittedReview(review) {
    reviewState.reviews.unshift(review);
    renderReviews({ preserveScroll: !isCompactReviewsLayout() });

    if (isCompactReviewsLayout()) {
      scrollReviewsToStart('auto');
    }
  }

  reviewStarButtons.forEach((button) => {
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');

    button.addEventListener('mouseenter', () => {
      previewRating(button.dataset.rating);
    });

    button.addEventListener('focus', () => {
      previewRating(button.dataset.rating);
    });

    button.addEventListener('click', () => {
      setRating(button.dataset.rating);
    });
  });

  reviewStars.addEventListener('mouseleave', commitCurrentRating);
  reviewStars.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!reviewStars.contains(document.activeElement)) {
        commitCurrentRating();
      }
    }, 0);
  });

  reviewStars.addEventListener('keydown', (event) => {
    const activeButton = event.target.closest('.review-star');

    if (!activeButton) {
      return;
    }

    const currentRating = Number(activeButton.dataset.rating || reviewState.selectedRating);

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextRating = Math.min(5, currentRating + 1);
      setRating(nextRating);
      reviewStars.querySelector(`.review-star[data-rating="${nextRating}"]`)?.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextRating = Math.max(1, currentRating - 1);
      setRating(nextRating);
      reviewStars.querySelector(`.review-star[data-rating="${nextRating}"]`)?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setRating(1);
      reviewStars.querySelector('.review-star[data-rating="1"]')?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      setRating(5);
      reviewStars.querySelector('.review-star[data-rating="5"]')?.focus();
    }
  });

  loadMoreReviewsBtn.addEventListener('click', () => {
    const totalReviews = reviewState.reviews.length;
    const previousVisibleCount = reviewState.visibleCount;
    const isExpanded = previousVisibleCount >= totalReviews;

    if (isExpanded) {
      reviewState.visibleCount = Math.min(INITIAL_VISIBLE_REVIEWS, totalReviews);
    } else {
      reviewState.visibleCount = Math.min(
        previousVisibleCount + LOAD_MORE_REVIEWS,
        totalReviews
      );
    }

    renderReviews({ preserveScroll: !isCompactReviewsLayout() });

    if (isCompactReviewsLayout()) {
      window.requestAnimationFrame(() => {
        if (isExpanded) {
          scrollReviewsToStart('auto');
        } else {
          scrollReviewCardIntoView(previousVisibleCount, 'smooth');
        }
      });
    }
  });

  openReviewModalBtn.addEventListener('click', openReviewModal);

  reviewModal.addEventListener('click', (event) => {
    if (event.target === reviewModal || event.target.closest('[data-review-modal-close]')) {
      closeReviewModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && reviewModal.classList.contains('is-open')) {
      closeReviewModal();
    }
  });

  reviewForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      reviewState.selectedRating = 5;
      reviewRatingInput.value = '5';
      setRating(5);
      setReviewStatus('');
    }, 0);
  });

  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (reviewState.loading) {
      return;
    }

    const name = reviewNameInput.value.trim();
    const reviewText = reviewTextInput.value.trim();
    const rating = Number(reviewRatingInput.value || reviewState.selectedRating);

    if (!name) {
      setReviewStatus('Name cannot be empty.', 'error');
      reviewNameInput.focus();
      return;
    }

    if (reviewText.length < 10) {
      setReviewStatus('Review must be at least 10 characters.', 'error');
      reviewTextInput.focus();
      return;
    }

    if (reviewText.length > 300) {
      setReviewStatus('Review must be 300 characters or less.', 'error');
      reviewTextInput.focus();
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setReviewStatus('Please choose a star rating.', 'error');
      return;
    }

    setReviewStatus('');
    setReviewLoading(true);

    try {
      const response = await fetch(REVIEWS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          rating,
          review: reviewText,
        }),
      });

      const responseData = await readJsonResponse(
        response,
        response.ok
          ? 'Unexpected review response from the server.'
          : 'Unable to save your review.'
      );

      if (!response.ok) {
        throw new Error((responseData && responseData.error) || 'Unable to save your review.');
      }

      const createdReview =
        responseData && typeof responseData.review === 'object' && responseData.review !== null
          ? responseData.review
          : responseData;

      if (!createdReview || typeof createdReview !== 'object') {
        throw new Error('Unable to save your review.');
      }

      addSubmittedReview(createdReview);
      await loadReviews({
        preserveVisibleCount: true,
        preserveScroll: !isCompactReviewsLayout(),
        showLoadingState: false,
      });

      if (isCompactReviewsLayout()) {
        scrollReviewsToStart('auto');
      }

      setReviewStatus('Review posted successfully.', 'success');

      if (reviewState.postTimer) {
        window.clearTimeout(reviewState.postTimer);
      }

      reviewState.postTimer = window.setTimeout(() => {
        reviewState.postTimer = null;
        closeReviewModal();
      }, 700);
    } catch (error) {
      setReviewStatus(error.message || 'Unable to save your review.', 'error');
    } finally {
      setReviewLoading(false);
    }
  });

  async function loadReviews(options = {}) {
    const showLoadingState = options.showLoadingState !== false;

    if (showLoadingState) {
      renderLoadingState();
    }

    try {
      const response = await fetch(REVIEWS_ENDPOINT, {
        cache: 'no-store',
      });

      const payload = await readJsonResponse(
        response,
        response.ok
          ? 'Unexpected reviews response from the server.'
          : 'Unable to load reviews.'
      );

      if (!response.ok) {
        throw new Error((payload && payload.error) || 'Unable to load reviews.');
      }

      const reviews = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.reviews)
          ? payload.reviews
          : [];

      if (options.preserveVisibleCount) {
        const previousVisibleCount = reviewState.visibleCount;
        reviewState.reviews = Array.isArray(reviews) ? reviews : [];
        reviewState.visibleCount = Math.min(
          Math.max(previousVisibleCount, INITIAL_VISIBLE_REVIEWS),
          reviewState.reviews.length
        );
        renderReviews({ preserveScroll: Boolean(options.preserveScroll) });
      } else {
        applyServerReviews(reviews);
      }
    } catch (error) {
      console.error('[reviews] load failed:', error);
      if (showLoadingState) {
        reviewsTrack.innerHTML = '';
        reviewsTrack.appendChild(
          createMessageCard(
            'Reviews unavailable',
            error.message || 'Unable to load reviews right now.'
          )
        );
        reviewAverageValue.textContent = '0.0';
        reviewCountText.textContent = 'Based on 0 reviews';
        loadMoreReviewsBtn.hidden = true;
      } else {
        setReviewStatus(error.message || 'Unable to refresh reviews right now.', 'error');
      }
    }
  }

  function createObserver() {
    if (!('IntersectionObserver' in window)) {
      return null;
    }

    return new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -5% 0px',
      }
    );
  }

  reviewState.observer = createObserver();
  refreshLoadMoreButton();

  loadReviews({ showLoadingState: false });
})();

(() => {
  const scrollBox = document.getElementById('softwareScroll');
  const prevButton = document.getElementById('softwareNavPrev');
  const nextButton = document.getElementById('softwareNavNext');
  const softwareCards = Array.from(scrollBox ? scrollBox.querySelectorAll('.software-card') : []);

  if (!scrollBox || !prevButton || !nextButton) {
    return;
  }

  function getScrollBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function getCardStep() {
    const firstCard = scrollBox.querySelector('.software-card');

    if (!firstCard) {
      return Math.max(scrollBox.clientWidth * 0.8, 180);
    }

    const styles = window.getComputedStyle(scrollBox);
    const gap = parseFloat(styles.columnGap || styles.gap || '0');
    const cardWidth = firstCard.getBoundingClientRect().width + gap;
    const visibleCards = Math.max(1, Math.round(scrollBox.clientWidth / cardWidth));

    return Math.max(cardWidth, cardWidth * Math.max(1, visibleCards - 1));
  }

  function updateNavState() {
    const maxScrollLeft = Math.max(0, scrollBox.scrollWidth - scrollBox.clientWidth);
    const atStart = scrollBox.scrollLeft <= 6;
    const atEnd = scrollBox.scrollLeft >= maxScrollLeft - 6;

    prevButton.disabled = atStart;
    nextButton.disabled = atEnd;
    prevButton.setAttribute('aria-disabled', String(atStart));
    nextButton.setAttribute('aria-disabled', String(atEnd));
  }

  function scrollSoftware(direction) {
    scrollBox.scrollBy({
      left: getCardStep() * direction,
      behavior: getScrollBehavior(),
    });
  }

  prevButton.addEventListener('click', () => {
    scrollSoftware(-1);
  });

  nextButton.addEventListener('click', () => {
    scrollSoftware(1);
  });

  scrollBox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollSoftware(1);
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollSoftware(-1);
    }
  });

  let isDragging = false;
  let activePointerId = null;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;

  function stopDragging(pointerId) {
    if (!isDragging || (pointerId !== null && pointerId !== activePointerId)) {
      return;
    }

    isDragging = false;
    scrollBox.classList.remove('is-dragging');

    if (activePointerId !== null && typeof scrollBox.releasePointerCapture === 'function') {
      try {
        scrollBox.releasePointerCapture(activePointerId);
      } catch (error) {
        /* Ignore release errors when the pointer is already gone. */
      }
    }

    activePointerId = null;
  }

  scrollBox.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    isDragging = true;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScrollLeft = scrollBox.scrollLeft;
    scrollBox.classList.add('is-dragging');
    softwareCards.forEach((card) => {
      card.classList.remove('is-tilting');
      card.style.removeProperty('--software-card-rotate-x');
      card.style.removeProperty('--software-card-rotate-y');
      card.style.removeProperty('--software-icon-rotate-x');
      card.style.removeProperty('--software-icon-rotate-y');
      card.style.removeProperty('--software-icon-shift-x');
      card.style.removeProperty('--software-icon-shift-y');
    });

    if (typeof scrollBox.setPointerCapture === 'function') {
      scrollBox.setPointerCapture(event.pointerId);
    }
  });

  scrollBox.addEventListener('pointermove', (event) => {
    if (!isDragging || event.pointerId !== activePointerId) {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    scrollBox.scrollLeft = dragStartScrollLeft - deltaX;
  });

  scrollBox.addEventListener('pointerup', (event) => {
    stopDragging(event.pointerId);
  });

  scrollBox.addEventListener('pointercancel', (event) => {
    stopDragging(event.pointerId);
  });

  scrollBox.addEventListener('lostpointercapture', () => {
    stopDragging(null);
  });

  scrollBox.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });

  let navUpdateFrame = 0;

  function scheduleNavUpdate() {
    if (navUpdateFrame) {
      return;
    }

    navUpdateFrame = window.requestAnimationFrame(() => {
      navUpdateFrame = 0;
      updateNavState();
    });
  }

  scrollBox.addEventListener('scroll', scheduleNavUpdate, { passive: true });
  window.addEventListener('resize', updateNavState, { passive: true });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => {
      updateNavState();
    });

    resizeObserver.observe(scrollBox);
  }

  const tiltMediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function tiltEnabled() {
    return tiltMediaQuery.matches && !reducedMotionQuery.matches;
  }

  function resetCardTilt(card) {
    card.classList.remove('is-tilting');
    card.style.removeProperty('--software-card-rotate-x');
    card.style.removeProperty('--software-card-rotate-y');
    card.style.removeProperty('--software-icon-rotate-x');
    card.style.removeProperty('--software-icon-rotate-y');
    card.style.removeProperty('--software-icon-shift-x');
    card.style.removeProperty('--software-icon-shift-y');
  }

  function enableCardTilt(card, event) {
    if (!tiltEnabled() || scrollBox.classList.contains('is-dragging')) {
      resetCardTilt(card);
      return;
    }

    const bounds = card.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;
    const ratioX = offsetX / bounds.width - 0.5;
    const ratioY = offsetY / bounds.height - 0.5;
    const rotateX = -ratioY * 10;
    const rotateY = ratioX * 12;

    card.classList.add('is-tilting');
    card.style.setProperty('--software-card-rotate-x', `${rotateX.toFixed(2)}deg`);
    card.style.setProperty('--software-card-rotate-y', `${rotateY.toFixed(2)}deg`);
    card.style.setProperty('--software-icon-rotate-x', `${(rotateX * 1.45).toFixed(2)}deg`);
    card.style.setProperty('--software-icon-rotate-y', `${(rotateY * 1.45).toFixed(2)}deg`);
    card.style.setProperty('--software-icon-shift-x', `${(ratioX * 10).toFixed(2)}px`);
    card.style.setProperty('--software-icon-shift-y', `${(ratioY * 8).toFixed(2)}px`);
  }

  softwareCards.forEach((card) => {
    let frameId = 0;
    let lastEvent = null;

    function scheduleTilt(event) {
      lastEvent = event;

      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;

        if (lastEvent) {
          enableCardTilt(card, lastEvent);
        }
      });
    }

    card.addEventListener('mousemove', scheduleTilt);
    card.addEventListener('mouseenter', scheduleTilt);
    card.addEventListener('mouseleave', () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }

      lastEvent = null;
      resetCardTilt(card);
    });
  });

  const handleTiltModeChange = () => {
    if (!tiltEnabled()) {
      softwareCards.forEach(resetCardTilt);
    }
  };

  if (typeof tiltMediaQuery.addEventListener === 'function') {
    tiltMediaQuery.addEventListener('change', handleTiltModeChange);
  } else if (typeof tiltMediaQuery.addListener === 'function') {
    tiltMediaQuery.addListener(handleTiltModeChange);
  }

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', handleTiltModeChange);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(handleTiltModeChange);
  }

  updateNavState();
})();
