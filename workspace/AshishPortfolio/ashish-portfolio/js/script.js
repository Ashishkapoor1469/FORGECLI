// script.js - Simple interactivity for the portfolio

/**
 * Enable smooth scrolling for internal navigation links.
 * Looks for <a> tags with href attributes that start with "#".
 */
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', event => {
            // Only handle same-page hash links
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                event.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
                // Optionally update the URL hash without jumping
                history.pushState(null, '', `#${targetId}`);
            }
        });
    });
});