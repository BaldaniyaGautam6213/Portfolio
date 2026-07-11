/**
 * Gautam-Sec Bash Terminal v2.0
 * Features: sudo adduser / deluser / passwd, su, system commands, mini-games
 */
(function () {
  if (typeof PORTFOLIO_DATA === 'undefined') return;

  /* ── DOM refs ─────────────────────────────────────────────────────────── */
  const drawer        = document.getElementById('terminal-drawer');
  const header        = document.getElementById('terminal-header-bar');
  const minimizeBtn   = document.getElementById('terminal-minimize-btn');
  const expandBtn     = document.getElementById('terminal-expand-btn');
  const toggleIcon    = document.getElementById('term-toggle-icon');
  const expandIcon    = document.getElementById('term-expand-icon');
  const input         = document.getElementById('terminal-interactive-input');
  const historyEl     = document.getElementById('terminal-logs-history');

  /* ── Constants ────────────────────────────────────────────────────────── */
  const ADMIN_KEY   = 'gautam_sec_admin_credentials'; // same key as tracker.js
  const MASTER_USER = 'gautam_admin';
  const MASTER_PASS = 'Gautam@Admin123';

  /* ── State ────────────────────────────────────────────────────────────── */
  const S = {
    IDLE         : 'IDLE',
    SUDO_VERIFY  : 'SUDO_VERIFY',
    ADD_PASS     : 'ADD_PASS',
    ADD_CONFIRM  : 'ADD_CONFIRM',
    DEL_VERIFY   : 'DEL_VERIFY',
    PWD_VERIFY   : 'PWD_VERIFY',
    PWD_NEW      : 'PWD_NEW',
    PWD_CONFIRM  : 'PWD_CONFIRM',
    SU_PASS      : 'SU_PASS',
  };

  let state        = S.IDLE;
  let pendingCmd   = null;   // args after "sudo"
  let pendingUser  = null;
  let pendingPass  = null;
  let sessionUser  = null;   // switched-to user via su
  let isHacked     = false;
  let gameActive   = false;

  let cmdHistory   = [];
  let historyIdx   = -1;

  /* ── Init ─────────────────────────────────────────────────────────────── */
  window.initTerminal = function () {
    setupResize();
    setupInput();
  };

  /* ── Drawer resize ────────────────────────────────────────────────────── */
  function setupResize() {
    header.addEventListener('click', (e) => {
      if (e.target.closest('#terminal-minimize-btn') || e.target.closest('#terminal-expand-btn')) return;
      toggleDrawer();
    });
    minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDrawer(); });
    expandBtn.addEventListener('click',   (e) => { e.stopPropagation(); toggleFullscreen(); });
  }

  function toggleDrawer() {
    if (drawer.classList.contains('collapsed')) {
      drawer.classList.remove('collapsed');
      drawer.classList.add('standard');
      toggleIcon.className = 'lucide-chevrons-down';
      setTimeout(() => input.focus(), 100);
    } else {
      drawer.className = 'terminal-drawer collapsed';
      toggleIcon.className = 'lucide-chevrons-up';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function toggleFullscreen() {
    if (drawer.classList.contains('expanded')) {
      drawer.className = 'terminal-drawer standard';
      expandIcon.className = 'lucide-maximize-2';
    } else {
      drawer.className = 'terminal-drawer expanded';
      expandIcon.className = 'lucide-minimize-2';
      setTimeout(() => input.focus(), 100);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* ── Input handling ───────────────────────────────────────────────────── */
  function setupInput() {
    historyEl.parentElement.addEventListener('click', () => input.focus());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state !== S.IDLE) return;
        if (historyIdx < cmdHistory.length - 1) historyIdx++;
        input.value = cmdHistory[cmdHistory.length - 1 - historyIdx] || '';
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state !== S.IDLE) return;
        if (historyIdx > 0) { historyIdx--; input.value = cmdHistory[cmdHistory.length - 1 - historyIdx]; }
        else { historyIdx = -1; input.value = ''; }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (state !== S.IDLE) return;
        autoComplete();
        return;
      }
      if (e.key === 'Enter') {
        const raw   = input.value;
        const clean = raw.trim();
        input.value = '';

        if (state !== S.IDLE) {
          handleStateInput(clean);
        } else if (clean) {
          cmdHistory.push(clean);
          historyIdx = -1;
          processCommand(clean);
        }
      }
    });
  }

  /* ── Tab autocomplete ─────────────────────────────────────────────────── */
  const CMDS = [
    'help','about','skills','projects','experience','locate','contact',
    'whoami','id','uptime','uname -a','ps aux','history','ls','pwd','date','env',
    'nmap','hack','decrypt sha256','admin','clear','close','logout',
    'sudo adduser ','sudo deluser ','sudo passwd ','sudo -l',
    'su '
  ];
  function autoComplete() {
    const v = input.value.toLowerCase();
    if (!v) return;
    const m = CMDS.find(c => c.startsWith(v));
    if (m) input.value = m;
  }

  /* ── Password mode ────────────────────────────────────────────────────── */
  function pwdMode(prompt) {
    printYellow(prompt);
    input.type = 'password';
    input.placeholder = '(input hidden)';
  }
  function normalMode() {
    input.type = 'text';
    input.placeholder = 'Type command...';
  }

  /* ── Multi-step state handler ─────────────────────────────────────────── */
  async function handleStateInput(val) {
    switch (state) {

      /* sudo verification */
      case S.SUDO_VERIFY: {
        normalMode();
        echoMasked();
        const ok = await verifyCreds(sessionUser || MASTER_USER, val);
        if (!ok) {
          printRed('[sudo] Authentication failure — incorrect password.');
          state = S.IDLE; pendingCmd = null;
          break;
        }
        printGreen('[sudo] Identity verified. Elevated privileges granted.');
        state = S.IDLE;
        await resumeSudo(val);
        break;
      }

      /* adduser — enter new password */
      case S.ADD_PASS: {
        normalMode();
        echoMasked();
        if (val.length < 6) {
          printRed('passwd: Password too short (minimum 6 characters). Aborting.');
          state = S.IDLE; pendingUser = null; break;
        }
        pendingPass  = val;
        state        = S.ADD_CONFIRM;
        pwdMode(`Retype new password for ${pendingUser}:`);
        break;
      }

      /* adduser — confirm password */
      case S.ADD_CONFIRM: {
        normalMode();
        echoMasked();
        if (val !== pendingPass) {
          printRed('passwd: Passwords do not match. Aborting.');
          state = S.IDLE; pendingUser = null; pendingPass = null; break;
        }
        await doAddUser(pendingUser, pendingPass);
        state = S.IDLE; pendingUser = null; pendingPass = null;
        break;
      }

      /* deluser — sudo verify */
      case S.DEL_VERIFY: {
        normalMode();
        echoMasked();
        const ok = await verifyCreds(sessionUser || MASTER_USER, val);
        if (!ok) {
          printRed('[sudo] Authentication failure.');
          state = S.IDLE; pendingUser = null; break;
        }
        await doDelUser(pendingUser);
        state = S.IDLE; pendingUser = null;
        break;
      }

      /* passwd — sudo verify */
      case S.PWD_VERIFY: {
        normalMode();
        echoMasked();
        const ok = await verifyCreds(sessionUser || MASTER_USER, val);
        if (!ok) {
          printRed('[sudo] Authentication failure.');
          state = S.IDLE; pendingUser = null; break;
        }
        printGreen(`[sudo] Changing password for ${pendingUser}.`);
        state = S.PWD_NEW;
        pwdMode('New password:');
        break;
      }

      /* passwd — new password */
      case S.PWD_NEW: {
        normalMode();
        echoMasked();
        if (val.length < 6) {
          printRed('passwd: Password too short (minimum 6 characters).');
          state = S.IDLE; pendingUser = null; break;
        }
        pendingPass = val;
        state = S.PWD_CONFIRM;
        pwdMode('Retype new password:');
        break;
      }

      /* passwd — confirm */
      case S.PWD_CONFIRM: {
        normalMode();
        echoMasked();
        if (val !== pendingPass) {
          printRed('passwd: Passwords do not match.');
          state = S.IDLE; pendingUser = null; pendingPass = null; break;
        }
        await doChangePass(pendingUser, pendingPass);
        state = S.IDLE; pendingUser = null; pendingPass = null;
        break;
      }

      /* su — password */
      case S.SU_PASS: {
        normalMode();
        echoMasked();
        const ok = await verifyCreds(pendingUser, val);
        if (ok) {
          sessionUser = pendingUser;
          printGreen(`[+] Authentication successful. Session started as ${pendingUser}.`);
          print(`    Welcome, ${pendingUser}. Type "exit" to return to guest session.`);
        } else {
          printRed(`su: Authentication failure for '${pendingUser}'.`);
        }
        state = S.IDLE; pendingUser = null;
        break;
      }

      default:
        state = S.IDLE;
    }
  }

  /* ── sudo entry point ─────────────────────────────────────────────────── */
  function initSudo(subArgs) {
    pendingCmd = subArgs;
    state      = S.SUDO_VERIFY;
    pwdMode(`[sudo] password for ${sessionUser || 'guest'}:`);
  }

  async function resumeSudo() {
    if (!pendingCmd || pendingCmd.length === 0) { state = S.IDLE; return; }
    const sub  = pendingCmd[0].toLowerCase();
    const args = pendingCmd.slice(1);

    switch (sub) {

      case 'adduser':
      case 'useradd': {
        const newUser = (args[0] || '').toLowerCase().trim();
        if (!newUser) { printRed('Usage: sudo adduser <username>'); state = S.IDLE; break; }
        if (!/^[a-z0-9_]{3,20}$/.test(newUser)) {
          printRed('Error: Username must be 3–20 chars — only lowercase letters, numbers, underscores.');
          state = S.IDLE; break;
        }
        if (newUser === MASTER_USER) {
          printRed(`adduser: '${newUser}' already exists as Super Administrator.`);
          state = S.IDLE; break;
        }
        const exists = await adminExists(newUser);
        if (exists) {
          printRed(`adduser: The user '${newUser}' already exists in the security domain.`);
          state = S.IDLE; break;
        }
        print(`Adding user '${newUser}' to the security domain...`);
        print(`Creating home directory /home/${newUser} ...`);
        pendingUser = newUser;
        state = S.ADD_PASS;
        pwdMode(`New password for ${newUser}:`);
        break;
      }

      case 'deluser':
      case 'userdel': {
        const target = (args[0] || '').toLowerCase().trim();
        if (!target) { printRed('Usage: sudo deluser <username>'); state = S.IDLE; break; }
        if (target === MASTER_USER) {
          printRed('Error: Cannot remove the Super Administrator — system protected.');
          state = S.IDLE; break;
        }
        pendingUser = target;
        await doDelUser(target);
        state = S.IDLE; pendingUser = null;
        break;
      }

      case 'passwd': {
        const target = (args[0] || sessionUser || MASTER_USER).toLowerCase().trim();
        pendingUser  = target;
        print(`Changing password for ${target}:`);
        state = S.PWD_NEW;
        pwdMode('New password:');
        break;
      }

      case '-l':
      case '--list': {
        await listSudoers();
        state = S.IDLE;
        break;
      }

      default:
        printRed(`sudo: '${sub}' is not an available sudoers operation.`);
        print('       Try: sudo adduser / sudo deluser / sudo passwd / sudo -l');
        state = S.IDLE;
    }
  }

  /* ── Admin CRUD helpers ───────────────────────────────────────────────── */
  function getClient() {
    return window.supabaseClient || null;
  }

  /** Read all admins from localStorage */
  function readLocalAdmins() {
    try {
      const raw = localStorage.getItem(ADMIN_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** Write admins array to localStorage */
  function writeLocalAdmins(admins) {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admins));
  }

  /** Verify username + password against DB then localStorage */
  async function verifyCreds(username, pass) {
    // Hardcoded master check
    if (username === MASTER_USER && pass === MASTER_PASS) return true;
    // Check Supabase via RPC
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client.rpc('check_admin_login', {
          p_username: username,
          p_passcode: pass
        });
        if (!error && data && data.length > 0) return true;
      } catch (e) { /* fall through */ }
    }
    // Fallback: localStorage
    return readLocalAdmins().some(a => a.username === username && a.passcode === pass);
  }

  /** Check if admin username already exists */
  async function adminExists(username) {
    const client = getClient();
    if (client) {
      try {
        const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
        const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
        if (adminUser && adminPass) {
          const { data } = await client.rpc('get_admin_accounts', {
            p_admin_user: adminUser,
            p_admin_pass: adminPass
          });
          if (data) return data.some(a => a.username === username);
        }
      } catch (e) { /* fall through */ }
    }
    return readLocalAdmins().some(a => a.username === username);
  }

  /** Provision a new admin */
  async function doAddUser(username, passcode) {
    animateText('[+] Encrypting credentials with SHA-256 salt...', async () => {
      await sleep(250);
      animateText('[+] Assigning role: Administrator ...', async () => {
        await sleep(250);
        animateText('[+] Writing to /etc/gautam-sec/shadow.db ...', async () => {
          await sleep(350);

          // Try Supabase RPC
          let dbOk = false;
          const client = getClient();
          if (client) {
            try {
              const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
              const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
              if (adminUser && adminPass) {
                const { error } = await client.rpc('provision_admin_account', {
                  p_admin_user: adminUser,
                  p_admin_pass: adminPass,
                  p_new_user  : username,
                  p_new_pass  : passcode,
                  p_role      : 'Administrator',
                  p_status    : 'Active'
                });
                if (!error) dbOk = true;
              }
            } catch (e) { /* fall through */ }
          }

          // Always also write locally (same as tracker.js)
          const admins = readLocalAdmins();
          if (!admins.some(a => a.username === username)) {
            admins.push({ username, passcode, role: 'Administrator', status: 'Active' });
            writeLocalAdmins(admins);
          }

          printGreen(`[+] User '${username}' provisioned successfully.`);
          print(`    UID: ${1000 + Math.floor(Math.random() * 8000)}   GID: 1001   Groups: sudo,admin`);
          print(`    Role: Administrator   Status: ● Active`);
          if (dbOk) printGreen('    [DB] Account synchronized to Supabase.');
          else       print('    [LS] Stored in local session (Supabase sync may be pending).');
          print('');

          if (window.showNotification) window.showNotification(`Admin '${username}' provisioned via terminal.`, 'success');
          // Refresh the admin accounts panel if it's visible
          if (typeof window.renderAdminAccounts === 'function') window.renderAdminAccounts();
        });
      });
    });
  }

  /** Revoke an admin */
  async function doDelUser(username) {
    const exists = await adminExists(username);
    if (!exists) {
      printRed(`deluser: '${username}' does not exist in the security domain.`);
      return;
    }

    animateText(`[+] Revoking credentials for '${username}'...`, async () => {
      await sleep(300);

      // Supabase RPC
      let dbOk = false;
      const client = getClient();
      if (client) {
        try {
          const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
          const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
          if (adminUser && adminPass) {
            const { error } = await client.rpc('revoke_admin_account', {
              p_admin_user  : adminUser,
              p_admin_pass  : adminPass,
              p_target_user : username
            });
            if (!error) dbOk = true;
          }
        } catch (e) { /* fall through */ }
      }

      // Remove from localStorage
      const admins = readLocalAdmins().filter(a => a.username !== username);
      writeLocalAdmins(admins);

      printGreen(`[+] User '${username}' removed from admin group.`);
      if (dbOk) printGreen('    [DB] Account revoked in Supabase.');
      print('');
      if (window.showNotification) window.showNotification(`Admin '${username}' revoked via terminal.`, 'info');
      if (typeof window.renderAdminAccounts === 'function') window.renderAdminAccounts();
    });
  }

  /** Change an admin's password */
  async function doChangePass(username, newPass) {
    animateText('[+] Re-hashing with PBKDF2-SHA256...', async () => {
      await sleep(400);

      let dbOk = false;
      const client = getClient();
      if (client) {
        try {
          const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
          const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
          if (adminUser && adminPass) {
            const { error } = await client.rpc('update_admin_password', {
              p_admin_user  : adminUser,
              p_admin_pass  : adminPass,
              p_target_user : username,
              p_new_pass    : newPass
            });
            if (!error) dbOk = true;
          }
        } catch (e) { /* fall through */ }
      }

      // Update localStorage
      const admins = readLocalAdmins();
      const idx = admins.findIndex(a => a.username === username);
      if (idx !== -1) { admins[idx].passcode = newPass; writeLocalAdmins(admins); }

      printGreen(`[+] Password for '${username}' updated successfully.`);
      if (dbOk) printGreen('    [DB] Hash synchronized to Supabase.');
      print('');
      if (window.showNotification) window.showNotification(`Password for '${username}' updated.`, 'success');
    });
  }

  /** List sudoers table */
  async function listSudoers() {
    print('');
    print('Matching Defaults entries for administrator on gautam-sec:');
    print('    env_reset, mail_badpass');
    print('    secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
    print('');
    print('User may run the following commands on gautam-sec:');

    let admins = [];
    const client = getClient();
    if (client) {
      try {
        const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
        const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
        if (adminUser && adminPass) {
          const { data } = await client.rpc('get_admin_accounts', {
            p_admin_user: adminUser,
            p_admin_pass: adminPass
          });
          if (data && data.length) admins = data;
        }
      } catch (e) { /* fall through */ }
    }
    if (!admins.length) admins = readLocalAdmins();
    if (!admins.length) admins = [{ username: MASTER_USER, role: 'Super Administrator' }];

    admins.forEach(a => {
      const isSuper = a.username === MASTER_USER;
      print(`    (${a.username}) NOPASSWD: ${isSuper ? 'ALL' : '/usr/sbin/adduser, /usr/sbin/userdel, /usr/bin/passwd'}`);
    });
    print('');
  }

  /* ── Core command dispatcher ─────────────────────────────────────────── */
  function processCommand(raw) {
    const parts = raw.trim().split(/\s+/);
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1);

    echoCmd(raw);

    switch (cmd) {

      /* ── HELP ── */
      case 'help':
        print(`
┌──────────────────────────────────────────────────────────────────┐
│            GAUTAM-SEC BASH  v2.0  —  COMMAND REFERENCE           │
└──────────────────────────────────────────────────────────────────┘
PORTFOLIO INFO
  about          Career profile & education dossier
  skills         Audited technical capabilities & tools
  projects       Case study projects
  experience     Internship roles & achievements
  locate         Contact channels & social networks

SYSTEM SIMULATION
  whoami         Effective username
  id             User & group identity
  uptime         System uptime
  uname -a       Kernel & OS info
  ps aux         Process list simulation
  history        Command history log
  pwd            Working directory
  date           Current timestamp
  env            Environment variables
  ls             Directory listing

SECURITY TOOLS
  nmap           Run vulnerability network scan simulation
  hack           Initialize penetration testing exploit
  decrypt        Submit cryptographic decryption key

PRIVILEGE MANAGEMENT  ★
  sudo adduser <name>    Provision new admin account
  sudo deluser <name>    Revoke admin credentials
  sudo passwd  <name>    Change admin password
  sudo -l                List privilege table
  su   <username>        Switch to another admin session

NAVIGATION
  admin          Open SOC Dashboard & Audit Logs
  clear          Wipe terminal display buffer
  close          Minimize terminal
  logout / exit  Exit current user session
`);
        break;

      /* ── PORTFOLIO ── */
      case 'about':
        print(`
Personal Dossier: Baldaniya Gautam Rameshbhai
──────────────────────────────────────────────
MCA - Cyber Security & Forensics  (Parul University, 2024-2026)
BCA - Science Faculty             (MSU of Baroda, 2021-2024)
Current Status : Cybersecurity Analyst Intern @ Dharma Infotech
Availability   : Immediate Joiner · Open to Relocation

Summary:
  Cybersecurity fresher with hands-on experience spanning offensive
  VAPT, defensive SOC, and digital forensics. Secured 2nd place
  among 428 teams at Vadodara Hackathon 5.0 with an ML-powered
  threat intelligence pipeline. Immediately available.
`);
        break;

      case 'skills':
        print(`
Audited Security Skills:
========================
[OFFENSIVE SECURITY & VAPT]
  Burp Suite · Nmap · Metasploit · OWASP ZAP · ffuf
  Web & API vulnerability testing
  Linux Privilege Escalation (SUID / Sudo)

[DEFENSIVE OPERATIONS & SOC]
  Wireshark packet analysis · SIEM concepts · Log audits
  Behavioral anomaly triage · MITRE ATT&CK TTP mapping

[DIGITAL FORENSICS]
  Volatility 3 memory carving · Autopsy disk imaging
  FTK Imager evidence collection · Chain of Custody

[PROGRAMMING & FRAMEWORKS]
  Python · Bash scripting · Django · ReactJS
  SHA Hash chaining integrity validation
`);
        break;

      case 'projects':
        print(`
Portfolio Case Studies:
───────────────────────
Project-01: AI-Powered Drug Trafficking Detection System
  Event  : Vadodara Hackathon 5.0  (2nd / 428 Teams)
  Stack  : Python · Django · ReactJS · ML · NLP
  Core   : Contextual NLP classifier mapping cybercriminal activity.

Project-02: Cryptographically Secure Password Generator
  Stack  : Python · Tkinter GUI
  Core   : OS kernel entropy aligned with NIST SP 800-63B.
`);
        break;

      case 'experience':
        print(`
Operational Internship:
=======================
Role     : Cybersecurity Analyst Intern
Company  : Dharma Infotech, Vadodara
Duration : 2025 – Present

Key Engagements:
  · Audited 5+ environments via Nmap, ffuf, Burp Suite
  · Privilege escalation via SUID configurations
  · SOC alert triage via Wireshark stream analysis
  · Built Tamper-Evident log hashing chain (100% detection rate)
  · Insider exfiltration traced via Volatility 3 memory analysis
`);
        break;

      case 'locate':
      case 'contact':
        print(`
Encrypted Contact Channels:
============================
Email     : gautam6213@gmail.com
Phone     : +91-8780789081
LinkedIn  : linkedin.com/in/gautam6213
GitHub    : github.com/BaldaniyaGautam6213
Location  : Vadodara, Gujarat, India
`);
        break;

      /* ── SYSTEM SIMULATION ── */
      case 'whoami':
        print(sessionUser || 'guest');
        break;

      case 'id': {
        const u   = sessionUser || 'guest';
        const uid = sessionUser ? 1000 : 9999;
        print(`uid=${uid}(${u}) gid=1001(admin) groups=1001(admin),27(sudo),4(adm)`);
        break;
      }

      case 'pwd':
        print(sessionUser ? `/home/${sessionUser}` : '/home/guest');
        break;

      case 'date':
        print(new Date().toString());
        break;

      case 'uptime': {
        const m = Math.floor(Math.random() * 1440);
        const h = Math.floor(m / 60);
        print(` ${new Date().toTimeString().slice(0,8)} up ${h}h ${m%60}m,  1 user,  load average: 0.12, 0.08, 0.05`);
        break;
      }

      case 'uname':
        print(args[0] === '-a' ? 'Linux gautam-sec 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux' : 'Linux');
        break;

      case 'env':
        print(`SHELL=/bin/bash
USER=${sessionUser || 'guest'}
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/home/${sessionUser || 'guest'}
TERM=xterm-256color
LANG=en_US.UTF-8
NODE_ENV=production
SUPABASE_URL=https://[REDACTED].supabase.co
JWT_SECRET=[CLASSIFIED]`);
        break;

      case 'ls':
        print(`total 24
drwxr-xr-x  2 ${sessionUser||'guest'} admin 4096  .
drwxr-xr-x 12 root  root  4096  ..
-rw-r--r--  1 ${sessionUser||'guest'} admin  220  .bash_history
-rw-r--r--  1 ${sessionUser||'guest'} admin 3526  .bashrc
drwx------  2 ${sessionUser||'guest'} admin 4096  .ssh`);
        break;

      case 'ps':
        print(`  PID TTY      TIME CMD
    1 ?    00:00:01 systemd
  412 ?    00:00:00 sshd
  893 ?    00:02:14 node (portfolio-server)
  921 ?    00:00:31 supabase-realtime
 1024 pts/0 00:00:00 bash
 1337 pts/0 00:00:00 ps`);
        break;

      case 'history':
        if (!cmdHistory.length) { print('(no history)'); break; }
        cmdHistory.forEach((c, i) => print(`  ${String(i+1).padStart(4)}  ${c}`));
        break;

      /* ── SECURITY TOOLS ── */
      case 'nmap':
        simulateNmap();
        return;

      case 'hack':
        triggerHack();
        return;

      case 'decrypt':
        runDecrypt(args);
        return;

      /* ── SUDO ── */
      case 'sudo':
        if (!args.length) {
          printRed('usage: sudo <command>');
          print('       sudo adduser <username>   — Provision a new admin');
          print('       sudo deluser <username>   — Revoke an admin account');
          print('       sudo passwd  <username>   — Change admin password');
          print('       sudo -l                   — List privilege table');
          break;
        }
        initSudo(args);
        return;

      /* ── SU ── */
      case 'su': {
        const target = (args[0] || '').toLowerCase().trim();
        if (!target) { printRed('Usage: su <username>'); break; }
        if (target === 'root') { printRed('su: root access is disabled in sandbox mode.'); break; }
        if (target === (sessionUser || 'guest')) { print(`Already logged in as ${target}.`); break; }
        pendingUser = target;
        state       = S.SU_PASS;
        pwdMode(`Password for ${target}:`);
        return;
      }

      /* ── LOGOUT ── */
      case 'logout':
      case 'exit':
        if (sessionUser) {
          print(`logout: Session ended for ${sessionUser}.`);
          sessionUser = null;
        } else {
          toggleDrawer();
        }
        break;

      /* ── NAVIGATION ── */
      case 'admin':
        if (window.navigateTo) {
          window.navigateTo('audits');
          print('[+] Redirecting to Secure Administrator Portal...');
          setTimeout(() => toggleDrawer(), 800);
        } else {
          printRed('[-] View routing unavailable.');
        }
        return;

      case 'clear':
        historyEl.innerHTML = '';
        return;

      case 'close':
        toggleDrawer();
        return;

      default:
        printRed(`bash: command not found: ${cmd}`);
        print('       Type "help" for the full command reference.');
    }
  }

  /* ── Output helpers ───────────────────────────────────────────────────── */
  function echoCmd(text) {
    const d = document.createElement('div');
    d.className = 'history-command-line';
    d.innerHTML = `<span class="terminal-prompt">${esc(sessionUser || 'guest')}@gautam-sec:~$</span> <span class="text-cyber-green">${esc(text)}</span>`;
    historyEl.appendChild(d); scroll();
  }

  function echoMasked() {
    const d = document.createElement('div');
    d.className = 'history-command-line';
    d.style.color = '#555';
    d.style.letterSpacing = '2px';
    d.textContent = '••••••••';
    historyEl.appendChild(d); scroll();
  }

  function print(text) {
    const d = document.createElement('div');
    d.className = 'history-output';
    d.innerHTML = esc(text).replace(/\n/g, '<br>').replace(/ {2}/g, '&nbsp;&nbsp;');
    historyEl.appendChild(d); scroll();
  }

  function printGreen(text) { _colorPrint(text, 'var(--cyber-green, #22c55e)'); }
  function printRed(text)   { _colorPrint(text, 'var(--cyber-red, #ef4444)'); }
  function printYellow(text){ _colorPrint(text, 'var(--cyber-yellow, #facc15)'); }

  function _colorPrint(text, color) {
    const d = document.createElement('div');
    d.className = 'history-output';
    d.style.color = color;
    d.textContent = text;
    historyEl.appendChild(d); scroll();
  }

  function animateText(text, callback) {
    let i = 0;
    const d = document.createElement('div');
    d.className = 'history-output';
    d.style.color = 'var(--cyber-green, #22c55e)';
    historyEl.appendChild(d);
    function tick() {
      if (i <= text.length) { d.textContent = text.slice(0, i++); scroll(); setTimeout(tick, 28); }
      else if (callback) callback();
    }
    tick();
  }

  function scroll() { const b = historyEl.parentElement; b.scrollTop = b.scrollHeight; }
  function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  /* ── Nmap simulation ─────────────────────────────────────────────────── */
  function simulateNmap() {
    print(`Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toLocaleString()}`);
    const steps = [
      'Scanning 127.0.0.1 [1000 ports]...',
      'Discovered open port 22/tcp   — SSH',
      'Discovered open port 80/tcp   — HTTP',
      'Discovered open port 443/tcp  — HTTPS',
      'Discovered open port 3000/tcp — Node.js',
      'Discovered open port 5432/tcp — PostgreSQL',
      'Discovered open port 8000/tcp — Django REST',
      `
Nmap scan report for localhost (127.0.0.1)
Host is up (0.00014s latency).

PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 8.9p1 Ubuntu
80/tcp   open  http        Nginx 1.18.0
443/tcp  open  ssl/https   Nginx 1.18.0 (TLS 1.3)
3000/tcp open  http        Node.js 18.x
5432/tcp open  postgresql  PostgreSQL 14.5
8000/tcp open  http-alt    Django 4.2 REST API

Nmap done: 1 IP scanned in 1.23 seconds.
[+] No critical CVEs detected on scanned ports.`
    ];
    let i = 0;
    function next() {
      if (i < steps.length) { print(steps[i++]); setTimeout(next, i === steps.length ? 800 : 300); }
    }
    setTimeout(next, 150);
  }

  /* ── Hack / Decrypt mini-game ────────────────────────────────────────── */
  function triggerHack() {
    print(`
[+] INITIATING LOCAL AUDIT EXPLOIT SHELL v1.0
[+] AUDITING SYSTEM: guest_credentials_vault_sandbox...
[+] ANALYZING BINARY PRIVILEGES...
[!] EXPLOIT SUSPENDED — CRYPTOGRAPHIC LOG-INTEGRITY BARRIER DETECTED!
[!] Log validation requires a decryption handshake.
────────────────────────────────────────────────────────────────────
HINT: What hashing algorithm did Gautam use in his log chain project?
Type "decrypt <algorithm>"  e.g.  decrypt sha256
`);
    gameActive = true;
  }

  function runDecrypt(args) {
    if (!gameActive) { printRed('Error: No exploit module active. Run "hack" first.'); return; }
    if (!args.length){ print('Usage: decrypt <hash_algorithm>'); return; }

    if (['sha256','sha-256','sha_256'].includes(args[0].toLowerCase())) {
      isHacked = true; gameActive = false;
      printGreen(`
[+] MATCH DETECTED! INJECTING AUTHENTICATION BYPASS...
[+] OVERRIDING LOG BLOCK HEADERS...
[+] HASH INTEGRITY BYPASS INJECTED: 100% CORRUPTION RECOVERY
[+] ESCALATING PRIVILEGES TO ROOT CONSOLE...
══════════════════════════════════════════════════════════
               SUCCESS: ROOT SHELL ACQUIRED!
══════════════════════════════════════════════════════════
[+] FLAG: FLAG{ROOT_ACCESS_GRANTED_GAUTAM_IS_HIRED}
[+] Tip: Now try  sudo adduser <name>  to provision an admin!
`);
      if (window.showNotification) window.showNotification('🚩 Easter Egg: ROOT ACCESS ACQUIRED!', 'success');
      const logo = document.querySelector('.logo-icon');
      if (logo) { logo.style.filter = 'drop-shadow(0 0 12px #a855f7)'; logo.style.color = '#a855f7'; }
    } else {
      printRed(`[!] DECRYPTION FAILED — invalid key signature (STATUS_403).
    Hint: 256-bit Secure Hash Algorithm.`);
    }
  }

})();
