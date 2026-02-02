

document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.getElementById('officers-carousel');
    const prevBtn = document.getElementById('officers-prev');
    const nextBtn = document.getElementById('officers-next');
    
    if (!carousel || !prevBtn || !nextBtn) return;
    
    const scrollAmount = 300;
    

    function updateButtonStates() {
        const scrollLeft = carousel.scrollLeft;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        

        if (scrollLeft <= 0) {
            prevBtn.classList.add('disabled');
        } else {
            prevBtn.classList.remove('disabled');
        }
        

        if (scrollLeft >= maxScroll - 5) {
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.classList.remove('disabled');
        }
    }
    

    prevBtn.addEventListener('click', function() {
        carousel.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });
    

    nextBtn.addEventListener('click', function() {
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
    

    let ticking = false;
    carousel.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateButtonStates();
                ticking = false;
            });
            ticking = true;
        }
    });
    

    updateButtonStates();
    
    // Simple debounce for resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateButtonStates, 100);
    });
    

    let isDown = false;
    let startX;
    let scrollLeftStart;
    
    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        carousel.style.cursor = 'grabbing';
        startX = e.pageX - carousel.offsetLeft;
        scrollLeftStart = carousel.scrollLeft;
    });
    
    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });
    
    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });
    
    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeftStart - walk;
    });
    

    carousel.style.cursor = 'grab';
});
