/* script.js
   GSAP-powered site interactions (loader, transitions, scroll reveals, gallery/lightbox,
   file preview, video hover/tap autoplay, form popup, back-to-top).
   Mobile-friendly: disables heavy effects on low-power or small screens.
*/

/* ============== Configuration ============== */
const CONFIG = {
  loaderSelector: "#siteLoader",      // create in HTML if you want loader (see notes)
  backToTopSelector: "#backToTop",    // auto-created if not present
  minWidthForHoverEffects: 980,       // don't use hover autoplay on narrow screens
  scrollTriggerDisableWidth: 700,     // disable scroll-triggered opts below this width
  filePreviewSelector: ".file-upload",// container around file input
  gallerySelector: ".gallery",        // gallery container
  lightboxClass: "sg-lightbox",       // class for lightbox element
  popupSelector: "#successPopup",     // contact success/error popup
  fadeDuration: 0.45
};

/* ============== Utilities ============== */
const isTouch = (() => {
  return (("ontouchstart" in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
})();

const supportsPassive = (() => {
  let passive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function() { passive = true; }
    });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
  } catch (e) {}
  return passive;
})();

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
function throttle(fn, wait = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/* ============== Loader ==============
   Optional loader element. If you want the rotating gear loader,
   add this markup near top of <body> in your HTML:

   <div id="siteLoader" class="site-loader">
     <div class="loader-gear" aria-hidden="true"></div>
   </div>

   And include loader styles in style.css (I can provide them if you'd like).
*/
function initLoader() {
  const sel = CONFIG.loaderSelector;
  const loader = document.querySelector(sel);
  if (!loader) return;

  // simple fade out once page fully loaded
  window.addEventListener("load", () => {
    gsap.to(loader, { opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => loader.remove() });
  });

  // fallback: hide after 4s max
  setTimeout(() => {
    if (document.body.contains(loader)) {
      gsap.to(loader, { opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => loader.remove() });
    }
  }, 4000);
}

/* ============== Page transition (links) ============== */
function initPageTransitions() {
  // all internal links (ignore external / mailto / tel / hash anchors)
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    // ignore if anchor link or external
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    // allow same-page anchors
    const isExternal = (new URL(href, location.href)).origin !== location.origin;
    if (isExternal) return;

    a.addEventListener('click', (e) => {
      // left click only, avoid ctrl/meta click
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const target = a.href;
      // short fade
      gsap.to(document.documentElement, {
        opacity: 0,
        duration: CONFIG.fadeDuration,
        ease: "power2.inOut",
        onComplete: () => window.location = target
      });
    });
  });
  // fade in on load
  gsap.fromTo(document.documentElement, { opacity: 0 }, { opacity: 1, duration: CONFIG.fadeDuration, ease: "power2.out" });
}

/* ============== Scroll-triggered reveals (GSAP ScrollTrigger) ============== */
function initScrollReveals() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  // Disable on small screens for performance
  if (window.innerWidth <= CONFIG.scrollTriggerDisableWidth) {
    ScrollTrigger.disable();
    return;
  }
  gsap.utils.toArray('.reveal, .fade-in, .reveal-up').forEach(el => {
    gsap.fromTo(el, { y: 30, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });
}

/* ============== Gallery lightbox (image + video) ============== */
function createLightbox() {
  // single DOM element for lightbox
  if (document.querySelector('.' + CONFIG.lightboxClass)) return;
  const lb = document.createElement('div');
  lb.className = CONFIG.lightboxClass;
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:2000;opacity:0;pointer-events:none;';
  lb.innerHTML = `
    <div class="lb-inner" style="max-width:95%;max-height:95%;position:relative">
      <button class="lb-close" aria-label="Close" style="position:absolute;right:-8px;top:-8px;background:var(--primary);border-radius:50%;width:44px;height:44px;border:none;cursor:pointer;font-weight:700">✕</button>
      <div class="lb-content" style="max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center"></div>
    </div>`;
  document.body.appendChild(lb);

  // close handlers
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });
  lb.querySelector('.lb-close').addEventListener('click', closeLightbox);

  function openLightbox(contentEl) {
    const contentWrap = lb.querySelector('.lb-content');
    contentWrap.innerHTML = '';
    contentWrap.appendChild(contentEl);
    // show
    lb.style.pointerEvents = 'auto';
    gsap.to(lb, { opacity: 1, duration: 0.35, ease: "power2.out" });
    // trap touchmove
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    gsap.to(lb, { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => {
      lb.querySelector('.lb-content').innerHTML = '';
      lb.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }});
  }

  return { openLightbox, closeLightbox };
}

function initGalleryLightbox() {
  const gallery = document.querySelector(CONFIG.gallerySelector);
  if (!gallery) return;
  const lb = createLightbox();
  gallery.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // if it contains a video tag, clone & play it; else show image
      const vid = item.querySelector('video');
      const img = item.querySelector('img');
      if (vid) {
        // clone video to avoid moving original
        const v = document.createElement('video');
        v.src = vid.currentSrc || vid.querySelector('source')?.src || vid.src;
        v.controls = true;
        v.autoplay = true;
        v.muted = false;
        v.style.maxWidth = '100%';
        v.style.maxHeight = '100%';
        lb.openLightbox(v);
      } else if (img) {
        const i = document.createElement('img');
        i.src = img.src;
        i.alt = img.alt || '';
        i.style.maxWidth = '100%';
        i.style.maxHeight = '100%';
        lb.openLightbox(i);
      }
    });
  });
}

/* ============== Video hover/tap autoplay ============== */
function initVideoAutoplay() {
  // Desktop: hover plays; Mobile: tap toggles play
  const videoItems = document.querySelectorAll('.gallery-item video');
  if (!videoItems.length) return;

  videoItems.forEach(video => {
    // make sure muted for autoplay on most browsers
    video.muted = true;
    video.preload = 'metadata';

    if (!isTouch && window.innerWidth >= CONFIG.minWidthForHoverEffects) {
      // hover behaviors
      video.addEventListener('mouseenter', () => {
        video.play().catch(()=>{/* silent */});
      });
      video.addEventListener('mouseleave', () => {
        video.pause();
        try { video.currentTime = 0; } catch(e) {}
      });
    } else {
      // mobile/touch: add tap-to-play toggle
      video.addEventListener('click', (e) => {
        if (video.paused) {
          // mute for autoplay; toggle unmute if you want user to hear
          video.play().catch(()=>{/* silent */});
        } else {
          video.pause();
        }
      }, supportsPassive ? { passive: true } : false);
    }
  });
}

/* ============== File Upload Preview (image thumbnail + name) ============== */
function initFilePreview() {
  const containers = document.querySelectorAll(CONFIG.filePreviewSelector);
  if (!containers.length) return;

  containers.forEach(container => {
    const input = container.querySelector('input[type="file"]');
    const preview = container.querySelector('.file-preview') || document.createElement('div');
    preview.className = 'file-preview';
    preview.style.marginTop = '8px';
    if (!container.contains(preview)) container.appendChild(preview);

    input?.addEventListener('change', (e) => {
      preview.innerHTML = '';
      const file = e.target.files[0];
      if (!file) return;
      const name = document.createElement('div');
      name.innerHTML = `<strong>${escapeHtml(file.name)}</strong> — ${Math.round(file.size/1024)} KB`;
      preview.appendChild(name);

      // If it's an image, render a small thumbnail (client-side)
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.style.maxWidth = '160px';
        img.style.maxHeight = '120px';
        img.style.display = 'block';
        img.style.marginTop = '8px';
        img.alt = file.name;
        preview.appendChild(img);

        const reader = new FileReader();
        reader.onload = function(ev) {
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  });
}
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<"'>]/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]); });
}

/* ============== Form success/error popup (reads ?sent=1 or ?error=1) ============== */
function initFormPopup() {
  const params = new URLSearchParams(window.location.search);
  const popup = document.querySelector(CONFIG.popupSelector);
  if (!popup) return;
  if (params.get('sent') === '1') {
    popup.textContent = 'Message sent — thanks!';
    popup.classList.add('show');
    gsap.fromTo(popup, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "power2.out" });
    setTimeout(() => {
      gsap.to(popup, { y: 10, autoAlpha: 0, duration: 0.45, ease: "power2.in", onComplete: () => popup.classList.remove('show') });
      history.replaceState({}, document.title, location.pathname);
    }, 4200);
  } else if (params.get('error') === '1') {
    popup.textContent = 'Error sending message — please try again.';
    popup.style.background = 'linear-gradient(90deg,#ff6b6b,#ff3b3b)';
    popup.classList.add('show');
    gsap.fromTo(popup, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "power2.out" });
    setTimeout(() => {
      gsap.to(popup, { y: 10, autoAlpha: 0, duration: 0.45, ease: "power2.in", onComplete: () => {
        popup.classList.remove('show');
        popup.style.background = '';
      }});
      history.replaceState({}, document.title, location.pathname);
    }, 4200);
  }
}

/* ============== Back to Top Button ============== */
function initBackToTop() {
  let btn = document.querySelector(CONFIG.backToTopSelector);
  if (!btn) {
    btn = document.createElement('button');
    btn.id = CONFIG.backToTopSelector.replace('#','');
    btn.innerHTML = "↑";
    btn.setAttribute('aria-label', 'Back to top');
    btn.style.cssText = 'position:fixed;right:18px;bottom:18px;background:var(--primary);border:none;color:#111;padding:10px 12px;border-radius:50%;box-shadow:0 10px 30px rgba(0,0,0,0.4);cursor:pointer;display:none;z-index:1500;font-weight:700';
    document.body.appendChild(btn);
  }
  const showAt = 320;
  const onScroll = throttle(() => {
    if (window.scrollY > showAt) {
      if (btn.style.display === 'none' || getComputedStyle(btn).display === 'none') {
        btn.style.display = 'block';
        gsap.fromTo(btn, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35 });
      }
    } else {
      if (btn.style.display !== 'none') {
        gsap.to(btn, { autoAlpha: 0, y: 10, duration: 0.25, onComplete: () => btn.style.display = 'none' });
      }
    }
  }, 150);
  window.addEventListener('scroll', onScroll, supportsPassive ? { passive: true } : false);
  btn.addEventListener('click', () => {
    gsap.to(window, { scrollTo: 0, duration: 0.6, ease: "power2.out" });
  });
}

/* ============== Init: run everything ============== */
function initAll() {
  // register ScrollTrigger plugin if available
  if (typeof gsap !== "undefined" && typeof gsap.registerPlugin === "function" && typeof ScrollTrigger !== "undefined") {
    try { gsap.registerPlugin(ScrollTrigger); } catch (e) { /* ignore */ }
  }

  initLoader();
  initPageTransitions();
  initScrollReveals();
  initGalleryLightbox();
  initVideoAutoplay();
  initFilePreview();
  initFormPopup();
  initBackToTop();
}

/* Run when DOM is ready */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}
