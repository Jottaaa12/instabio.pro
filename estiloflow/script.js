document.addEventListener('DOMContentLoaded', () => {

    // --- CACHE SELECTORS --- //
    const cursor = document.querySelector('.custom-cursor');
    const header = document.querySelector('header');
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const ctaButton = document.getElementById('cta-button');
    const ctaSuccessMessage = document.getElementById('cta-success-message');
    const hoverableElements = document.querySelectorAll('[data-hoverable="true"]');
    const subtitleElement = document.getElementById('subtitle');
    const popup = document.getElementById('popup-banner');
    const closeButton = document.getElementById('close-popup');

    // --- CONFIGURATION --- //
    const subtitleText = "Domine seu estilo.";
    const typingSpeed = 70; // ms

    // --- FUNCTIONS --- //

    /**
     * 1. Custom Cursor Logic
     * Moves the custom cursor and handles hover states.
     */
    function setupCustomCursor() {
        if (!cursor) return;

        window.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        hoverableElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
        });
    }

    /**
     * 2. Header Scroll Effect
     * Adds a 'scrolled' class to the header on scroll.
     */
    function setupHeaderScroll() {
        if (!header) return;

        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    /**
     * 3. Scroll Animations
     * Fades in elements when they enter the viewport.
     */
    function setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach(element => observer.observe(element));
    }

    /**
     * 4. Hero Subtitle Typing Effect
     * Animates the subtitle with a typing effect.
     */
    function typeSubtitle() {
        if (!subtitleElement) return;
        let i = 0;
        subtitleElement.innerHTML = ""; // Clear initial text
        function type() {
            if (i < subtitleText.length) {
                subtitleElement.innerHTML += subtitleText.charAt(i);
                i++;
                setTimeout(type, typingSpeed);
            }
        }
        // Start typing after a short delay for better effect
        setTimeout(type, 500);
    }

    /**
     * 5. CTA Button Logic
     * Handles the ripple effect and success message.
     */
    function setupCtaButton() {
        if (!ctaButton || !ctaSuccessMessage) return;

        ctaButton.addEventListener('click', function (e) {
            // Ripple effect
            const rect = ctaButton.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;
            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);

            // Success message logic
            ctaButton.style.opacity = '0';
            ctaButton.style.pointerEvents = 'none';
            ctaSuccessMessage.style.opacity = '1';
        });
    }

    /**
     * 6. Popup Banner Logic
     */
    function setupPopupBanner() {
        if (!popup || !closeButton) return;

        // Show popup after 10 seconds
        setTimeout(() => {
            popup.classList.add('show');
        }, 10000);

        // Close popup when close button is clicked
        closeButton.addEventListener('click', () => {
            popup.classList.remove('show');
        });

        // Close popup when clicking on the overlay
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.classList.remove('show');
            }
        });
    }

    // --- INITIALIZE --- //
    setupCustomCursor();
    setupHeaderScroll();
    setupScrollAnimations();
    typeSubtitle();
    setupCtaButton();
    setupPopupBanner();
});