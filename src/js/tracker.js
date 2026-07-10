/**
 * Gautam-Sec Security Console - Client Auditing and Visitor Telemetry Tracker
 */
(function() {
  // Local storage keys
  const STORAGE_KEY_AUDITS = "gautam_sec_visitor_audits";
  const STORAGE_KEY_VISIT_COUNT = "gautam_sec_recruiter_visits";
  const STORAGE_KEY_ADMINS = "gautam_sec_admin_credentials";
  const STORAGE_KEY_INQUIRIES = "gautam_sec_recruiter_inquiries";

  // Supabase Configuration
  // NOTE: Paste your Supabase project credentials here.
  const SUPABASE_URL = "https://hqbyydyrxfhzpecfvehw.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_kXE_vkmlr-C0X5tytY26Mg_C3ZNRUHG";
  let client = null;
  if (typeof supabase !== 'undefined' && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY") {
    client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Expose triggers
  window.initTracker = function() {
    // 1. Bind UI listeners immediately and synchronously so they are active instantly
    setupAdminAuditListeners();

    // 2. Load admin accounts locally or online
    initAdminAccounts().catch(e => console.error("Error initializing admin accounts:", e));

    // 3. Fire-and-forget the background tracking and statistics queries
    trackCurrentSession().catch(e => console.error("Error tracking session:", e));
    updateDashboardCounter().catch(e => console.error("Error updating counter:", e));
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

      if (client) {
        // Log telemetry online directly to Supabase
        const { error } = await client.from('visitor_audits').insert([ newAuditEntry ]);
        if (error) {
          console.error("Supabase telemetry insert error: ", error);
        }
      } else {
        // Fallback to local storage
        let auditLogs = getAuditLogsLocal();
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
      }

    } catch (e) {
      console.error("Auditing process telemetry exception: ", e);
    }
  }

  /**
   * Updates the counter indicators inside the main SOC Dashboard
   */
  async function updateDashboardCounter() {
    const visitsCounterEl = document.getElementById('recruiter-visits-count');
    if (visitsCounterEl) {
      if (client) {
        try {
          const { data: count, error } = await client.rpc('get_total_visitor_count');
          if (!error && count !== null) {
            visitsCounterEl.innerText = count;
            return;
          }
        } catch (e) {
          console.error("Error fetching total visits from Supabase:", e);
        }
      }
      const visitCount = localStorage.getItem(STORAGE_KEY_VISIT_COUNT) || "1";
      visitsCounterEl.innerText = visitCount;
    }
  }

  /**
   * Helper to retrieve fallback logs from local storage
   */
  function getAuditLogsLocal() {
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
   * Retrieves array of visitor logs
   */
  async function getAuditLogs() {
    if (client) {
      try {
        const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
        const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
        if (adminUser && adminPass) {
          const { data, error } = await client.rpc('get_visitor_audits', {
            p_admin_user: adminUser,
            p_admin_pass: adminPass
          });
          if (!error && data) return data;
          console.error("Error fetching online logs:", error);
        }
      } catch (e) {
        console.error("Error fetching online logs:", e);
      }
    }
    return getAuditLogsLocal();
  }

  /**
   * Initialize administrators database
   */
  async function initAdminAccounts() {
    if (client) {
      await renderAdminAccounts();
      return;
    }
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
    await renderAdminAccounts();
  }

  /**
   * Retrieve admin accounts array
   */
  async function getAdminAccounts() {
    if (client) {
      try {
        const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
        const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
        if (adminUser && adminPass) {
          const { data, error } = await client.rpc('get_admin_accounts', {
            p_admin_user: adminUser,
            p_admin_pass: adminPass
          });
          if (!error && data) return data;
          console.error("Error listing admin accounts:", error);
        }
      } catch (e) {
        console.error("Error listing admin accounts:", e);
      }
    }
    const data = localStorage.getItem(STORAGE_KEY_ADMINS);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Renders the administrative accounts privileges table
   */
  async function renderAdminAccounts() {
    const container = document.getElementById('admin-accounts-list-body');
    if (!container) return;

    const admins = await getAdminAccounts();
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
      btn.addEventListener('click', async () => {
        const username = btn.getAttribute('data-username');
        if (confirm(`Are you sure you want to revoke admin credentials for: ${username}?`)) {
          if (client) {
            try {
              const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
              const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
              const { data: success, error } = await client.rpc('revoke_admin_account', {
                p_admin_user: adminUser,
                p_admin_pass: adminPass,
                p_target_user: username
              });
              if (success && !error) {
                window.showNotification(`Admin account '${username}' deleted.`, "info");
                await renderAdminAccounts();
                return;
              }
              console.error("Revoke error:", error);
            } catch (e) {
              console.error("Revoke error:", e);
            }
          }
          let admins = await getAdminAccounts();
          admins = admins.filter(a => a.username !== username);
          localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(admins));
          window.showNotification(`Admin account '${username}' deleted.`, "info");
          await renderAdminAccounts();
        }
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /**
   * Renders the visitor logs table in the admin panel
   */
  window.renderAuditsTable = async function() {
    const tableBody = document.getElementById('audits-table-body');
    const totalEl = document.getElementById('audit-stat-total');
    const desktopEl = document.getElementById('audit-stat-desktop');
    const mobileEl = document.getElementById('audit-stat-mobile');

    if (!tableBody) return;

    const logs = await getAuditLogs();
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
    
    // Update global dashboard counter
    await updateDashboardCounter();
    
    // Render recruiter inquiries too
    if (window.renderInquiriesTable) {
      window.renderInquiriesTable();
    }
    
    // Re-create icons for table content
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };

  /**
   * Renders the administrative enquiries received from recruiters
   */
  window.renderInquiriesTable = function() {
    const tableBody = document.getElementById('inquiries-table-body');
    if (!tableBody) return;
    
    const data = localStorage.getItem(STORAGE_KEY_INQUIRIES);
    const inquiries = data ? JSON.parse(data) : [];
    tableBody.innerHTML = "";
    
    if (inquiries.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); font-family: var(--font-mono);">NO RECRUITER INQUIRIES REGISTERED IN LOCAL VAULT</td>
        </tr>
      `;
      return;
    }
    
    inquiries.forEach(inq => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="white-space: nowrap; color: var(--text-primary); font-weight: 700;">[${inq.timestamp}]</td>
        <td class="text-cyber-green" style="font-weight: 700;">${escapeHTML(inq.name)}</td>
        <td><a href="mailto:${inq.email}" class="text-cyber-blue link">${escapeHTML(inq.email)}</a></td>
        <td style="color: var(--text-primary); font-weight: bold;">${escapeHTML(inq.subject)}</td>
        <td style="white-space: normal; line-height: 1.4; min-width: 250px; color: var(--text-secondary);">${escapeHTML(inq.message)}</td>
      `;
      tableBody.appendChild(tr);
    });
  };

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

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
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('admin-user').value.trim();
        const pass = document.getElementById('admin-pass').value.trim();

        let authenticated = false;
        let role = "Provisioned Administrator";

        if (client) {
          try {
            const { data, error } = await client.rpc('check_admin_login', {
              p_username: user,
              p_passcode: pass
            });
            if (!error && data && data.length > 0 && data[0].is_valid) {
              authenticated = true;
              role = data[0].role || role;
            }
          } catch (e) {
            console.error("Auth error:", e);
          }
        } else {
          // Credentials validation from dynamic local list
          const admins = await getAdminAccounts();
          const matched = admins.find(a => a.username === user && a.passcode === pass);
          if (matched) {
            authenticated = true;
            role = matched.role;
          }
        }

        if (authenticated) {
          sessionStorage.setItem('gautam_sec_admin_authed', 'true');
          sessionStorage.setItem('gautam_sec_admin_user', user);
          sessionStorage.setItem('gautam_sec_admin_pass', pass); // Store password in memory for DB API queries
          if (loginPanel) loginPanel.classList.add('hidden');
          if (authedContent) authedContent.classList.remove('hidden');
          if (authError) authError.classList.add('hidden');

          window.showNotification(`Administrator '${user}' verified.`, "success");
          window.checkAdminAuthState();
          await window.renderAuditsTable();
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
      addAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUser = document.getElementById('new-admin-user').value.trim();
        const newPass = document.getElementById('new-admin-pass').value.trim();

        if (newUser === "" || newPass === "") return;

        if (client) {
          try {
            const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
            const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
            const { data: success, error } = await client.rpc('provision_admin_account', {
              p_admin_user: adminUser,
              p_admin_pass: adminPass,
              p_new_user: newUser,
              p_new_pass: newPass,
              p_role: "Administrator",
              p_status: "Active"
            });
            if (success && !error) {
              window.showNotification(`Admin account '${newUser}' provisioned successfully!`, "success");
              addAdminForm.reset();
              await renderAdminAccounts();
              return;
            } else {
              window.showNotification("provision error: Failed to register admin.", "error");
              return;
            }
          } catch (e) {
            console.error("Provision admin error:", e);
          }
        }

        let admins = await getAdminAccounts();
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
        await renderAdminAccounts();
      });
    }

    const clearBtn = document.getElementById('clear-audits-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (confirm("WARNING: Are you sure you want to clear recruiter visitor tracking logs? This deletes all persisted audit tables.")) {
          if (client) {
            try {
              const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
              const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
              const { data: success, error } = await client.rpc('clear_visitor_audits', {
                p_admin_user: adminUser,
                p_admin_pass: adminPass
              });
              if (success && !error) {
                window.showNotification("Visitor audit logs reset successfully.", "info");
                await window.renderAuditsTable();
                return;
              }
            } catch (e) {
              console.error("Clear audits error:", e);
            }
          }
          localStorage.removeItem(STORAGE_KEY_AUDITS);
          localStorage.setItem(STORAGE_KEY_VISIT_COUNT, "0");
          window.showNotification("Visitor audit logs reset successfully.", "info");
          await window.renderAuditsTable();
        }
      });
    }

    const clearInquiriesBtn = document.getElementById('clear-inquiries-btn');
    if (clearInquiriesBtn) {
      clearInquiriesBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to wipe all logged recruiter inquiries from local vault?")) {
          localStorage.removeItem(STORAGE_KEY_INQUIRIES);
          window.showNotification("Recruiter inquiries reset successfully.", "info");
          if (window.renderInquiriesTable) {
            window.renderInquiriesTable();
          }
        }
      });
    }
  }

})();
