/**
 * Global Coordinator, Router, Sound Engine, and Rendering Controllers
 */
(function() {
  if (typeof PORTFOLIO_DATA === 'undefined') return;

  // Global State variables
  let currentActiveView = "hero";
  let soundEnabled = true;
  let audioCtx = null;
  let activeSuggestionIndex = 0;
  let matchingSuggestions = [];

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const loaderConsole = document.getElementById('loader-console');
  const authBtn = document.getElementById('auth-btn');
  const customCursor = document.getElementById('custom-cursor');
  const cursorGlow = document.getElementById('custom-cursor-glow');
  const sidebarPanel = document.getElementById('console-sidebar');
  const mainViewport = document.getElementById('viewport');
  const soundIcon = document.getElementById('sound-icon');
  const soundBtn = document.getElementById('sound-btn');
  const headerCmdBtn = document.getElementById('header-cmd-btn');
  const launchSocBtn = document.getElementById('launch-soc-btn');
  const logoHomeBtn = document.getElementById('home-logo-btn');
  
  // Navigation elements
  const dockWrappers = document.querySelectorAll('.dock-btn-wrapper');
  const sidebarNavButtons = document.querySelectorAll('.sidebar-nav .nav-btn');
  
  // Terminal drawer launch buttons
  const recTerminalBtn = document.getElementById('recruiter-open-terminal-btn');
  const recLabBtn = document.getElementById('recruiter-view-lab-btn');
  const recHackathonBtn = document.getElementById('recruiter-verify-hackathon-btn');
  const recContactBtn = document.getElementById('recruiter-contact-btn');
  
  // HUD Telemetry stats
  const cpuStatEl = document.getElementById('cpu-stat');
  const ramStatEl = document.getElementById('ram-stat');
  const latencyStatEl = document.getElementById('latency-stat');

  // Command Palette
  const cmdModal = document.getElementById('command-palette-modal');
  const cmdSearchInput = document.getElementById('command-search-input');
  const cmdSuggestionsList = document.getElementById('command-suggestions-list');

  // Project Modals
  const projectModal = document.getElementById('project-case-study-modal');
  const projectsGrid = document.getElementById('projects-list-container');

  // Certifications Elements
  const certsGrid = document.getElementById('certs-grid-container');
  const certSearch = document.getElementById('cert-search');
  const certFilterChips = document.querySelectorAll('#cred-tab-certs [data-cert-cat]');

  // Blogs Elements
  const writeupTree = document.getElementById('writeup-list-tree');
  const writeupReader = document.getElementById('writeup-reader-view');
  const blogSearch = document.getElementById('blog-search');
  const blogFilterChips = document.querySelectorAll('#cred-tab-writeups [data-blog-cat]');

  // Contact Element
  const secureForm = document.getElementById('secure-contact-form');
  const contactCharCount = document.getElementById('char-counter');
  const contactMsgArea = document.getElementById('contact-message');

  // Launch boot sequence
  window.addEventListener('DOMContentLoaded', () => {
    window.navigateTo = navigateTo; // Expose globally on load
    runBootSequence();
    initGlobalListeners();
    initSystemTelemetry();
    renderAllComponents();
  });

  /* ==========================================================================
     SECURE BOOT LOADER (BIOMETRICS)
     ========================================================================== */
  function runBootSequence() {
    const lines = [
      ">> Booting secure sandbox environment...",
      ">> Checking environment entropy parameters... [HIGH]",
      ">> Authenticating security subsystems... [100% OK]",
      ">> Loading profile data database... [24 RECORDS MOUNTED]",
      ">> Syncing active threat telemetry metrics... [RESOLVED]",
      ">> Loading terminal drawers and command configurations... [READY]",
      ">> GUEST AUTHENTICATION REQUIRED. PLACE CREDENTIAL INDEX ON SENSOR."
    ];
    
    let lineIdx = 0;
    
    const interval = setInterval(() => {
      if (lineIdx < lines.length) {
        const div = document.createElement('div');
        div.className = 'console-line';
        div.innerHTML = lines[lineIdx];
        loaderConsole.appendChild(div);
        loaderConsole.scrollTop = loaderConsole.scrollHeight;
        lineIdx++;
        playBeepTone(600, 0.03, 0.05); // Subtle click
      } else {
        clearInterval(interval);
        // Expose authenticate button
        authBtn.style.display = 'flex';
      }
    }, 400);

    authBtn.addEventListener('click', () => {
      playBeepTone(880, 0.1, 0.5); // Success chime
      authBtn.innerHTML = "<span>ACCESS GRANTED</span> <i class='lucide-check-circle'></i>";
      authBtn.style.backgroundColor = "var(--cyber-green)";
      authBtn.style.color = "var(--bg-primary)";
      
      setTimeout(() => {
        loadingScreen.style.opacity = 0;
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          // Initialize other modules
          if (window.initDashboard) window.initDashboard();
          if (window.initTerminal) window.initTerminal();
          if (window.initLab) window.initLab();
          if (window.initTracker) window.initTracker();
          if (window.checkAdminAuthState) window.checkAdminAuthState();
          
          showNotification("Secure session established. Console online.", "success");
        }, 500);
      }, 800);
    });
  }

  /* ==========================================================================
     WEB AUDIO SYNTHESIZER (MICRO BEEPS)
     ========================================================================== */
  function playBeepTone(frequency = 800, duration = 0.05, volume = 0.1) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume if suspended by browser security
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      // Exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked", e);
    }
  }

  /* ==========================================================================
     ROUTING & VIEW SWITCHING
     ========================================================================== */
  function navigateTo(viewId) {
    if (viewId === currentActiveView) return;
    window.navigateTo = navigateTo; // Expose globally

    playBeepTone(900, 0.04, 0.08); // navigation click sound

    // Find active section
    const currentSection = document.querySelector('.viewport-section.active');
    const targetSection = document.getElementById(`view-${viewId}`);

    if (currentSection) {
      currentSection.classList.remove('active');
      currentSection.classList.add('hidden');
    }

    if (targetSection) {
      targetSection.classList.remove('hidden');
      targetSection.classList.add('active');
    }

    // Toggle Console sidebar. Sidebar should NOT display on landing 'hero' page
    if (viewId === 'hero') {
      sidebarPanel.classList.add('hidden');
      mainViewport.className = "viewport-fullscreen";
      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      if (toggleBtn) toggleBtn.style.display = 'none';
    } else {
      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      if (toggleBtn) toggleBtn.style.display = 'flex';
      
      // Open sidebar by default when shifting tabs if it was closed
      sidebarPanel.classList.remove('hidden');
      mainViewport.className = "viewport-fullscreen viewport-with-sidebar";
    }

    // Update nav dock active states
    dockWrappers.forEach(wrap => {
      if (wrap.getAttribute('data-view') === viewId) {
        wrap.classList.add('active');
      } else {
        wrap.classList.remove('active');
      }
    });

    // Update sidebar nav buttons active states
    sidebarNavButtons.forEach(btn => {
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    currentActiveView = viewId;

    // Trigger tab sub-views initialization or data updates
    if (viewId === 'dashboard' || viewId === 'resume' || viewId === 'audits') {
      // Re-trigger radar chart or layout redraws
      window.dispatchEvent(new Event('resize'));
      if (viewId === 'audits') {
        if (window.checkAdminAuthState) {
          window.checkAdminAuthState();
        }
        if (window.renderAuditsTable) {
          window.renderAuditsTable();
        }
      }
    }
  }

  /* ==========================================================================
     GLOBAL SHORTCUTS & DOM LISTENERS
     ========================================================================== */
  function initGlobalListeners() {
    // Left Sidebar Navigation toggle trigger
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', () => {
        sidebarPanel.classList.toggle('hidden');
        mainViewport.classList.toggle('viewport-with-sidebar');
        // Force window resize event to redraw radar charts and threat maps
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 150);
        playBeepTone(800, 0.04, 0.05);
      });
    }

    // Custom cursor movement
    document.addEventListener('mousemove', (e) => {
      customCursor.style.left = `${e.clientX}px`;
      customCursor.style.top = `${e.clientY}px`;
      
      // Smooth follow for background glow light
      cursorGlow.animate({
        left: `${e.clientX}px`,
        top: `${e.clientY}px`
      }, { duration: 800, fill: 'forwards' });
    });

    // Custom cursor hover classes
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, input, textarea, select, .topo-node, .forensic-menu-item, .tree-file-item, .exp-nav-card')) {
        customCursor.classList.add('hovering');
      } else {
        customCursor.classList.remove('hovering');
      }
    });

    // Sidebar navigation buttons
    sidebarNavButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo(btn.getAttribute('data-view'));
      });
    });

    // Bottom dock buttons
    dockWrappers.forEach(wrap => {
      wrap.addEventListener('click', () => {
        navigateTo(wrap.getAttribute('data-view'));
      });
    });

    // Hero action buttons
    const heroLaunchBtn = document.getElementById('hero-launch-btn');
    if (heroLaunchBtn) {
      heroLaunchBtn.addEventListener('click', () => navigateTo('dashboard'));
    }
    const heroRecruiterBtn = document.getElementById('hero-recruiter-btn');
    if (heroRecruiterBtn) {
      heroRecruiterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('recruiter');
      });
    }
    const heroResumeBtn = document.getElementById('hero-resume-btn');
    if (heroResumeBtn) {
      heroResumeBtn.addEventListener('click', () => navigateTo('resume'));
    }

    const heroScrollBtn = document.getElementById('hero-scroll-btn');
    if (heroScrollBtn) {
      heroScrollBtn.addEventListener('click', () => navigateTo('dashboard'));
    }

    // Logo click goes home
    if (logoHomeBtn) {
      logoHomeBtn.addEventListener('click', () => navigateTo('hero'));
    }

    // Quick launch SOC btn in header
    if (launchSocBtn) {
      launchSocBtn.addEventListener('click', () => navigateTo('dashboard'));
    }

    // Recruiter panel fast actions mapping
    if (recTerminalBtn) {
      recTerminalBtn.addEventListener('click', () => {
        // Expand terminal
        const term = document.getElementById('terminal-drawer');
        term.className = "terminal-drawer standard";
        document.getElementById('term-toggle-icon').className = "lucide-chevrons-down";
        document.getElementById('terminal-interactive-input').focus();
        lucide.createIcons();
      });
    }

    if (recLabBtn) {
      recLabBtn.addEventListener('click', () => navigateTo('lab'));
    }

    if (recHackathonBtn) {
      recHackathonBtn.addEventListener('click', () => navigateTo('projects'));
    }

    if (recContactBtn) {
      recContactBtn.addEventListener('click', () => navigateTo('contact'));
    }

    // Sound button toggle
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.className = soundEnabled ? 'lucide-volume-2' : 'lucide-volume-x';
        lucide.createIcons();
        showNotification(soundEnabled ? "Audible alerts online" : "System alerts muted", "info");
        if (soundEnabled) playBeepTone(800, 0.05, 0.1);
      });
    }

    // Command palette toggle buttons
    if (headerCmdBtn) {
      headerCmdBtn.addEventListener('click', toggleCommandPalette);
    }

    // Listen to global shortcuts
    window.addEventListener('keydown', (e) => {
      // Ctrl + K or Slash / to open command palette
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      // Escape closes modals
      if (e.key === 'Escape') {
        cmdModal.classList.add('hidden');
        projectModal.classList.add('hidden');
      }

      // Backtick or tilde to toggle terminal drawer
      if (e.key === '`') {
        e.preventDefault();
        const term = document.getElementById('terminal-drawer');
        if (term.classList.contains('collapsed')) {
          term.className = "terminal-drawer standard";
          document.getElementById('term-toggle-icon').className = "lucide-chevrons-down";
          document.getElementById('terminal-interactive-input').focus();
        } else {
          term.className = "terminal-drawer collapsed";
          document.getElementById('term-toggle-icon').className = "lucide-chevrons-up";
        }
        lucide.createIcons();
      }
    });

    // Command palette suggestions navigation
    cmdSearchInput.addEventListener('keydown', (e) => {
      const items = cmdSuggestionsList.querySelectorAll('.suggestion-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[activeSuggestionIndex].classList.remove('selected');
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        items[activeSuggestionIndex].classList.add('selected');
        items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[activeSuggestionIndex].classList.remove('selected');
        activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
        items[activeSuggestionIndex].classList.add('selected');
        items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        items[activeSuggestionIndex].click();
      }
    });

    // Command palette outside click
    cmdModal.addEventListener('click', (e) => {
      if (e.target === cmdModal) {
        cmdModal.classList.add('hidden');
      }
    });

    // Project Case Study outside click
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        projectModal.classList.add('hidden');
      }
    });

    // Close buttons on Modals
    document.addEventListener('click', (e) => {
      if (e.target.closest('#close-case-study-btn')) {
        projectModal.classList.add('hidden');
      }
    });

    // Contact Form text count
    if (contactMsgArea) {
      contactMsgArea.addEventListener('input', (e) => {
        const len = e.target.value.length;
        contactCharCount.innerText = `${len} / 1000 Bytes`;
        if (len > 1000) {
          contactCharCount.style.color = "var(--cyber-red)";
        } else {
          contactCharCount.style.color = "var(--text-muted)";
        }
      });
    }

    // Secure contact form submit
    if (secureForm) {
      secureForm.addEventListener('submit', (e) => {
        e.preventDefault();
        triggerSecureFormDispatch();
      });
    }
  }

  /* ==========================================================================
     SYSTEM STATS / HUD SIMULATION
     ========================================================================== */
  function initSystemTelemetry() {
    setInterval(() => {
      // CPU: fluctuate between 8% and 22%
      const cpuVal = Math.floor(Math.random() * 14) + 8;
      cpuStatEl.innerText = `${cpuVal}%`;
      
      // RAM: fluctuate around 4.2GB
      const ramVal = (4.1 + Math.random() * 0.3).toFixed(1);
      ramStatEl.innerText = `${ramVal}GB`;

      // Latency: fluctuate around 18ms
      const latVal = Math.floor(Math.random() * 8) + 14;
      latencyStatEl.innerText = `${latVal}ms`;
    }, 3000);

    // Sidebar threat intelligence feed logs
    const threatFeed = document.getElementById('sidebar-intel-feed');
    const intelMsgs = [
      "Malicious payload traffic intercepted by Snort firewall policies.",
      "Syncing vulnerability definitions with OWASP API standard v2.",
      "Analyzing host telemetry: Integrity chaining verified: [OK].",
      "Scanning internal network interfaces: no malicious beacons resolved.",
      "Volatility memory thread checks complete: 0 alerts logged."
    ];
    
    setInterval(() => {
      if (!threatFeed) return;
      const msg = intelMsgs[Math.floor(Math.random() * intelMsgs.length)];
      threatFeed.style.opacity = 0;
      setTimeout(() => {
        threatFeed.innerText = msg;
        threatFeed.style.opacity = 1;
      }, 500);
    }, 8000);
  }

  /* ==========================================================================
     COMMAND PALETTE (CTRL+K) INDEXING
     ========================================================================== */
  const commandIndex = [
    { name: "Home Dashboard Console", category: "view", target: "hero", icon: "home" },
    { name: "Threat Telemetry Dashboard", category: "view", target: "dashboard", icon: "activity" },
    { name: "VAPT / Pentesting Skills Matrix", category: "skill", target: "dashboard", icon: "terminal" },
    { name: "Security Lab Network Topology", category: "view", target: "lab", icon: "cpu" },
    { name: "Digital Forensics Workbench", category: "view", target: "lab", icon: "search-code" },
    { name: "MCA / BCA Certifications", category: "view", target: "credentials", icon: "file-badge" },
    { name: "CTF Writeups & Security Blogs", category: "view", target: "credentials", icon: "terminal" },
    { name: "Recruiter Summary gateway", category: "view", target: "recruiter", icon: "briefcase" },
    { name: "Secure Mail Communications link", category: "view", target: "contact", icon: "mail" },
    { name: "Professional Resume PDF Files", category: "view", target: "resume", icon: "file-text" },
    { name: "Visitor Audits & Recruiter Live Tracker", category: "view", target: "audits", icon: "user-x", searchTrigger: "admin audits visitor recruiter" },
    
    // Tools / Skills direct routes
    { name: "Burp Suite proxy intercepts", category: "tool", target: "dashboard", searchTrigger: "burp" },
    { name: "Nmap port network scanners", category: "tool", target: "dashboard", searchTrigger: "nmap" },
    { name: "Volatility 3 RAM extractions", category: "tool", target: "lab", searchTrigger: "volatility" },
    { name: "Autopsy filesystem database analysis", category: "tool", target: "lab", searchTrigger: "autopsy" },
    { name: "SHA-256 Log integrity chains", category: "projects", target: "projects", searchTrigger: "logs" },
    { name: "Vadodara Hackathon 5.0 NLP Models", category: "projects", target: "projects", searchTrigger: "hackathon" }
  ];

  function toggleCommandPalette() {
    if (cmdModal.classList.contains('hidden')) {
      cmdModal.classList.remove('hidden');
      cmdSearchInput.value = '';
      activeSuggestionIndex = 0;
      filterCommandPalette('');
      setTimeout(() => cmdSearchInput.focus(), 100);
    } else {
      cmdModal.classList.add('hidden');
    }
  }

  cmdSearchInput.addEventListener('input', (e) => {
    filterCommandPalette(e.target.value);
  });

  function filterCommandPalette(query) {
    cmdSuggestionsList.innerHTML = '';
    activeSuggestionIndex = 0;

    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery === '') {
      cmdSuggestionsList.innerHTML = `
        <div class="text-center text-muted" style="padding: 1.5rem; font-family: var(--font-mono); font-size: 0.75rem;">
          <i data-lucide="terminal" style="margin: 0 auto 0.5rem auto; width: 18px; height: 18px; color: var(--cyber-green);"></i>
          <p>AWAITING COMMAND PATH QUERY...</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    matchingSuggestions = commandIndex.filter(item => {
      // Secret rule: audits target MUST ONLY show if query contains "admin"
      if (item.target === 'audits') {
        return trimmedQuery.includes('admin');
      }

      const matchName = item.name.toLowerCase().includes(trimmedQuery);
      const matchCat = item.category.toLowerCase().includes(trimmedQuery);
      const matchTrigger = item.searchTrigger ? item.searchTrigger.toLowerCase().includes(trimmedQuery) : false;
      return matchName || matchCat || matchTrigger;
    });

    if (matchingSuggestions.length === 0) {
      cmdSuggestionsList.innerHTML = `
        <div class="text-center text-muted" style="padding: 1.5rem; font-family: var(--font-mono); font-size: 0.75rem;">
          <i data-lucide="shield-alert" style="margin: 0 auto 0.5rem auto; width: 18px; height: 18px; color: var(--cyber-red);"></i>
          <p>NO CORRESPONDING COMMAND DIRECTIVES FOUND</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    matchingSuggestions.forEach((item, idx) => {
      const sugg = document.createElement('div');
      sugg.className = `suggestion-item ${idx === 0 ? 'selected' : ''}`;
      
      const icon = item.icon || (item.category === 'view' ? 'layout' : 'shield-alert');
      
      sugg.innerHTML = `
        <div class="sugg-left">
          <i data-lucide="${icon}"></i>
          <span>${item.name}</span>
        </div>
        <span class="sugg-category">${item.category}</span>
      `;
      
      cmdSuggestionsList.appendChild(sugg);
      
      sugg.addEventListener('click', () => {
        cmdModal.classList.add('hidden');
        navigateTo(item.target);
        
        // Custom sub-tabs redirection
        if (item.name.includes("Forensics")) {
          // Switch to forensics tab inside lab
          const forensicTabBtn = document.querySelector('[data-lab-tab="forensics"]');
          if (forensicTabBtn) forensicTabBtn.click();
        } else if (item.name.includes("CTF")) {
          const writeupsTabBtn = document.querySelector('[data-cred-tab="writeups"]');
          if (writeupsTabBtn) writeupsTabBtn.click();
        }
      });
    });
    
    lucide.createIcons();
  }

  /* ==========================================================================
     NOTIFICATIONS UTILITY
     ========================================================================== */
  window.showNotification = function(message, type = "info") {
    const notifyCenter = document.getElementById('notification-center');
    if (!notifyCenter) return;

    const notif = document.createElement('div');
    notif.className = 'micro-notification';
    
    let icon = "info";
    let iconColor = "text-cyber-blue";
    
    if (type === "success") {
      icon = "shield-check";
      iconColor = "text-cyber-green";
    } else if (type === "error" || type === "alert") {
      icon = "shield-alert";
      iconColor = "text-cyber-red";
    }
    
    notif.innerHTML = `
      <i data-lucide="${icon}" class="${iconColor}"></i>
      <span class="micro-notification-text">${message}</span>
    `;
    
    notifyCenter.appendChild(notif);
    lucide.createIcons();

    // Trigger animate-in
    setTimeout(() => notif.classList.add('show'), 50);
    
    // Animate out
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notifyCenter.removeChild(notif), 400);
    }, 4000);

    // Audio cue
    if (type === "success") playBeepTone(920, 0.08, 0.05);
    else if (type === "error" || type === "alert") playBeepTone(300, 0.15, 0.08);
    else playBeepTone(750, 0.04, 0.05);
  };

  /* ==========================================================================
     CONTACT SUBMISSIONS (DISPATCH SIGNING)
     ========================================================================== */
  function triggerSecureFormDispatch() {
    const submitBtn = document.getElementById('contact-submit-btn');
    const submitIcon = document.getElementById('submit-icon');
    const submitText = submitBtn.querySelector('span');

    submitBtn.disabled = true;
    submitText.innerText = "GENERATING SIGNATURE...";
    submitIcon.className = "lucide-loader animate-pulse";
    lucide.createIcons();

    let progress = 0;
    
    const interval = setInterval(() => {
      progress += 25;
      if (progress === 50) {
        submitText.innerText = "ENCRYPTING DATA ARRAY...";
      } else if (progress === 75) {
        submitText.innerText = "ESTABLISHING SHAKEHAND...";
      } else if (progress >= 100) {
        clearInterval(interval);
        submitText.innerText = "DISPATCH COMPLETED!";
        submitIcon.className = "lucide-check-circle";
        submitBtn.style.backgroundColor = "var(--cyber-green)";
        submitBtn.style.color = "var(--bg-primary)";
        lucide.createIcons();
        
        playBeepTone(980, 0.15, 0.1);
        showNotification("Security handshake complete. Inquiry dispatched successfully.", "success");
        
        setTimeout(() => {
          // Reset
          secureForm.reset();
          contactCharCount.innerText = "0 / 1000 Bytes";
          submitBtn.disabled = false;
          submitBtn.style.backgroundColor = "";
          submitBtn.style.color = "";
          submitText.innerText = "SIGN & DISPATCH INQUIRY";
          submitIcon.className = "lucide-send";
          lucide.createIcons();
        }, 3000);
      }
    }, 600);
  }

  /* ==========================================================================
     COMPONENTS DYNAMIC RENDERING
     ========================================================================== */
  function renderAllComponents() {
    renderProjectsList();
    renderExperienceTimeline();
    renderCertificatesGrid('all');
    renderWriteupsTree('all');
    renderQRLink();
    startTypingEffect();
    
    lucide.createIcons();
  }

  // Typing Effect
  function startTypingEffect() {
    const el = document.getElementById('typing-text');
    if (!el) return;
    
    const words = [
      "Cybersecurity Analyst Intern",
      "VAPT / Penetration Tester",
      "SOC Analyst (L1)",
      "Digital Forensics Specialist"
    ];
    
    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function type() {
      const currentWord = words[wordIdx];
      
      if (isDeleting) {
        el.innerText = currentWord.substring(0, charIdx - 1);
        charIdx--;
        typingSpeed = 50;
      } else {
        el.innerText = currentWord.substring(0, charIdx + 1);
        charIdx++;
        typingSpeed = 100;
      }
      
      if (!isDeleting && charIdx === currentWord.length) {
        // Pause at the end of the word
        typingSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        typingSpeed = 500;
      }
      
      setTimeout(type, typingSpeed);
    }
    
    type();
  }
  // 1. Projects rendering
  function renderProjectsList() {
    if (!projectsGrid) return;

    projectsGrid.innerHTML = '';
    PORTFOLIO_DATA.projects.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'project-card';
      
      const glowBarColor = proj.id.includes('hackathon') ? 'var(--cyber-purple)' : 'var(--cyber-green)';
      let tagsList = "";
      proj.tags.forEach(t => {
        tagsList += `<span class="exp-tag">${t}</span>`;
      });

      card.innerHTML = `
        <div class="project-banner-decor" style="background-color: ${glowBarColor}"></div>
        <div class="project-body">
          <div class="project-header">
            <h3 class="project-title">${proj.title}</h3>
            ${proj.event ? `<i data-lucide="award" class="text-cyber-purple animate-pulse" title="Hackathon winner"></i>` : ''}
          </div>
          <div class="project-meta">${proj.event ? `${proj.event} — ` : ''}Case Study Report</div>
          <p class="project-description">${proj.overview}</p>
          <div class="project-tags">${tagsList}</div>
          <div class="project-actions">
            <button class="btn btn-secondary btn-case-study" data-proj-id="${proj.id}">
              <i data-lucide="file-text"></i><span>Open Case Study</span>
            </button>
            <a href="${PORTFOLIO_DATA.personal.github}" target="_blank" class="btn btn-ghost">
              <i data-lucide="github"></i><span>Repo</span>
            </a>
          </div>
        </div>
      `;
      
      projectsGrid.appendChild(card);
      
      // Modal bind
      card.querySelector('.btn-case-study').addEventListener('click', () => {
        loadProjectCaseStudy(proj);
      });
    });
  }

  function loadProjectCaseStudy(proj) {
    const contentWrap = document.getElementById('case-study-modal-content');
    if (!contentWrap) return;
    
    playBeepTone(750, 0.05, 0.05);

    let listItems = "";
    if (proj.id.includes("hackathon")) {
      listItems = `
        <li><i data-lucide="check"></i> <div><strong>Classification</strong>: Random Forest Classifier for drug-slang behavioral analysis.</div></li>
        <li><i data-lucide="check"></i> <div><strong>API Portal</strong>: Django REST Framework generating encrypted system webhooks.</div></li>
        <li><i data-lucide="check"></i> <div><strong>React HUD</strong>: Visual interface displaying user threat scores.</div></li>
      `;
    } else {
      listItems = `
        <li><i data-lucide="check"></i> <div><strong>OS Entropy</strong>: Sourced from <code>/dev/urandom</code> blocking PRNG reverse-engineering.</div></li>
        <li><i data-lucide="check"></i> <div><strong>NIST SP 800-63B</strong>: Character length/class policy validation checks.</div></li>
        <li><i data-lucide="check"></i> <div><strong>Clipboard Security</strong>: Built-in clip wipe timer parameters.</div></li>
      `;
    }

    contentWrap.innerHTML = `
      <span class="case-study-close-btn" id="close-case-study-btn">&times;</span>
      <div class="case-study-banner-glow"></div>
      <div class="case-study-body">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">${proj.title}</h2>
        <p style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--cyber-green); margin-top: -0.5rem;">
          SYSTEM DEVELOPMENT REPORT / ${proj.id.toUpperCase()} / COMPILED
        </p>

        <div class="node-section">
          <div class="node-section-title">PROJECT OVERVIEW</div>
          <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">${proj.overview}</p>
        </div>

        <div class="form-row">
          <div class="node-section">
            <div class="node-section-title">PROBLEM STATEMENT</div>
            <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">${proj.problem}</p>
          </div>
          <div class="node-section">
            <div class="node-section-title">OBJECTIVES TARGET</div>
            <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">${proj.objectives}</p>
          </div>
        </div>

        <div class="node-section">
          <div class="node-section-title">SYSTEM FLOW & ARCHITECTURE</div>
          <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary); margin-bottom: 0.75rem;">${proj.architecture}</p>
          <ul class="project-bullets-list" style="margin-bottom:0;">
            ${listItems}
          </ul>
        </div>

        <div class="form-row">
          <div class="node-section">
            <div class="node-section-title">CHALLENGES ENCOUNTERED</div>
            <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">${proj.challenges}</p>
          </div>
          <div class="node-section">
            <div class="node-section-title">REMEDIATION & SOLUTIONS</div>
            <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">${proj.solutions}</p>
          </div>
        </div>

        <div class="node-section">
          <div class="node-section-title">SECURITY ARCHITECTURE CONTROLS</div>
          <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">${proj.security}</p>
        </div>

        <div class="dossier-row" style="margin-top: 1rem;">
          <span class="lbl">HACKATHON OUTCOME:</span>
          <span class="val text-cyber-purple font-semibold">${proj.award || 'N/A'}</span>
        </div>
      </div>
    `;
    
    projectModal.classList.remove('hidden');
    lucide.createIcons();
  }

  // 2. Experience rendering
  function renderExperienceTimeline() {
    const expNav = document.getElementById('exp-nav-sidebar');
    const expDetails = document.getElementById('exp-details-view');
    
    if (!expNav || !expDetails) return;

    expNav.innerHTML = '';
    const job = PORTFOLIO_DATA.experience[0]; // Dharma Infotech

    // Render Side Nav lists of Tasks
    job.tasks.forEach((task, idx) => {
      const card = document.createElement('div');
      card.className = `exp-nav-card ${idx === 0 ? 'active' : ''}`;
      card.setAttribute('data-task-idx', idx);
      
      card.innerHTML = `
        <div class="card-role">${task.title.split(':')[0]}</div>
        <div class="card-company">Dharma Infotech</div>
        <div class="card-date"><i data-lucide="calendar"></i><span>Task 0${idx+1}</span></div>
      `;
      expNav.appendChild(card);

      card.addEventListener('click', () => {
        expNav.querySelectorAll('.exp-nav-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        loadTaskDetails(task, idx);
      });
    });

    // Load first task detail card by default
    loadTaskDetails(job.tasks[0], 0);
  }

  function loadTaskDetails(task, index) {
    const expDetails = document.getElementById('exp-details-view');
    if (!expDetails) return;

    let toolTags = "";
    task.tools.forEach(t => {
      toolTags += `<span class="exp-tag">${t}</span>`;
    });

    playBeepTone(800, 0.04, 0.05);

    let statsGridHtml = "";
    if (index === 0) { // VAPT
      statsGridHtml = `
        <div class="exp-metric-item">
          <span class="lbl">Hosts Screened</span>
          <span class="val highlight-green">5+ Systems</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Report Standard</span>
          <span class="val">CVSS v3.1</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Key Exploitation</span>
          <span class="val">SUID Find Abuse</span>
        </div>
      `;
    } else if (index === 1) { // SOC
      statsGridHtml = `
        <div class="exp-metric-item">
          <span class="lbl">Logs Triage</span>
          <span class="val highlight-blue">Active PCAP Logs</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Framework</span>
          <span class="val text-cyber-purple">MITRE ATT&CK</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Incident Status</span>
          <span class="val">Traced & Isolated</span>
        </div>
      `;
    } else if (index === 2) { // Cryptography log chain
      statsGridHtml = `
        <div class="exp-metric-item">
          <span class="lbl">Tamper rate detection</span>
          <span class="val highlight-green">100% SUCCESS</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Algorithm</span>
          <span class="val">SHA-256 Chain</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Validation Speed</span>
          <span class="val">O(N) High speed</span>
        </div>
      `;
    } else { // Windows forensics
      statsGridHtml = `
        <div class="exp-metric-item">
          <span class="lbl">USB carved device</span>
          <span class="val">Kingston Traveler</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Suspicious PID</span>
          <span class="val text-cyber-red">PID 3820</span>
        </div>
        <div class="exp-metric-item">
          <span class="lbl">Forensic Mode</span>
          <span class="val">RAM Volatility 3</span>
        </div>
      `;
    }

    expDetails.innerHTML = `
      <div class="exp-detail-header animate-fade-in">
        <div class="exp-detail-company-row">
          <div class="exp-detail-company">Dharma Infotech <span class="accent">/ Internship Task</span></div>
          <span class="exp-detail-date-badge">Task 0${index + 1}</span>
        </div>
        <div class="exp-detail-role">VAPT, SOC, Forensics Analyst Engagement</div>
      </div>

      <div class="node-section">
        <div class="exp-sub-section-title"><i data-lucide="focus"></i> Task Overview</div>
        <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.5rem;">${task.title}</h3>
        <p class="exp-detail-overview">${task.objectives}</p>
      </div>

      <div class="exp-tasks-timeline">
        <div class="exp-task-card">
          <div class="exp-task-header">
            <i data-lucide="shield-alert"></i>
            <span>Vulnerability Discovery & Challenges</span>
          </div>
          <p class="exp-task-description">${task.challenges}</p>
          <div class="exp-task-tags">${toolTags}</div>
        </div>

        <div class="exp-task-card">
          <div class="exp-task-header">
            <i data-lucide="shield-check"></i>
            <span>Remediation Solution & Core Operations</span>
          </div>
          <p class="exp-task-description">${task.solutions}</p>
          <p class="exp-task-description"><strong>Security concepts:</strong> ${task.concepts}</p>
        </div>

        <div class="exp-task-card">
          <div class="exp-task-header">
            <i data-lucide="target"></i>
            <span>Business Impact & Forensic Lessons</span>
          </div>
          <p class="exp-task-description"><strong>Impact</strong>: ${task.impact}</p>
          <p class="exp-task-description" style="margin-bottom:0;"><strong>Lessons</strong>: ${task.lessons}</p>
          
          <div class="exp-task-metrics-grid">
            ${statsGridHtml}
          </div>
        </div>
      </div>
    `;
    
    lucide.createIcons();
  }

  // 3. Certifications grid rendering
  function renderCertificatesGrid(catFilter = 'all', searchQuery = '') {
    if (!certsGrid) return;
    
    certsGrid.innerHTML = '';
    
    const filtered = PORTFOLIO_DATA.certifications.filter(c => {
      const matchCat = catFilter === 'all' || c.category === catFilter;
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.issuer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      certsGrid.innerHTML = `
        <div class="text-center text-muted" style="grid-column: span 3; padding: 2rem 0;">
          No academic or professional credentials match search query.
        </div>
      `;
      return;
    }

    filtered.forEach(c => {
      const card = document.createElement('div');
      card.className = 'cert-card';
      
      const icon = c.category === 'academic' ? 'graduation-cap' : 'award';
      
      card.innerHTML = `
        <div class="cert-card-icon-wrap">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="cert-card-info">
          <h3 class="cert-card-title">${c.title}</h3>
          <span class="cert-card-issuer">${c.issuer}</span>
          <span class="cert-card-date">${c.date}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.3; font-style:italic;">
          ${c.details}
        </div>
        <a href="${PORTFOLIO_DATA.personal.linkedin}" target="_blank" class="cert-card-verify-btn">
          <i data-lucide="external-link"></i><span>Verify Credentials</span>
        </a>
      `;
      
      certsGrid.appendChild(card);
    });

    lucide.createIcons();
  }

  // Bind Certifications filtering listeners
  certFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      certFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-cert-cat');
      renderCertificatesGrid(cat, certSearch.value);
    });
  });

  if (certSearch) {
    certSearch.addEventListener('input', (e) => {
      const activeChip = document.querySelector('#cred-tab-certs .filter-chip.active');
      const cat = activeChip ? activeChip.getAttribute('data-cert-cat') : 'all';
      renderCertificatesGrid(cat, e.target.value);
    });
  }

  // 4. Blogs & Writeups rendering
  function renderWriteupsTree(catFilter = 'all', searchQuery = '') {
    if (!writeupTree) return;
    
    writeupTree.innerHTML = '';
    
    const filtered = PORTFOLIO_DATA.blogs.filter(b => {
      const matchCat = catFilter === 'all' || b.category === catFilter;
      const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      writeupTree.innerHTML = `
        <div class="text-center text-muted" style="padding: 1rem 0; font-size: 0.75rem;">
          No secure logs found.
        </div>
      `;
      return;
    }

    filtered.forEach((b, idx) => {
      const btn = document.createElement('button');
      btn.className = `tree-file-item`;
      btn.innerHTML = `
        <i data-lucide="file-code"></i>
        <span>${b.title.substring(0, 24)}...</span>
      `;
      writeupTree.appendChild(btn);

      btn.addEventListener('click', () => {
        writeupTree.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        loadBlogReader(b);
      });
    });

    lucide.createIcons();
  }

  function loadBlogReader(blog) {
    if (!writeupReader) return;
    
    playBeepTone(750, 0.04, 0.05);

    writeupReader.innerHTML = `
      <div class="blog-view-wrap">
        <div class="blog-header">
          <h2 class="blog-title">${blog.title}</h2>
          <div class="blog-meta-row">
            <span class="blog-meta-item"><i data-lucide="user"></i> ${blog.author}</span>
            <span class="blog-meta-item"><i data-lucide="calendar"></i> ${blog.date}</span>
            <span class="blog-meta-item"><i data-lucide="clock"></i> ${blog.readTime}</span>
            <span class="blog-meta-item"><i data-lucide="shield"></i> CATEGORY: ${blog.category.toUpperCase()}</span>
          </div>
        </div>
        <div class="blog-content">
          <p style="font-style: italic; color: var(--text-muted); font-size:0.85rem; border-left: 2px solid var(--cyber-green); padding-left: 0.75rem; margin-bottom: 1.5rem;">
            SUMMARY: ${blog.summary}
          </p>
          ${blog.content}
        </div>
      </div>
    `;
    
    lucide.createIcons();
  }

  // Bind Blogs filtering listeners
  blogFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      blogFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-blog-cat');
      renderWriteupsTree(cat, blogSearch.value);
    });
  });

  if (blogSearch) {
    blogSearch.addEventListener('input', (e) => {
      const activeChip = document.querySelector('#cred-tab-writeups .filter-chip.active');
      const cat = activeChip ? activeChip.getAttribute('data-blog-cat') : 'all';
      renderWriteupsTree(cat, e.target.value);
    });
  }

  // 5. Contact QR Code Generator (SVG-based)
  function renderQRLink() {
    const qrContainer = document.getElementById('qr-container');
    if (!qrContainer) return;
    
    // Inject a clean, premium mock SVG QR Code with security styling
    qrContainer.innerHTML = `
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="120" height="120" fill="transparent"/>
        
        <!-- QR Markers (top-left, top-right, bottom-left) -->
        <rect x="10" y="10" width="30" height="30" fill="none" stroke="var(--cyber-green)" stroke-width="4"/>
        <rect x="18" y="18" width="14" height="14" fill="var(--cyber-green)"/>
        
        <rect x="80" y="10" width="30" height="30" fill="none" stroke="var(--cyber-green)" stroke-width="4"/>
        <rect x="88" y="18" width="14" height="14" fill="var(--cyber-green)"/>
        
        <rect x="10" y="80" width="30" height="30" fill="none" stroke="var(--cyber-green)" stroke-width="4"/>
        <rect x="18" y="88" width="14" height="14" fill="var(--cyber-green)"/>

        <!-- Small alignment marker bottom-right -->
        <rect x="85" y="85" width="15" height="15" fill="none" stroke="var(--cyber-green)" stroke-width="2"/>
        <rect x="90" y="90" width="5" height="5" fill="var(--cyber-green)"/>
        
        <!-- Random QR code dots -->
        <g fill="var(--text-secondary)" opacity="0.85">
          <!-- Column 1 -->
          <rect x="15" y="45" width="5" height="5"/>
          <rect x="25" y="50" width="10" height="5"/>
          <rect x="20" y="60" width="5" height="10"/>
          
          <!-- Column 2 -->
          <rect x="45" y="15" width="5" height="5"/>
          <rect x="55" y="20" width="5" height="15"/>
          <rect x="65" y="10" width="10" height="5"/>
          
          <!-- Middle Block -->
          <rect x="45" y="45" width="10" height="10" fill="var(--cyber-purple)"/>
          <rect x="60" y="45" width="5" height="5"/>
          <rect x="50" y="60" width="15" height="5"/>
          <rect x="45" y="70" width="5" height="10"/>
          
          <!-- Right side -->
          <rect x="80" y="45" width="5" height="15"/>
          <rect x="95" y="55" width="10" height="5"/>
          <rect x="90" y="65" width="5" height="5"/>
          <rect x="80" y="75" width="10" height="5"/>
          
          <!-- Bottom area -->
          <rect x="45" y="85" width="5" height="5"/>
          <rect x="45" y="95" width="15" height="5"/>
          <rect x="65" y="90" width="5" height="15"/>
          <rect x="55" y="105" width="10" height="5"/>
        </g>
      </svg>
    `;
  }
})();
