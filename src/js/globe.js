/**
 * High-performance 3D Interactive Cyber Globe & Particle Network
 * Built using Vanilla HTML5 Canvas - Zero Dependencies
 */
(function() {
  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.offsetWidth;
  let height = canvas.offsetHeight;
  
  // Set resolution
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // Globe parameters
  let globeRadius = Math.min(width, height) * 0.25;
  const dotsCount = 280;
  const dots = [];
  const connections = [];
  
  // Rotation states
  let angleX = 0.002;
  let angleY = 0.003;
  let targetAngleX = 0.002;
  let targetAngleY = 0.003;
  
  // Mouse interaction state
  let mouse = { x: null, y: null, isDown: false, lastX: 0, lastY: 0 };
  
  // Generate 3D points on a sphere (Fibonacci lattice for even distribution)
  function initGlobe() {
    dots.length = 0;
    globeRadius = Math.min(width, height) * 0.25;
    if (globeRadius < 120) globeRadius = 120; // Min radius limit

    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < dotsCount; i++) {
      const y = 1 - (i / (dotsCount - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y

      const theta = phi * i; // golden angle increment

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      dots.push({
        x: x * globeRadius,
        y: y * globeRadius,
        z: z * globeRadius,
        px: 0, py: 0, // Projected 2D coordinates
        visible: false
      });
    }
  }

  // Project 3D points to 2D screen coordinates
  function project(point, centerX, centerY) {
    const fov = 400; // Camera perspective field of view
    const distance = 400; // Camera distance from origin
    
    // Perspective division
    const scale = fov / (fov + point.z);
    point.px = centerX + point.x * scale;
    point.py = centerY + point.y * scale;
    
    // Z coordinate determines visibility depth
    // point.z goes from -globeRadius (front) to +globeRadius (back)
    // In our coordinates, negative Z is closer to screen
    point.visible = point.z < 250; 
  }

  // Rotate a point in 3D space
  function rotateY(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = point.x * cos - point.z * sin;
    const z = point.z * cos + point.x * sin;
    point.x = x;
    point.z = z;
  }

  function rotateX(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const y = point.y * cos - point.z * sin;
    const z = point.z * cos + point.y * sin;
    point.y = y;
    point.z = z;
  }

  // Event Listeners
  window.addEventListener('resize', () => {
    width = canvas.parentElement.offsetWidth;
    height = canvas.parentElement.offsetHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    initGlobe();
  });

  // Track mouse coordinates
  const container = canvas.parentElement;
  container.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    if (mouse.isDown) {
      const deltaX = currX - mouse.lastX;
      const deltaY = currY - mouse.lastY;
      
      // Update rotation speed based on drag
      targetAngleY += deltaX * 0.005;
      targetAngleX -= deltaY * 0.005;
    }

    mouse.x = currX;
    mouse.y = currY;
    mouse.lastX = currX;
    mouse.lastY = currY;
  });

  container.addEventListener('mousedown', (e) => {
    mouse.isDown = true;
    const rect = canvas.getBoundingClientRect();
    mouse.lastX = e.clientX - rect.left;
    mouse.lastY = e.clientY - rect.top;
  });

  window.addEventListener('mouseup', () => {
    mouse.isDown = false;
  });

  container.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
    mouse.isDown = false;
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    
    // Decay drag rotation speed back to gentle spin
    angleY += (targetAngleY - angleY) * 0.05;
    angleX += (targetAngleX - angleX) * 0.05;
    
    targetAngleY *= 0.95; // Decay drag momentum
    targetAngleX *= 0.95;
    
    // Default continuous slow rotation offset
    const autoSpinY = 0.0015;
    const autoSpinX = 0.0005;
    
    // Apply rotations and project
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      
      rotateY(dot, angleY + autoSpinY);
      rotateX(dot, angleX + autoSpinX);
      project(dot, centerX, centerY);
    }
    
    // Draw connections/grid lines between front-facing dots
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.03)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < dots.length; i++) {
      const d1 = dots[i];
      if (!d1.visible || d1.z > 0) continue; // Only connect closer/front nodes
      
      let connectionCount = 0;
      for (let j = i + 1; j < dots.length; j++) {
        const d2 = dots[j];
        if (!d2.visible || d2.z > 0) continue;
        
        // Compute distance
        const dx = d1.px - d2.px;
        const dy = d1.py - d2.py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Draw lines between close neighbors (threshold depends on radius)
        const threshold = globeRadius * 0.4;
        if (dist < threshold && connectionCount < 3) {
          ctx.beginPath();
          ctx.moveTo(d1.px, d1.py);
          ctx.lineTo(d2.px, d2.py);
          ctx.stroke();
          connectionCount++;
        }
      }
    }

    // Draw orbital ring overlays
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, globeRadius * 1.15, globeRadius * 0.25, Math.PI / 6, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.03)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, globeRadius * 1.3, globeRadius * 0.4, -Math.PI / 4, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw dots
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      if (!dot.visible) continue;

      // Color and size based on Z coordinate (depth)
      // Front dots are bright green, back dots are smaller and darker
      const depthRatio = (dot.z + globeRadius) / (globeRadius * 2); // 0 to 1
      const opacity = (1 - depthRatio) * 0.75 + 0.1;
      const size = (1 - depthRatio) * 2.5 + 0.75;
      
      ctx.beginPath();
      ctx.arc(dot.px, dot.py, size, 0, 2 * Math.PI);
      
      // Proximity check to user's cursor
      if (mouse.x !== null && mouse.y !== null) {
        const dx = dot.px - mouse.x;
        const dy = dot.py - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Highlight if cursor is close
        if (dist < 80 && dot.z < 0) {
          ctx.fillStyle = `rgba(0, 255, 204, ${opacity * 1.8})`;
          ctx.arc(dot.px, dot.py, size * 1.5, 0, 2 * Math.PI);
          
          // Draw connection to cursor
          ctx.strokeStyle = `rgba(0, 255, 204, ${(1 - dist / 80) * 0.18})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(dot.px, dot.py);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        } else {
          // Standard node color blending green to purple based on position
          if (i % 5 === 0) {
            ctx.fillStyle = `rgba(168, 85, 247, ${opacity})`;
          } else {
            ctx.fillStyle = `rgba(0, 255, 204, ${opacity})`;
          }
        }
      } else {
        if (i % 5 === 0) {
          ctx.fillStyle = `rgba(168, 85, 247, ${opacity})`;
        } else {
          ctx.fillStyle = `rgba(0, 255, 204, ${opacity})`;
        }
      }
      
      ctx.fill();
    }
  }

  // Initialize and run
  initGlobe();
  animate();
})();
