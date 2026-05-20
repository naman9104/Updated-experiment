const btn = document.querySelector('.magnetic-btn');
const btnBg = document.querySelector('.btn-bg');
const btnText = document.querySelector('.btn-text');
const cursorDot = document.querySelector('.cursor-dot');
const root = document.documentElement;

// State Variables
let isAnimating = false;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

// Button Physics Variables
let currentX = 0, currentY = 0;
let targetX = 0, targetY = 0;
let velX = 0, velY = 0;

// Text Physics Variables (Dual-Layer)
let textCurrentX = 0, textCurrentY = 0;
let textVelX = 0, textVelY = 0;

const stiffness = 0.12;
const friction = 0.75;
const magneticRadius = 180;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  root.style.setProperty('--mouse-x', `${mouseX}px`);
  root.style.setProperty('--mouse-y', `${mouseY}px`);

  const rect = btn.getBoundingClientRect();
  const btnCenterX = rect.left + rect.width / 2 - currentX; 
  const btnCenterY = rect.top + rect.height / 2 - currentY;
  
  const distX = mouseX - btnCenterX;
  const distY = mouseY - btnCenterY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  if (distance < magneticRadius) {
    // Magnetic Pull Only (No distortion calculations here)
    targetX = distX * 0.4; 
    targetY = distY * 0.4;
    
    // Synergy Cursor & Active State
    cursorDot.classList.add('synergy');
    btn.classList.add('is-active');
  } else {
    targetX = 0;
    targetY = 0;
    
    cursorDot.classList.remove('synergy');
    btn.classList.remove('is-active');
  }

  // Wake up loop if it's sleeping
  if (!isAnimating) {
    isAnimating = true;
    requestAnimationFrame(animate);
  }
});

function animate() {
  // --- Button Background Physics ---
  const forceX = (targetX - currentX) * stiffness;
  const forceY = (targetY - currentY) * stiffness;
  
  velX = (velX + forceX) * friction;
  velY = (velY + forceY) * friction;
  
  currentX += velX;
  currentY += velY;

  // --- Text Physics (Pull slightly more for 3D effect) ---
  const textTargetX = targetX * 1.3;
  const textTargetY = targetY * 1.3;
  
  textVelX = (textVelX + (textTargetX - textCurrentX) * stiffness) * friction;
  textVelY = (textVelY + (textTargetY - textCurrentY) * stiffness) * friction;
  
  textCurrentX += textVelX;
  textCurrentY += textVelY;

  // --- Render ---
  // Apply only position translation (Rotation and scaling removed)
  btnBg.style.transform = `translate(${currentX}px, ${currentY}px)`;
  btnText.style.transform = `translate(${textCurrentX}px, ${textCurrentY}px)`;

  // --- Idle Loop Optimization ---
  if (
    Math.abs(velX) < 0.01 && Math.abs(velY) < 0.01 && 
    Math.abs(textVelX) < 0.01 && Math.abs(textVelY) < 0.01 &&
    Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01
  ) {
    currentX = targetX;
    currentY = targetY;
    
    btnBg.style.transform = `translate(${targetX}px, ${targetY}px)`;
    btnText.style.transform = `translate(${targetX * 1.3}px, ${targetY * 1.3}px)`;
    
    isAnimating = false; // The engine sleeps
    return;
  }

  requestAnimationFrame(animate);
}
// --- CANVAS PARTICLE SYSTEM ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let cursor = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, vx: 0, vy: 0 };

// Setup Canvas Size
function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  initParticles();
}

window.addEventListener('resize', resizeCanvas);

// Track Cursor Velocity
document.addEventListener('mousemove', (e) => {
  cursor.prevX = cursor.x;
  cursor.prevY = cursor.y;
  cursor.x = e.clientX;
  cursor.y = e.clientY;
  
  // Calculate instantaneous velocity vector
  cursor.vx = cursor.x - cursor.prevX;
  cursor.vy = cursor.y - cursor.prevY;
});

// Particle Class
class Particle {
  constructor(x, y) {
    this.originX = x; // Base position to return to
    this.originY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = Math.random() * 1.5 + 0.5; // Random stars
    
    // Physics constants
    this.friction = 0.92; // Damping so they don't slide forever
    this.springFactor = 0.05; // Hooke's Law (k) for returning home
  }

  update() {
    // 1. Calculate distance from cursor
    const dx = this.x - cursor.x;
    const dy = this.y - cursor.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const interactRadius = 120; // How close cursor needs to be to scatter them

    if (distance < interactRadius) {
      // Repulsion force scales with cursor velocity and closeness
      const force = (interactRadius - distance) / interactRadius;
      
      // Cursor speed adds to the scatter force
      const speed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
      const scatterMultiplier = Math.min(speed * 0.1, 5); // Cap max scatter
      
      this.vx += (dx / distance) * force * scatterMultiplier;
      this.vy += (dy / distance) * force * scatterMultiplier;
    }

    // 2. Hooke's Law: F = -kx (Spring back to origin)
    const dxOrigin = this.originX - this.x;
    const dyOrigin = this.originY - this.y;
    this.vx += dxOrigin * this.springFactor;
    this.vy += dyOrigin * this.springFactor;

    // 3. Apply friction (damping)
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 4. Update position based on velocity
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    // Draw with slight opacity based on velocity for a motion-blur feel
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const alpha = Math.min(0.2 + (speed * 0.1), 0.8);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
}

// Initialize Particle Grid
function initParticles() {
  particles = [];
  const spacing = 40; // Space between particles
  
  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      // Add slight randomness so it doesn't look like a rigid spreadsheet
      const randomOffsetX = (Math.random() - 0.5) * spacing;
      const randomOffsetY = (Math.random() - 0.5) * spacing;
      particles.push(new Particle(x + randomOffsetX, y + randomOffsetY));
    }
  }
}

// Animation Loop for Canvas
function animateCanvas() {
  // Clear frame with a slight trailing effect
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
  
  // Degrade cursor velocity over time so particles don't scatter if cursor stops moving
  cursor.vx *= 0.5;
  cursor.vy *= 0.5;

  requestAnimationFrame(animateCanvas);
}

// Start
resizeCanvas();
animateCanvas();