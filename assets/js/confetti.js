

class ConfettiCannon {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.isAnimating = false;
        this.activeInterval = null;
        this.colors = ['#FFD700', '#007bff', '#ffc107', '#ff6b35', '#E0E0E0', '#CD7F32'];
    }

    init(targetElement) {

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '999';
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle(x, y) {
        return {
            x: x,
            y: y,
            size: Math.random() * 8 + 4,
            speedX: (Math.random() - 0.5) * 8,
            speedY: Math.random() * -15 - 5,
            gravity: 0.5,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            opacity: 1,
            shape: Math.random() > 0.5 ? 'circle' : 'square'
        };
    }

    burst(x, y, count = 50) {
        if (!this.canvas) this.init();
        
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(x, y));
        }
        
        if (!this.animationId) {
            this.animate();
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(particle => {

            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.speedY += particle.gravity;
            particle.rotation += particle.rotationSpeed;
            

            if (particle.y > this.canvas.height / 2) {
                particle.opacity -= 0.01;
            }
            

            this.ctx.save();
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            
            this.ctx.fillStyle = particle.color;
            
            if (particle.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            }
            
            this.ctx.restore();
            

            return particle.opacity > 0 && particle.y < this.canvas.height + 100;
        });
        
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationId = null;
            this.cleanup();
        }
    }

    cleanup() {
        if (this.activeInterval) {
            clearInterval(this.activeInterval);
            this.activeInterval = null;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
            this.ctx = null;
        }
        this.particles = [];
        this.isAnimating = false;
    }


    celebrate(element, duration = 3000) {
        if (!element) return;
        
        
        if (this.isAnimating) {
            return;
        }
        
        this.isAnimating = true;
        this.init();
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        

        this.burst(centerX, centerY, 80);
        

        let elapsed = 0;
        this.activeInterval = setInterval(() => {
            this.burst(centerX, centerY, 30);
            elapsed += 300;
            
            if (elapsed >= duration) {
                clearInterval(this.activeInterval);
                this.activeInterval = null;
            }
        }, 300);
    }
}


window.confettiCannon = new ConfettiCannon();
