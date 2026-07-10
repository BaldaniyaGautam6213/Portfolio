/**
 * SOC Dashboard Controllers, Telemetry Maps, and Competency Radar Charts
 */
(function() {
  // Wait for data to load
  if (typeof PORTFOLIO_DATA === 'undefined') return;

  // Global variables
  let logsPaused = false;
  let logInterval = null;
  let alertCount = 0;
  
  // Elements
  const logsBox = document.getElementById('soc-logs-box');
  const pauseLogsBtn = document.getElementById('pause-logs-btn');
  const alertCountEl = document.getElementById('alerts-count');
  const skillSearchInput = document.getElementById('skill-search');
  const skillFilterChips = document.querySelectorAll('[data-skill-cat]');
  const skillsGrid = document.getElementById('skills-grid-container');

  // Initialize all elements when called from app.js
  window.initDashboard = function() {
    initRadarChart();
    initTelemetryMap();
    startLogsSimulation();
    renderSkillsGrid('all');
    setupDashboardListeners();
  };

  function setupDashboardListeners() {
    // Logs Pause toggle
    if (pauseLogsBtn) {
      pauseLogsBtn.addEventListener('click', () => {
        logsPaused = !logsPaused;
        pauseLogsBtn.className = logsPaused ? 'lucide-play-circle text-cyber-green cursor-pointer' : 'lucide-pause-circle text-cyber-red cursor-pointer';
        lucide.createIcons();
        window.showNotification(logsPaused ? "Log ingestion stream PAUSED" : "Log ingestion stream RESUMED", "info");
      });
    }

    // Skills Filter Chips
    skillFilterChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        skillFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const category = chip.getAttribute('data-skill-cat');
        renderSkillsGrid(category, skillSearchInput.value);
      });
    });

    // Skills Search
    if (skillSearchInput) {
      skillSearchInput.addEventListener('input', (e) => {
        const activeChip = document.querySelector('.filter-chip.active');
        const category = activeChip ? activeChip.getAttribute('data-skill-cat') : 'all';
        renderSkillsGrid(category, e.target.value);
      });
    }
  }

  /* ==========================================================================
     COMPETENCY RADAR CHART (CANVAS)
     ========================================================================== */
  function initRadarChart() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Resize function
    function resizeRadar() {
      const size = Math.min(container.offsetWidth, container.offsetHeight || 300);
      canvas.width = size * window.devicePixelRatio;
      canvas.height = size * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      
      drawRadar(size / 2);
    }

    // Set metrics
    const skills = [
      { label: "VAPT / Penetration", val: 90 },
      { label: "SOC operations", val: 85 },
      { label: "Digital Forensics", val: 85 },
      { label: "OS & Net Security", val: 90 },
      { label: "Coding & Python", val: 85 },
      { label: "Threat Intelligence", val: 85 }
    ];

    function drawRadar(radius) {
      ctx.clearRect(0, 0, radius * 2, radius * 2);
      
      const cx = radius;
      const cy = radius;
      const chartRadius = radius * 0.52; // Decreased from 0.65 to provide margin for labels
      const numAxes = skills.length;
      
      // Draw grid backgrounds (concentric rings)
      const gridLevels = 5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      
      for (let level = 1; level <= gridLevels; level++) {
        const r = (chartRadius / gridLevels) * level;
        ctx.beginPath();
        for (let i = 0; i < numAxes; i++) {
          const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Add percent numbers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillText(`${level * 20}%`, cx - 12, cy - r + 10);
      }

      // Draw axis lines and labels
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 12px "Outfit"';
      ctx.textAlign = 'center';
      
      for (let i = 0; i < numAxes; i++) {
        const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
        
        // Axis line
        const endX = cx + Math.cos(angle) * chartRadius;
        const endY = cy + Math.sin(angle) * chartRadius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.stroke();
        
        // Labels
        const lblX = cx + Math.cos(angle) * (chartRadius + 30);
        const lblY = cy + Math.sin(angle) * (chartRadius + 14);
        
        ctx.fillText(skills[i].label, lblX, lblY + 2);
      }

      // Draw the dataset area
      ctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const valRatio = skills[i].val / 100;
        const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
        const x = cx + Math.cos(angle) * chartRadius * valRatio;
        const y = cy + Math.sin(angle) * chartRadius * valRatio;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // Gradient fill
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, chartRadius);
      grad.addColorStop(0, 'rgba(0, 255, 204, 0.1)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Outline
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw data dot points
      for (let i = 0; i < numAxes; i++) {
        const valRatio = skills[i].val / 100;
        const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
        const x = cx + Math.cos(angle) * chartRadius * valRatio;
        const y = cy + Math.sin(angle) * chartRadius * valRatio;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ffcc';
        ctx.fill();
        ctx.strokeStyle = '#030712';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    resizeRadar();
    window.addEventListener('resize', resizeRadar);
  }

  /* ==========================================================================
     THREAT TELEMETRY MAP (CANVAS)
     ========================================================================== */
  function initTelemetryMap() {
    const canvas = document.getElementById('attack-map-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    let width = container.offsetWidth;
    let height = container.offsetHeight || 300;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const attacks = [];
    const hosts = [];
    const centralNode = { x: width / 2, y: height / 2, name: "Gautam-Sec SOC Core", pulse: 0 };
    
    // Generate simulated server host endpoints in circle
    const numHosts = 5;
    for (let i = 0; i < numHosts; i++) {
      const angle = (i * 2 * Math.PI) / numHosts;
      const dist = Math.min(width, height) * 0.35;
      hosts.push({
        x: centralNode.x + Math.cos(angle) * dist,
        y: centralNode.y + Math.sin(angle) * dist,
        name: `Node-0${i+1}.lan`,
        status: 'secure',
        pulse: 0
      });
    }

    // Spawn a simulated packet attack
    function spawnAttack() {
      if (logsPaused) return;
      
      const sourceHostIdx = Math.floor(Math.random() * hosts.length);
      const isIngress = Math.random() > 0.4; // Internal vs external
      
      let startX, startY, endX, endY, label;
      
      if (isIngress) {
        // Attack originates from outside (edges of canvas)
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { startX = Math.random() * width; startY = 0; }
        else if (side === 1) { startX = width; startY = Math.random() * height; }
        else if (side === 2) { startX = Math.random() * width; startY = height; }
        else { startX = 0; startY = Math.random() * height; }
        
        // Destination is one of local subnet nodes
        endX = hosts[sourceHostIdx].x;
        endY = hosts[sourceHostIdx].y;
        label = `INGRESS Port Scan [IP: ${randomIP()}]`;
      } else {
        // Lateral movement simulation
        const targetHostIdx = (sourceHostIdx + 1) % hosts.length;
        startX = hosts[sourceHostIdx].x;
        startY = hosts[sourceHostIdx].y;
        endX = hosts[targetHostIdx].x;
        endY = hosts[targetHostIdx].y;
        label = `LATERAL SMB Probe [SMB/445]`;
      }
      
      const type = Math.random() > 0.7 ? 'alert' : 'info';

      attacks.push({
        sx: startX, sy: startY,
        ex: endX, ey: endY,
        progress: 0,
        speed: 0.01 + Math.random() * 0.015,
        type: type,
        label: label
      });
      
      // Log event to console
      if (type === 'alert') {
        alertCount++;
        if (alertCountEl) alertCountEl.innerText = alertCount;
        triggerNodeStatus(hosts[sourceHostIdx], 'vulnerable');
      }
    }

    function triggerNodeStatus(node, status) {
      node.status = status;
      setTimeout(() => {
        node.status = 'secure';
      }, 3000);
    }

    function drawTelemetry() {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid lines inside map
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let j = 0; j < height; j += 30) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
      }

      // Draw connections/links between nodes
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      hosts.forEach(host => {
        ctx.beginPath();
        ctx.moveTo(centralNode.x, centralNode.y);
        ctx.lineTo(host.x, host.y);
        ctx.stroke();
      });

      // Draw Central Server
      ctx.beginPath();
      ctx.arc(centralNode.x, centralNode.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#00ffcc';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 13px "JetBrains Mono"';
      ctx.fillText(centralNode.name, centralNode.x - 65, centralNode.y - 18);

      // Draw Local Hosts
      hosts.forEach(host => {
        let nodeColor = '#3b82f6';
        let glowColor = 'rgba(59, 130, 246, 0.15)';
        
        if (host.status === 'vulnerable') {
          nodeColor = '#ef4444';
          glowColor = 'rgba(239, 68, 68, 0.4)';
          host.pulse += 0.15;
        } else {
          host.pulse += 0.03;
        }

        // Draw node pulse wave
        const pSize = 5 + (Math.sin(host.pulse) + 1) * 6;
        ctx.beginPath();
        ctx.arc(host.x, host.y, pSize, 0, 2 * Math.PI);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(host.x, host.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = '#030712';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px "JetBrains Mono"';
        ctx.fillText(host.name, host.x - 28, host.y + 20);
      });

      // Update and Draw active attacks
      for (let i = attacks.length - 1; i >= 0; i--) {
        const attack = attacks[i];
        attack.progress += attack.speed;
        
        if (attack.progress >= 1) {
          // Trigger explosion ripple
          ctx.beginPath();
          ctx.arc(attack.ex, attack.ey, 12, 0, 2 * Math.PI);
          ctx.strokeStyle = attack.type === 'alert' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 255, 204, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Print logs event
          addIngressLog(attack.label, attack.type);
          
          attacks.splice(i, 1);
          continue;
        }

        // Interpolate bezier coordinates for nice arc curved paths
        const t = attack.progress;
        const midX = (attack.sx + attack.ex) / 2;
        const midY = (attack.sy + attack.ey) / 2 - 50; // Curve upward offset
        
        // Quadratic bezier equation
        const x = (1 - t) * (1 - t) * attack.sx + 2 * (1 - t) * t * midX + t * t * attack.ex;
        const y = (1 - t) * (1 - t) * attack.sy + 2 * (1 - t) * t * midY + t * t * attack.ey;

        // Draw trailing path
        ctx.beginPath();
        ctx.moveTo(attack.sx, attack.sy);
        ctx.quadraticCurveTo(midX, midY, attack.ex, attack.ey);
        ctx.strokeStyle = attack.type === 'alert' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 255, 204, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw flying packet node
        ctx.beginPath();
        ctx.arc(x, y, attack.type === 'alert' ? 3 : 2, 0, 2 * Math.PI);
        ctx.fillStyle = attack.type === 'alert' ? '#ef4444' : '#00ffcc';
        ctx.fill();
        
        if (attack.type === 'alert') {
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#ef4444';
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    // Simulation loop
    function loop() {
      drawTelemetry();
      requestAnimationFrame(loop);
    }
    
    // Spawn attacks on schedule
    setInterval(spawnAttack, 2500);
    loop();

    // Listen to resize
    window.addEventListener('resize', () => {
      width = container.offsetWidth;
      height = container.offsetHeight || 300;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Re-calculate node positions for responsiveness
      centralNode.x = width / 2;
      centralNode.y = height / 2;
      const dist = Math.min(width, height) * 0.35;
      for (let i = 0; i < hosts.length; i++) {
        const angle = (i * 2 * Math.PI) / hosts.length;
        hosts[i].x = centralNode.x + Math.cos(angle) * dist;
        hosts[i].y = centralNode.y + Math.sin(angle) * dist;
      }
    });
  }

  // Helpers
  function randomIP() {
    return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
  }

  /* ==========================================================================
     SECURITY LOGS STREAM
     ========================================================================== */
  const mockLogPool = [
    { msg: "Syslog signature signed with integrity check SHA-256: [OK]", level: "info" },
    { msg: "Log verification script validation: 100% block chaining success", level: "info" },
    { msg: "SSH authentication failure for uid=0 from IP 185.220.101.4", level: "warn" },
    { msg: "Vulnerability scan matched payload pattern: SQL Injection audit on API endpoint /api/users", level: "warn" },
    { msg: "Exploit blocked: Cross Site Scripting pattern detected by secure CSP headers", level: "info" },
    { msg: "Intrusion trigger: Local privilege escalation bypass attempted using /usr/bin/find", level: "alert" },
    { msg: "Forensics image validation complete: E01 raw acquisition match verified", level: "info" },
    { msg: "Active memory forensics trace detected suspicious process veracrypt.exe (PID 3820)", level: "alert" },
    { msg: "MITRE ATT&CK Mapping trigger: T1056.001 - Input Capture (Keylogging activity logged)", level: "alert" },
    { msg: "Internal system audit: root modified sudoers configuration in /etc/sudoers.d/90-dharma", level: "warn" },
    { msg: "Network telemetry report compiled: total bandwidth load 4.2 Gbps", level: "info" }
  ];

  function startLogsSimulation() {
    if (!logsBox) return;
    
    // Clear and add startup logs
    logsBox.innerHTML = "";
    for (let i = 0; i < 15; i++) {
      const item = mockLogPool[Math.floor(Math.random() * mockLogPool.length)];
      addLogToBox(item.msg, item.level, getRandomPastTime(i));
    }

    if (logInterval) clearInterval(logInterval);
    
    // Ingest logs
    logInterval = setInterval(() => {
      if (logsPaused) return;
      const item = mockLogPool[Math.floor(Math.random() * mockLogPool.length)];
      addLogToBox(item.msg, item.level);
    }, 1800);
  }

  function addIngressLog(message, type) {
    if (logsPaused) return;
    const cleanLvl = type === 'alert' ? 'alert' : 'warn';
    addLogToBox(`[FIREWALL ALIGN] ${message}`, cleanLvl);
  }

  function addLogToBox(msg, level, timeStr = null) {
    if (!logsBox) return;
    
    const row = document.createElement('div');
    row.className = 'log-row';
    
    const timestamp = timeStr || getCurrentTimeStr();
    
    row.innerHTML = `
      <div>
        <span class="timestamp">[${timestamp}]</span>
        <span class="level ${level}">${level.toUpperCase()}</span>
        <span class="message">${msg}</span>
      </div>
    `;
    
    logsBox.appendChild(row);
    
    // Trim logs count
    while (logsBox.childElementCount > 50) {
      logsBox.removeChild(logsBox.firstChild);
    }
    
    // Auto scroll
    logsBox.scrollTop = logsBox.scrollHeight;
  }

  function getCurrentTimeStr() {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function getRandomPastTime(index) {
    const d = new Date(Date.now() - index * 120000);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  /* ==========================================================================
     SKILLS GRID
     ========================================================================== */
  function renderSkillsGrid(categoryFilter = 'all', searchQuery = '') {
    if (!skillsGrid) return;
    
    skillsGrid.innerHTML = '';
    
    const filtered = PORTFOLIO_DATA.skills.filter(skill => {
      const matchesCat = categoryFilter === 'all' || skill.category === categoryFilter;
      const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            skill.subtext.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      skillsGrid.innerHTML = `
        <div class="card-col-2 text-center text-muted" style="grid-column: span 2; padding: 2rem 0;">
          <i data-lucide="shield-alert" style="margin:0 auto 0.5rem auto;"></i>
          <p>No matching skills or security tools found.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    filtered.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'skill-list-card';
      
      card.innerHTML = `
        <div class="skill-card-top">
          <span class="skill-card-name">${skill.name}</span>
          <span class="skill-card-pct">${skill.level}%</span>
        </div>
        <div class="skill-card-bar-wrap">
          <div class="skill-card-bar-fill" style="width: 0%;"></div>
        </div>
        <span class="skill-card-subtext">${skill.subtext}</span>
      `;
      
      skillsGrid.appendChild(card);
      
      // Animate progress bar fill on slight delay
      setTimeout(() => {
        const fill = card.querySelector('.skill-card-bar-fill');
        if (fill) fill.style.width = `${skill.level}%`;
      }, 50);
    });
  }
})();
