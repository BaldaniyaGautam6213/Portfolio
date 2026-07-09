/**
 * Interactive Bash Terminal Simulator Drawer
 */
(function() {
  if (typeof PORTFOLIO_DATA === 'undefined') return;

  const terminalDrawer = document.getElementById('terminal-drawer');
  const terminalHeader = document.getElementById('terminal-header-bar');
  const minimizeBtn = document.getElementById('terminal-minimize-btn');
  const expandBtn = document.getElementById('terminal-expand-btn');
  const termToggleIcon = document.getElementById('term-toggle-icon');
  const termExpandIcon = document.getElementById('term-expand-icon');
  
  const terminalInput = document.getElementById('terminal-interactive-input');
  const terminalHistory = document.getElementById('terminal-logs-history');
  
  // Game states
  let isHacked = false;
  let gamePrompted = false;

  // Init terminal listeners
  window.initTerminal = function() {
    setupTerminalResizing();
    setupCommandParsing();
  };

  function setupTerminalResizing() {
    // Header click toggles minimize/standard
    terminalHeader.addEventListener('click', (e) => {
      // Don't toggle if they clicked window action buttons
      if (e.target.closest('#terminal-minimize-btn') || e.target.closest('#terminal-expand-btn')) return;
      toggleDrawer();
    });

    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDrawer();
    });

    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  function toggleDrawer() {
    if (terminalDrawer.classList.contains('collapsed')) {
      // Open to standard size
      terminalDrawer.classList.remove('collapsed');
      terminalDrawer.classList.add('standard');
      termToggleIcon.className = "lucide-chevrons-down";
      
      // Auto focus input
      setTimeout(() => terminalInput.focus(), 100);
    } else {
      // Collapse
      terminalDrawer.className = "terminal-drawer collapsed";
      termToggleIcon.className = "lucide-chevrons-up";
    }
    lucide.createIcons();
  }

  function toggleFullscreen() {
    if (terminalDrawer.classList.contains('expanded')) {
      // Back to standard
      terminalDrawer.className = "terminal-drawer standard";
      termExpandIcon.className = "lucide-maximize-2";
    } else {
      // Go full screen
      terminalDrawer.className = "terminal-drawer expanded";
      termExpandIcon.className = "lucide-minimize-2";
      setTimeout(() => terminalInput.focus(), 100);
    }
    lucide.createIcons();
  }

  function setupCommandParsing() {
    // Focus terminal input when clicking anywhere inside the terminal body
    terminalHistory.parentElement.addEventListener('click', () => {
      terminalInput.focus();
    });

    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const fullCmd = terminalInput.value;
        const cleanCmd = fullCmd.trim();
        
        if (cleanCmd !== '') {
          processCommand(cleanCmd);
        }
        
        terminalInput.value = '';
      }
    });
  }

  // Core Command Dispatcher
  function processCommand(rawInput) {
    // Add command to history view
    echoCommandLine(rawInput);
    
    // Parse arguments
    const parts = rawInput.toLowerCase().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    let response = "";
    
    switch (cmd) {
      case 'help':
        response = `
  Available security operations directives:
  about       - Summary of Gautam's career profile
  skills      - Show list of audited technical capabilities & tools
  projects    - Detail list of case study projects
  experience  - Detail roles & responsibilities during internships
  locate      - Show phone, email, and social networks
  nmap        - Execute a vulnerability network scan simulation
  hack        - Initialize penetration testing exploit tool
  decrypt     - Submit cryptographic decryption key
  admin       - Access administrative visitor audit logs (locked)
  clear       - Wipe log history from active display buffer
  close       - Minimize active terminal drawer
`;
        break;
        
      case 'about':
        response = `
Personal Dossier: Baldaniya Gautam Rameshbhai
--------------------------------------------------
MCA - Cyber Security & Forensics (Parul University, 2024-2026)
BCA - Science Faculty (MSU of Baroda, 2021-2024)
Current Status: Cybersecurity Analyst Intern at Dharma Infotech
Availability: Immediate Joiner (Open to Relocation)

Dossier Summary:
  Cybersecurity fresher with hands-on experience spanning offensive VAPT,
  defensive SOC operations, and digital forensics. Secured 2nd place
  among 428 competing teams at Vadodara Hackathon 5.0 for engineering
  an ML-powered threat intelligence pipeline. Immediately available.
`;
        break;
        
      case 'skills':
        response = `
Audited Security Skills & Configurations:
=========================================
[OFFENSIVE SECURITY & VAPT]
  - Burp Suite, Nmap, Metasploit, OWASP ZAP, ffuf
  - Web & API vulnerability testing, Linux Privilege Escalation (SUID/Sudo)

[DEFENSIVE OPERATIONS & SOC]
  - Wireshark packet analysis, SIEM concepts, log audits
  - Behavioral anomalies triage, MITRE ATT&CK TTP mapping

[DIGITAL FORENSICS]
  - Volatility 3 memory carving, Autopsy disk imaging
  - FTK Imager evidence collection, Chain of Custody tracking

[PROGRAMMING & ENGINES]
  - Python security scripting, Bash scripting, Django, ReactJS
  - SHA Hash chaining integrity validation logic
`;
        break;
        
      case 'projects':
        response = `
Registered Portfolio Case Studies:
----------------------------------
Project-01: AI-Powered Drug Trafficking Detection System
  - Event: Vadodara Hackathon 5.0 (2nd Place out of 428 Teams)
  - Stack: Python, Django, ReactJS, Machine Learning, NLP
  - Core: Contextual NLP classifier mapping cybercriminal activity.

Project-02: Cryptographically Secure Password Generator
  - Stack: Python, Tkinter GUI
  - Core: OS kernel entropy integration aligned with NIST SP 800-63B.
`;
        break;
        
      case 'experience':
        response = `
Operational Internship Chronology:
==================================
Role: Cybersecurity Analyst Intern
Company: Dharma Infotech, Vadodara
Duration: 2025 - Present

Key Engagements & Achievements:
  - Audited 5+ host environments across Web/Network layers using Nmap,
    ffuf, and Burp Suite; escalated privileges via SUID configurations.
  - Triage SOC alerts by checking Wireshark streams for lateral movement.
  - Built a Tamper-Evident log hashing chain in Python (100% detection rate).
  - Traced insider exfiltration paths using Volatility 3 memory analysis.
`;
        break;
        
      case 'locate':
      case 'contact':
        response = `
Encrypted Contact Channels:
===========================
Email       : gautam6213@gmail.com
Phone       : +91-8780789081
LinkedIn    : linkedin.com/in/gautam6213
GitHub      : github.com/BaldaniyaGautam6213
Location    : Vadodara, Gujarat, India
`;
        break;
        
      case 'nmap':
        simulateNmapScan();
        return; // Async output handles writing
        
      case 'hack':
        triggerHackModule();
        return; // Handles its own flow
        
      case 'decrypt':
        runDecryptionMiniGame(args);
        return; // Handles its own flow

      case 'admin':
        if (window.navigateTo) {
          window.navigateTo('audits');
          printOutput("[+] Redirecting to Secure Administrator Portal. Please enter verification keys.");
          setTimeout(() => toggleDrawer(), 800);
        } else {
          printOutput("[-] View coordination routing offline.");
        }
        return;

      case 'clear':
        terminalHistory.innerHTML = "";
        return;

      case 'close':
        toggleDrawer();
        return;

      default:
        response = `bash: command not found: ${cmd}. Type "help" for options.`;
    }
    
    printOutput(response);
  }

  // Echo the command typed by user
  function echoCommandLine(text) {
    const div = document.createElement('div');
    div.className = 'history-command-line';
    div.innerHTML = `
      <span class="terminal-prompt">guest@gautam-sec:~$</span>
      <span class="text-cyber-green">${escapeHTML(text)}</span>
    `;
    terminalHistory.appendChild(div);
  }

  // Print command output to terminal body
  function printOutput(text) {
    const div = document.createElement('div');
    div.className = 'history-output';
    div.innerHTML = text.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;');
    terminalHistory.appendChild(div);
    scrollTerminal();
  }

  function scrollTerminal() {
    const body = terminalHistory.parentElement;
    body.scrollTop = body.scrollHeight;
  }

  // Safe escape
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ==========================================================================
     NMAP SCROLL ANIMATION SIMULATOR
     ========================================================================== */
  function simulateNmapScan() {
    printOutput("Initializing Nmap network security scanner [v7.92]...");
    
    let step = 0;
    const nmapSteps = [
      "Scanning target: 127.0.0.1 (localhost)",
      "Initiating SYN Stealth Scan at 00:28:12 IST...",
      "Scanning 1000 ports...",
      "Discovered open port 22/tcp (ssh) on target.",
      "Discovered open port 80/tcp (http) on target.",
      "Discovered open port 443/tcp (https) on target.",
      "Discovered open port 445/tcp (microsoft-ds) on target.",
      "Discovered open port 8000/tcp (http-alt) on target.",
      `
Nmap scan report for local-sandbox-gateway (127.0.0.1)
Host is up (0.00014s latency).
Not shown: 995 closed ports

PORT     STATE SERVICE      VERSION
22/tcp   open  ssh          OpenSSH 8.9p1 (Ubuntu)
80/tcp   open  http         Nginx 1.18.0 (Web Server)
443/tcp  open  http         Nginx 1.18.0 (SSL Portal)
445/tcp  open  netbios-ssn  Samba SMB Server (Lateral Path)
8000/tcp open  http-alt     Django REST Endpoint

Nmap done: 1 IP address (1 host up) scanned in 1.2 seconds.
[+] Scan Complete. Local network security audits show secure endpoints.
`
    ];

    function runStep() {
      if (step < nmapSteps.length) {
        printOutput(nmapSteps[step]);
        step++;
        setTimeout(runStep, step === nmapSteps.length - 1 ? 800 : 300);
      }
    }
    
    setTimeout(runStep, 200);
  }

  /* ==========================================================================
     EXPLOIT CRACKING MINI GAME
     ========================================================================== */
  function triggerHackModule() {
    printOutput(`
[+] INITIATING LOCAL AUDIT EXPLOIT SHELL v1.0
[+] AUDITING SYSTEM: guest_credentials_vault_sandbox...
[+] ANALYZING BINARY PRIVILEGES...
[!] EXPLOIT ATTEMPT SUSPENDED: CRYPTOGRAPHIC LOG-INTEGRITY BARRIER DETECTED!
[!] Log validation algorithm requires a decryption handshake check.
[!] INPUT TARGET PASSWORD TO BYPASS INTEGRITY CHAIN.
--------------------------------------------------------------------------
HINT: What hashing algorithm did Gautam implement in his log chain project?
Type "decrypt <algorithm_name>" (e.g. md5, sha256, bcrypt) to bypass.
`);
    gamePrompted = true;
  }

  function runDecryptionMiniGame(args) {
    if (!gamePrompted) {
      printOutput("Error: No exploit module active. Run \\\"hack\\\" command first.");
      return;
    }

    if (args.length === 0) {
      printOutput("Usage: decrypt <hash_algorithm>");
      return;
    }

    const answer = args[0].toLowerCase();
    
    if (answer === 'sha256' || answer === 'sha-256') {
      isHacked = true;
      printOutput(`
[+] MATCH DETECTED! INJECTING AUTHENTICATION BYPASS DECRYPTOR...
[+] OVERRIDING PREVIOUS LOG BLOCKS HEADERS...
[+] HASH INTEGRITY COLLISION BYPASS INJECTED: 100% CORRUPTION RECOVERY
[+] ESCALATING PRIVILEGES TO ROOT SYSTEM CONSOLE STATUS...
==========================================================================
                     SUCCESS: ROOT SHELL ACQUIRED!
==========================================================================
[+] RECOVERED SECURE ENVELOPE ACCESS:
[+] FLAG: FLAG{ROOT_ACCESS_GRANTED_GAUTAM_IS_HIRED}
[+] Hidden recruitment dossier unlocked in 'Recruiter Gateway' section.
[+] Congratulations on cracking Gautam's security controls!
`);
      // Trigger a visual callback
      window.showNotification("ROOT ACCESS ACQUIRED: Easter Egg Flag Unlocked!", "success");
      
      // Let's add a visual glow to the header logo as an Easter Egg
      const logo = document.querySelector('.logo-icon');
      if (logo) {
        logo.style.filter = "drop-shadow(0 0 10px #a855f7)";
        logo.style.color = "#a855f7";
      }
      
      gamePrompted = false;
    } else {
      printOutput(`
[!] DECRYPTION ATTEMPT FAILED: INVALID KEY SYGNATURE MATCH.
[!] Verification server returned hash mismatch error (STATUS_403).
[!] Try again. Hint: 256-bit Secure Hash Algorithm.
`);
    }
  }
})();
