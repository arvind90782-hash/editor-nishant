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

// Form submission for mailto form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const name = this.querySelector('input[name="name"]').value;
    const subject = this.querySelector('input[name="subject"]').value;
    const message = this.querySelector('textarea[name="message"]').value;
    
    // Create mailto link
    const emailBody = `Name: ${name}%0D%0A%0D%0AMessage:%0D%0A${message}`;
    
    // Open default email client
    window.location.href = `mailto:Arvind90782@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Show confirmation
    alert('Opening your email client... Please send the pre-filled email to contact us.');
    
    // Reset form after a delay
    setTimeout(() => {
      this.reset();
    }, 1000);
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

window.addEventListener('load', initScrollAnimation);

// If page is already fully loaded (e.g. bfcache), initialize immediately.
if (document.readyState === 'complete') {
  initScrollAnimation();
}

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
      alert('Opening WhatsApp to contact Edito Grapher...');
    }

    // Handle Email submission -> open email client addressed to business
    else if (contactMethod === 'email') {
      const emailSubject = encodeURIComponent(`New Project Submission from ${name}`);
      window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${emailSubject}&body=${encodeURIComponent(emailBody)}`;
      alert('Opening your email client to message Edito Grapher...');
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
