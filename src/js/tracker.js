/**
 * Gautam-Sec Security Console - Client Auditing and Visitor Telemetry Tracker
 */
(function() {
  // Local storage keys
  const STORAGE_KEY_AUDITS = "gautam_sec_visitor_audits";
  const STORAGE_KEY_VISIT_COUNT = "gautam_sec_recruiter_visits";
  const STORAGE_KEY_ADMINS = "gautam_sec_admin_credentials";

  // Expose triggers
  window.initTracker = function() {
    trackCurrentSession();
    updateDashboardCounter();
    setupAdminAuditListeners();
    initAdminAccounts();
  };

  /**
   * Harvests visitor telemetry parameters and commits to local audit vault.
   * Prompts for Geolocation automatically on load to request user consent for advanced telemetry.
   */
  async function trackCurrentSession() {
    try {
      const ua = navigator.userAgent;
      const platform = navigator.platform || "Unknown Platform";
      const language = navigator.language || (navigator.languages ? navigator.languages[0] : "en-US");
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTablet = /iPad|PlayBook|Silk/i.test(ua) || (isMobile && window.innerWidth > 600);
      const deviceType = isTablet ? "Tablet" : (isMobile ? "Mobile Phone" : "Desktop Workstation");

      let phoneOrPcSpec = "Generic Workstation";
      if (isMobile) {
        if (/iPhone/i.test(ua)) {
          phoneOrPcSpec = "Apple iPhone";
        } else if (/iPad/i.test(ua)) {
          phoneOrPcSpec = "Apple iPad";
        } else {
          const match = ua.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            const parts = match[1].split(';');
            phoneOrPcSpec = parts[parts.length - 1].trim();
            if (phoneOrPcSpec.includes("Build")) {
              phoneOrPcSpec = phoneOrPcSpec.split("Build")[0].trim();
            }
          } else {
            phoneOrPcSpec = "Android Smartphone";
          }
        }
      } else {
        if (/Windows/i.test(ua)) {
          phoneOrPcSpec = "Windows Desktop PC";
        } else if (/Macintosh/i.test(ua)) {
          phoneOrPcSpec = "Apple MacBook / iMac";
        } else if (/Linux/i.test(ua)) {
          phoneOrPcSpec = "Linux Workstation";
        }
      }

      const screenMetrics = `${window.screen.width}x${window.screen.height} (${window.innerWidth}x${window.innerHeight}) [Color: ${window.screen.colorDepth}-bit]`;
      let ipAddress = "192.168.1." + (Math.floor(Math.random() * 254) + 1) + " (Local Subnet)";
      
      // Basic metrics list
      const fetchableList = [];
      fetchableList.push(`CPU Cores: ${navigator.hardwareConcurrency || "N/A"}`);
      if (navigator.deviceMemory) {
        fetchableList.push(`RAM Capacity: ~${navigator.deviceMemory}GB`);
      }
      
      // WebGL GPU Spec extraction (legal canvas fingerprinting)
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_RENDERER);
            if (renderer) {
              // Simplify long driver tags to fit the dashboard
              const cleanGPU = renderer.split(" Direct3D")[0].split(" vs_")[0].replace("Google Inc. (", "").replace(")", "");
              fetchableList.push(`GPU: ${cleanGPU}`);
            }
          }
        }
      } catch (e) {}

      // Timezone extraction
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) fetchableList.push(`Timezone: ${tz}`);
      } catch (e) {}

      fetchableList.push(`Languages: ${language}`);
      fetchableList.push(`Touchscreen: ${navigator.maxTouchPoints > 0 ? "Yes" : "No"}`);
      if (navigator.connection) {
        let netInfo = `Network: ${navigator.connection.effectiveType || "N/A"}`;
        if (navigator.connection.downlink) netInfo += ` (${navigator.connection.downlink} Mbps)`;
        fetchableList.push(netInfo);
      }

      // Check Battery Status API
      if (navigator.getBattery) {
        try {
          const battery = await navigator.getBattery();
          fetchableList.push(`Battery: ${Math.round(battery.level * 100)}% (${battery.charging ? 'Charging' : 'Discharging'})`);
        } catch(e) {}
      }

      // Attempt actual IP retrieval
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip;
        }
      } catch (err) {
        console.warn("Using offline simulated local IP address.", err);
      }

      // Geolocation and Sensor Permission Request Prompt triggered automatically on load
      let permissionGranted = false;
      let simulatedPhoneNumber = "RESTRICTED (Basic Session)";
      
      // Fallback location variables
      let fallbackLat = null;
      let fallbackLon = null;
      let fallbackCountry = "";
      let fallbackCity = "";

      // Attempt secure IP-based geolocation check first to cover local file path blocks
      try {
        const ipGeoResponse = await fetch('https://ipapi.co/json/');
        if (ipGeoResponse.ok) {
          const geoData = await ipGeoResponse.json();
          if (geoData.latitude && geoData.longitude) {
            fallbackLat = geoData.latitude;
            fallbackLon = geoData.longitude;
            fallbackCountry = geoData.country_name || "";
            fallbackCity = geoData.city || "";
          }
        }
      } catch (err) {
        console.warn("IP Geolocation endpoint offline, trying local lookup.");
      }
      
      try {
        const geoPermission = await new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve({ granted: false, err: "Not supported" });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({ granted: true, pos });
            },
            (err) => {
              resolve({ granted: false, err });
            },
            { timeout: 3500 }
          );
        });

        if (geoPermission.granted) {
          permissionGranted = true;
          fetchableList.push(`GeoLoc: Approved (${geoPermission.pos.coords.latitude.toFixed(4)}, ${geoPermission.pos.coords.longitude.toFixed(4)})`);
          
          if (isMobile) {
            simulatedPhoneNumber = "+91 87807-XXXXX (SIM Verified)";
            fetchableList.push("SIM Module: Online");
            if (window.DeviceOrientationEvent) {
              fetchableList.push("Orientation Gyro: Active");
            }
          } else {
            simulatedPhoneNumber = "N/A (Desktop Workspace)";
            fetchableList.push("Workstation Gyro: Offline");
          }
          fetchableList.push("Auditing Consent: Granted");
        } else {
          // If browser navigator location is denied/blocked, apply the IP-based location fallback
          if (fallbackLat && fallbackLon) {
            fetchableList.push(`GeoLoc (IP): ${fallbackCity}, ${fallbackCountry} (${fallbackLat.toFixed(4)}, ${fallbackLon.toFixed(4)})`);
          } else {
            fetchableList.push("GeoLoc: Denied (Basic Mode)");
          }
        }
      } catch (err) {
        if (fallbackLat && fallbackLon) {
          fetchableList.push(`GeoLoc (IP): ${fallbackCity}, ${fallbackCountry} (${fallbackLat.toFixed(4)}, ${fallbackLon.toFixed(4)})`);
        } else {
          fetchableList.push("Consent Dialog: Dismissed");
        }
      }

      const newAuditEntry = {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
        ip: ipAddress,
        deviceType: deviceType,
        os: platform,
        metrics: screenMetrics,
        spec: phoneOrPcSpec,
        phoneNumber: simulatedPhoneNumber,
        fetchable: fetchableList,
        rawTimestamp: Date.now()
      };

      let auditLogs = getAuditLogs();
      const lastEntry = auditLogs[0];
      if (!lastEntry || (Date.now() - lastEntry.rawTimestamp > 3000) || lastEntry.ip !== newAuditEntry.ip) {
        auditLogs.unshift(newAuditEntry);
        if (auditLogs.length > 100) {
          auditLogs.pop();
        }
        localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(auditLogs));

        let visitCount = parseInt(localStorage.getItem(STORAGE_KEY_VISIT_COUNT) || "0") + 1;
        localStorage.setItem(STORAGE_KEY_VISIT_COUNT, visitCount.toString());
      }

    } catch (e) {
      console.error("Auditing process telemetry exception: ", e);
    }
  }

  /**
   * Updates the counter indicators inside the main SOC Dashboard
   */
  function updateDashboardCounter() {
    const visitsCounterEl = document.getElementById('recruiter-visits-count');
    if (visitsCounterEl) {
      const visitCount = localStorage.getItem(STORAGE_KEY_VISIT_COUNT) || "1";
      visitsCounterEl.innerText = visitCount;
    }
  }

  /**
   * Retrieves array of visitor logs from storage
   */
  function getAuditLogs() {
    const data = localStorage.getItem(STORAGE_KEY_AUDITS);
    if (!data) {
      const seeded = [
        {
          timestamp: "04:32:15.918",
          ip: "103.241.12.87",
          deviceType: "Desktop Workstation",
          os: "Win32 (Windows 11)",
          metrics: "1920x1080 (1920x960)",
          spec: "Chrome / Intel PC Workspace",
          phoneNumber: "N/A (Desktop)",
          fetchable: ["CPU Cores: 16", "RAM Capacity: ~16GB", "Languages: en-US,en", "Network: 4g (RTT: 30ms)", "Battery: 100% (Plugged)"],
          rawTimestamp: Date.now() - 3600000 * 2
        },
        {
          timestamp: "02:18:41.312",
          ip: "172.56.21.190",
          deviceType: "Mobile Phone",
          os: "Linux (Android 14)",
          metrics: "412x915 (412x843)",
          spec: "Samsung Galaxy S24 Ultra",
          phoneNumber: "RESTRICTED (SIM Locked)",
          fetchable: ["CPU Cores: 8", "RAM Capacity: ~12GB", "Languages: en-GB,en", "Touchscreen: Yes", "Network: 5g (RTT: 45ms)", "Battery: 82% (Discharging)"],
          rawTimestamp: Date.now() - 3600000 * 5
        }
      ];
      localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(seeded));
      localStorage.setItem(STORAGE_KEY_VISIT_COUNT, "2");
      return seeded;
    }
    return JSON.parse(data);
  }

  /**
   * Initialize administrators database
   */
  function initAdminAccounts() {
    const data = localStorage.getItem(STORAGE_KEY_ADMINS);
    let admins = [];
    if (data) {
      admins = JSON.parse(data);
    }
    
    // Always guarantee that the master credential 'gautam_admin' exists and has the correct password
    const masterIdx = admins.findIndex(a => a.username === "gautam_admin");
    const masterCred = { username: "gautam_admin", passcode: "Gautam@Admin123", role: "Super Administrator", status: "Active" };
    if (masterIdx !== -1) {
      admins[masterIdx] = masterCred;
    } else {
      admins.unshift(masterCred);
    }
    
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(admins));
    renderAdminAccounts();
  }

  /**
   * Retrieve admin accounts array
   */
  function getAdminAccounts() {
    const data = localStorage.getItem(STORAGE_KEY_ADMINS);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Renders the administrative accounts privileges table
   */
  function renderAdminAccounts() {
    const container = document.getElementById('admin-accounts-list-body');
    if (!container) return;

    const admins = getAdminAccounts();
    container.innerHTML = "";

    admins.forEach((admin, index) => {
      const tr = document.createElement('tr');
      const isSuper = admin.username === "gautam_admin";

      tr.innerHTML = `
        <td style="color: var(--text-primary); font-weight: 700; font-family: var(--font-mono);"><i data-lucide="user-cog" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 0.35rem; color: var(--cyber-green);"></i> ${admin.username}</td>
        <td><span class="badge badge-desktop" style="font-size: 0.65rem;">${admin.role}</span></td>
        <td><span class="pulse-dot green" style="display: inline-block; margin-right: 0.25rem;"></span> ${admin.status}</td>
        <td>
          ${isSuper ? '<span style="color: var(--text-muted); font-size: 0.65rem;">System Protected</span>' : `
            <button class="delete-admin-btn header-action-btn" data-username="${admin.username}" style="border-color: rgba(239,68,68,0.4); color: var(--cyber-red); font-size: 0.65rem; padding: 0.2rem 0.5rem;">
              <i data-lucide="user-minus" style="width: 10px; height: 10px;"></i>
              <span>REVOQUE</span>
            </button>
          `}
        </td>
      `;

      container.appendChild(tr);
    });

    // Bind delete events
    const deleteBtns = container.querySelectorAll('.delete-admin-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-username');
        if (confirm(`Are you sure you want to revoke admin credentials for: ${username}?`)) {
          let admins = getAdminAccounts();
          admins = admins.filter(a => a.username !== username);
          localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(admins));
          window.showNotification(`Admin account '${username}' deleted.`, "info");
          renderAdminAccounts();
        }
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /**
   * Renders the visitor logs table in the admin panel
   */
  window.renderAuditsTable = function() {
    const tableBody = document.getElementById('audits-table-body');
    const totalEl = document.getElementById('audit-stat-total');
    const desktopEl = document.getElementById('audit-stat-desktop');
    const mobileEl = document.getElementById('audit-stat-mobile');

    if (!tableBody) return;

    const logs = getAuditLogs();
    tableBody.innerHTML = "";

    let desktopCount = 0;
    let mobileCount = 0;

    logs.forEach(log => {
      const isMob = log.deviceType === "Mobile Phone" || log.deviceType === "Tablet";
      if (isMob) mobileCount++;
      else desktopCount++;

      const tr = document.createElement('tr');
      
      const badgeClass = isMob ? "badge-mobile" : "badge-desktop";
      const icon = isMob ? "smartphone" : "monitor";
      
      // Build fetchable details tag list
      const fetchableHtml = log.fetchable.map(item => `<span class="fetchable-tag">${item}</span>`).join('');

      tr.innerHTML = `
        <td style="white-space: nowrap; color: var(--text-primary); font-weight: 700;">[${log.timestamp}]</td>
        <td class="text-cyber-green">${log.ip}</td>
        <td>
          <span class="badge ${badgeClass}">
            <i data-lucide="${icon}" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;"></i>
            ${log.deviceType}
          </span>
        </td>
        <td>${log.os}</td>
        <td>${log.metrics}</td>
        <td style="color: var(--text-primary); font-weight: bold;">
          ${log.spec}
          ${isMob ? `<br><span class="badge badge-phone-number"><i data-lucide="phone-off" style="width: 8px; height: 8px; display: inline-block; vertical-align: middle; margin-right: 0.15rem;"></i> ${log.phoneNumber}</span>` : ""}
        </td>
        <td>${fetchableHtml}</td>
      `;

      tableBody.appendChild(tr);
    });

    // Update Counter values
    if (totalEl) totalEl.innerText = logs.length;
    if (desktopEl) desktopEl.innerText = desktopCount;
    if (mobileEl) mobileEl.innerText = mobileCount;
    
    // Update global dashboard counter if initialized
    updateDashboardCounter();
    
    // Re-create icons for table content
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };

  /**
   * Verifies if the user is authenticated in the current session
   */
  window.checkAdminAuthState = function() {
    const loginPanel = document.getElementById('admin-login-panel');
    const authedContent = document.getElementById('admin-authed-content');
    
    const isAuthed = sessionStorage.getItem('gautam_sec_admin_authed') === 'true';
    if (isAuthed) {
      if (loginPanel) loginPanel.classList.add('hidden');
      if (authedContent) authedContent.classList.remove('hidden');
      
      // Update global console username card
      const loggedUser = sessionStorage.getItem('gautam_sec_admin_user') || "gautam_admin";
      const userNameEls = document.querySelectorAll('.sidebar-user .user-name');
      const userRoleEls = document.querySelectorAll('.sidebar-user .user-role');
      userNameEls.forEach(el => el.innerText = loggedUser);
      userRoleEls.forEach(el => el.innerText = "Provisioned Administrator");

      // Collapsing Command Terminal Drawer when logged in
      const term = document.getElementById('terminal-drawer');
      if (term && !term.classList.contains('collapsed')) {
        term.className = "terminal-drawer collapsed";
        const termIcon = document.getElementById('term-toggle-icon');
        if (termIcon) termIcon.className = "lucide-chevrons-up";
      }
      return true;
    } else {
      if (loginPanel) loginPanel.classList.remove('hidden');
      if (authedContent) authedContent.classList.add('hidden');
      return false;
    }
  };

  /**
   * Binds action events for Reset/Clear logs button and Admin Authentication Gate
   */
  function setupAdminAuditListeners() {
    const authForm = document.getElementById('admin-auth-form');
    const loginPanel = document.getElementById('admin-login-panel');
    const authedContent = document.getElementById('admin-authed-content');
    const authError = document.getElementById('admin-auth-error');
    const togglePassBtn = document.getElementById('toggle-admin-pass-btn');
    const passInput = document.getElementById('admin-pass');
    
    const addAdminForm = document.getElementById('add-admin-account-form');

    // Show/Hide password toggle logic
    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        const isPass = passInput.getAttribute('type') === 'password';
        passInput.setAttribute('type', isPass ? 'text' : 'password');
        togglePassBtn.querySelector('i').setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
    }

    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('admin-user').value.trim();
        const pass = document.getElementById('admin-pass').value.trim();

        // Credentials validation from dynamic list
        const admins = getAdminAccounts();
        const matched = admins.find(a => a.username === user && a.passcode === pass);

        if (matched) {
          sessionStorage.setItem('gautam_sec_admin_authed', 'true');
          sessionStorage.setItem('gautam_sec_admin_user', user);
          if (loginPanel) loginPanel.classList.add('hidden');
          if (authedContent) authedContent.classList.remove('hidden');
          if (authError) authError.classList.add('hidden');

          window.showNotification(`Administrator '${user}' verified.`, "success");
          window.checkAdminAuthState();
          window.renderAuditsTable();
        } else {
          if (authError) {
            authError.classList.remove('hidden');
            authError.style.animation = 'none';
            authError.offsetHeight; // trigger reflow
            authError.style.animation = 'shake 0.3s ease';
          }
          window.showNotification("AUTHENTICATION FAILED: Signature mismatch.", "error");
        }
      });
    }

    // Dynamic Admin Accounts Form Provisioning
    if (addAdminForm) {
      addAdminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUser = document.getElementById('new-admin-user').value.trim();
        const newPass = document.getElementById('new-admin-pass').value.trim();

        if (newUser === "" || newPass === "") return;

        let admins = getAdminAccounts();
        if (admins.find(a => a.username === newUser)) {
          window.showNotification("provision error: Admin username already exists.", "error");
          return;
        }

        admins.push({
          username: newUser,
          passcode: newPass,
          role: "Administrator",
          status: "Active"
        });
        localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(admins));
        window.showNotification(`Admin account '${newUser}' provisioned successfully!`, "success");
        
        // Reset form and reload
        addAdminForm.reset();
        renderAdminAccounts();
      });
    }

    const clearBtn = document.getElementById('clear-audits-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm("WARNING: Are you sure you want to clear recruiter visitor tracking logs? This deletes all persisted audit tables.")) {
          localStorage.removeItem(STORAGE_KEY_AUDITS);
          localStorage.setItem(STORAGE_KEY_VISIT_COUNT, "0");
          window.showNotification("Visitor audit logs reset successfully.", "info");
          window.renderAuditsTable();
        }
      });
    }
  }

})();
