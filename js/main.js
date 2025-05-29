// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.createElement('button');
    mobileMenuToggle.className = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = '<span></span><span></span><span></span>';
    
    const header = document.querySelector('.site-header .container');
    if (header) {
        header.insertBefore(mobileMenuToggle, header.firstChild);
        
        const mainNav = document.querySelector('.main-nav');
        
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#!') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                window.scrollTo({
                    top: targetElement.offsetTop - 100, // Adjust for fixed header
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const mainNav = document.querySelector('.main-nav');
                const mobileToggle = document.querySelector('.mobile-menu-toggle');
                if (mainNav && mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    mobileToggle.classList.remove('active');
                }
            }
        });
    });
    
    // Sticky header
    const siteHeader = document.querySelector('.site-header');
    let lastScroll = 0;
    
    if (siteHeader) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                siteHeader.classList.remove('scroll-up');
                return;
            }
            
            if (currentScroll > lastScroll && !siteHeader.classList.contains('scroll-down')) {
                // Scroll down
                siteHeader.classList.remove('scroll-up');
                siteHeader.classList.add('scroll-down');
            } else if (currentScroll < lastScroll && siteHeader.classList.contains('scroll-down')) {
                // Scroll up
                siteHeader.classList.remove('scroll-down');
                siteHeader.classList.add('scroll-up');
            }
            
            lastScroll = currentScroll;
        });
    }
    
    // Add active class to current navigation link
    const sections = document.querySelectorAll('section[id]');
    
    if (sections.length > 0) {
        window.addEventListener('scroll', () => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                    current = section.getAttribute('id');
                }
            });
            
            document.querySelectorAll('.main-nav a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }
    
    // Form validation for tour booking
    const tourForm = document.getElementById('tour-form');
    if (tourForm) {
        tourForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simple validation
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const date = document.getElementById('date').value;
            const guests = document.getElementById('guests').value;
            
            if (!name || !email || !date || !guests) {
                alert('Please fill in all required fields.');
                return;
            }
            
            if (!isValidEmail(email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            // If validation passes, show success message
            alert('Thank you for your booking! We will contact you shortly to confirm your tour.');
            tourForm.reset();
        });
    }
    
    // Email validation helper function
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }
    
    // Add animation class to elements when they come into view
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                element.classList.add('animate');
            }
        });
    };
    
    window.addEventListener('scroll', animateOnScroll);
    window.addEventListener('load', animateOnScroll);
});
