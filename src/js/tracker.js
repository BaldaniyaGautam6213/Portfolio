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
  window.supabaseClient = client;

  // Track locally deleted rows to ensure instant UI updates and prevent refetch collisions
  const deletedInquiryIds = new Set();
  const deletedAuditIds = new Set();
  const deletedInquiryTimestamps = new Set();
  const deletedAuditTimestamps = new Set();

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

      let connectionType = "Unknown Connection";
      if (navigator.connection) {
        connectionType = navigator.connection.type || navigator.connection.effectiveType || "Unknown Connection";
      }

      let deviceModel = phoneOrPcSpec;
      if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
        try {
          const uaHints = await navigator.userAgentData.getHighEntropyValues(['model']);
          if (uaHints.model) {
            deviceModel = uaHints.model;
          }
        } catch (e) {}
      }

      const newAuditEntry = {
        timestamp: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
        ip: ipAddress,
        deviceType: deviceType,
        os: platform,
        metrics: screenMetrics,
        spec: phoneOrPcSpec,
        phoneNumber: simulatedPhoneNumber,
        fetchable: fetchableList,
        rawTimestamp: Date.now(),
        device_model: deviceModel,
        connection_type: connectionType
      };

      window.currentSessionTelemetry = newAuditEntry;

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
        // Try direct select first (returns new device_model and connection_type columns)
        let { data, error } = await client.from('visitor_audits').select('*').order('rawTimestamp', { ascending: false });
        // Return database result even if empty array — don't fall back to local if DB returned successfully
        if (!error && data !== null) return data;

        // Fallback to RPC method if direct select fails
        const adminUser = sessionStorage.getItem('gautam_sec_admin_user');
        const adminPass = sessionStorage.getItem('gautam_sec_admin_pass');
        if (adminUser && adminPass) {
          const rpcRes = await client.rpc('get_visitor_audits', {
            p_admin_user: adminUser,
            p_admin_pass: adminPass
          });
          if (!rpcRes.error && rpcRes.data !== null) return rpcRes.data;
          console.error("Error fetching online logs via RPC:", rpcRes.error);
        }
      } catch (e) {
        console.error("Error fetching online logs:", e);
      }
    }
    // Only fall back to local if Supabase is not connected at all
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
        const confirmed = await window.showCyberConfirm(`Are you sure you want to revoke admin credentials for: ${username}?`);
        if (confirmed) {
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

    let logs = await getAuditLogs();
    
    // Filter out locally deleted logs instantly
    logs = logs.filter(log => {
      if (log.id && deletedAuditIds.has(String(log.id))) return false;
      if (log.timestamp && deletedAuditTimestamps.has(log.timestamp)) return false;
      return true;
    });

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
      let tagList = [...log.fetchable];
      if (log.connection_type) {
        tagList.push(`Conn: ${log.connection_type}`);
      }
      const fetchableHtml = tagList.map(item => `<span class="fetchable-tag">${escapeHTML(item)}</span>`).join('');

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
          ${escapeHTML(log.device_model || log.spec)}
          ${isMob ? `<br><span class="badge badge-phone-number"><i data-lucide="phone-off" style="width: 8px; height: 8px; display: inline-block; vertical-align: middle; margin-right: 0.15rem;"></i> ${log.phoneNumber}</span>` : ""}
        </td>
        <td>${fetchableHtml}</td>
        <td style="text-align: center; width: 80px;">
          <button class="delete-audit-btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 6px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)'; this.style.borderColor='#ef4444'; this.style.boxShadow='0 0 8px rgba(239,68,68,0.5)';" onmouseout="this.style.background='rgba(239,68,68,0.1)'; this.style.borderColor='rgba(239,68,68,0.4)'; this.style.boxShadow='none';">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      `;

      const deleteBtn = tr.querySelector('.delete-audit-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          window.deleteAuditRow(log.id, log.timestamp, log.rawTimestamp);
        });
      }

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
  window.renderInquiriesTable = async function() {
    const tableBody = document.getElementById('inquiries-table-body');
    if (!tableBody) return;
    
    let inquiries = [];
    let fetchedFromSupabase = false;

    // Attempt fetching from Supabase if connected
    if (client) {
      try {
        let { data, error } = await client.from('recruiter_inquiries').select('*').order('timestamp', { ascending: false });
        if (!error && data !== null) {
          // DB returned successfully (even if empty after wipe) — trust it
          inquiries = data;
          fetchedFromSupabase = true;
        }
      } catch (e) {
        console.error("Error fetching online inquiries from Supabase:", e);
      }
    }

    // Only fall back to local storage if Supabase is completely offline
    if (!fetchedFromSupabase) {
      const data = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      inquiries = data ? JSON.parse(data) : [];
    }

    // Filter out locally deleted inquiries instantly
    inquiries = inquiries.filter(inq => {
      if (inq.id && deletedInquiryIds.has(String(inq.id))) return false;
      if (inq.timestamp && deletedInquiryTimestamps.has(inq.timestamp)) return false;
      return true;
    });
    
    tableBody.innerHTML = "";
    
    if (inquiries.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); font-family: var(--font-mono);">NO RECRUITER INQUIRIES REGISTERED IN DATABASE</td>
        </tr>
      `;
      return;
    }
    
    inquiries.forEach(inq => {
      const tr = document.createElement('tr');
      const ts = inq.timestamp || inq.created_at || '';
      
      const dev = inq.device || 'Unknown';
      const isMob = dev === "Mobile Phone" || dev === "Tablet" || dev.toLowerCase().includes("phone") || dev.toLowerCase().includes("ipad");
      const badgeClass = isMob ? "badge-mobile" : "badge-desktop";
      const icon = isMob ? "smartphone" : "monitor";
      
      tr.innerHTML = `
        <td style="white-space: nowrap; color: var(--text-primary); font-weight: 700;">[${ts}]</td>
        <td class="text-cyber-green" style="font-weight: 700;">${escapeHTML(inq.name)}</td>
        <td><a href="mailto:${inq.email}" class="text-cyber-blue link">${escapeHTML(inq.email)}</a></td>
        <td style="color: var(--text-primary); font-weight: bold;">${escapeHTML(inq.subject || 'Inquiry')}</td>
        <td class="text-cyber-green">${escapeHTML(inq.ip || 'Unknown')}</td>
        <td>
          <span class="badge ${badgeClass}" style="font-size: 0.65rem;">
            <i data-lucide="${icon}" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;"></i>
            ${escapeHTML(inq.device_model || dev)}
          </span>
          <br><small style="color: var(--text-muted); font-size: 0.65rem; font-family: var(--font-mono);">${escapeHTML(inq.os || '')} | Net: ${escapeHTML(inq.connection_type || 'Unknown')}</small>
        </td>
        <td style="white-space: normal; line-height: 1.4; min-width: 200px; color: var(--text-secondary);">${escapeHTML(inq.message)}</td>
        <td style="text-align: center; width: 80px;">
          <button class="delete-inq-btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 6px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)'; this.style.borderColor='#ef4444'; this.style.boxShadow='0 0 8px rgba(239,68,68,0.5)';" onmouseout="this.style.background='rgba(239,68,68,0.1)'; this.style.borderColor='rgba(239,68,68,0.4)'; this.style.boxShadow='none';">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      `;

      const deleteBtn = tr.querySelector('.delete-inq-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          window.deleteInquiryRow(inq.id, ts);
        });
      }

      tableBody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };

  function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        const confirmed = await window.showCyberConfirm("WARNING: Are you sure you want to clear visitor tracking logs? This deletes all persisted audit records.");
        if (confirmed) {
          // ALWAYS clear localStorage first so data never comes back from local fallback
          localStorage.removeItem(STORAGE_KEY_AUDITS);
          localStorage.setItem(STORAGE_KEY_VISIT_COUNT, "0");
          deletedAuditIds.clear();
          deletedAuditTimestamps.clear();

          // Wipe ALL rows in visitor_audits (use ip column which is always set)
          if (client) {
            try {
              const { error } = await client.from('visitor_audits').delete().not('ip', 'is', null);
              if (error) console.error("Clear visitor_audits error:", error);
            } catch (e) {
              console.error("Clear audits error:", e);
            }
          }

          window.showNotification("Visitor audit logs reset successfully.", "info");
          await window.renderAuditsTable();
        }
      });
    }

    const clearInquiriesBtn = document.getElementById('clear-inquiries-btn');
    if (clearInquiriesBtn) {
      clearInquiriesBtn.addEventListener('click', async () => {
        const confirmed = await window.showCyberConfirm("Are you sure you want to wipe all logged recruiter inquiries? This will delete them from the database too.");
        if (confirmed) {
          // ALWAYS clear localStorage first so data never comes back from local fallback
          localStorage.removeItem(STORAGE_KEY_INQUIRIES);
          deletedInquiryIds.clear();
          deletedInquiryTimestamps.clear();

          // Wipe table in Supabase using direct delete (requires DELETE RLS policy)
          if (client) {
            try {
              const { error } = await client.from('recruiter_inquiries').delete().neq('id', -999999);
              if (error) console.error("Clear recruiter_inquiries error:", error);
            } catch(e) {
              console.error("Error wiping online inquiries:", e);
            }
          }

          window.showNotification("Recruiter inquiries reset successfully.", "info");
          if (window.renderInquiriesTable) {
            window.renderInquiriesTable();
          }
        }
      });
    }
  }

  window.deleteInquiryRow = async function(id, timestamp) {
    const confirmed = await window.showCyberConfirm("Are you sure you want to delete this recruiter inquiry?");
    if (!confirmed) return;
    
    // Add to local deleted tracking sets immediately for instant UI response
    if (id) deletedInquiryIds.add(String(id));
    if (timestamp) deletedInquiryTimestamps.add(timestamp);
    
    // Remove from localStorage immediately
    const localData = localStorage.getItem(STORAGE_KEY_INQUIRIES);
    if (localData) {
      let inquiries = JSON.parse(localData);
      inquiries = inquiries.filter(inq => {
        if (id && inq.id) return String(inq.id) !== String(id);
        return inq.timestamp !== timestamp;
      });
      localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(inquiries));
    }

    // Trigger table re-render instantly
    if (window.renderInquiriesTable) {
      window.renderInquiriesTable();
    }
    
    // Delete from Supabase using direct table delete (requires DELETE RLS policy)
    if (client) {
      try {
        if (id) {
          const { error } = await client.from('recruiter_inquiries').delete().eq('id', id);
          if (error) console.warn("recruiter_inquiries delete error:", error);
        } else if (timestamp) {
          const { error } = await client.from('recruiter_inquiries').delete().eq('timestamp', timestamp);
          if (error) console.warn("recruiter_inquiries delete error:", error);
        }
      } catch (e) {
        console.error("Supabase delete error:", e);
      }
    }
    
    window.showNotification("Inquiry deleted successfully", "success");
  };

  window.deleteAuditRow = async function(id, timestamp, rawTimestamp) {
    const confirmed = await window.showCyberConfirm("Are you sure you want to delete this visitor log?");
    if (!confirmed) return;
    
    // Add to local deleted tracking sets immediately for instant UI response
    if (id) deletedAuditIds.add(String(id));
    if (timestamp) deletedAuditTimestamps.add(timestamp);

    // Remove from localStorage immediately
    const localData = localStorage.getItem(STORAGE_KEY_AUDITS);
    if (localData) {
      let logs = JSON.parse(localData);
      logs = logs.filter(log => {
        if (rawTimestamp && log.rawTimestamp) return String(log.rawTimestamp) !== String(rawTimestamp);
        if (id && log.id) return String(log.id) !== String(id);
        return log.timestamp !== timestamp;
      });
      localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(logs));
    }

    // Trigger table re-render instantly
    if (window.renderAuditsTable) {
      window.renderAuditsTable();
    }
    
    // Delete from Supabase - try multiple column matches for reliability
    if (client) {
      try {
        let deleted = false;
        // Try by rawTimestamp first (most unique)
        if (rawTimestamp) {
          const { error, count } = await client.from('visitor_audits').delete().eq('rawTimestamp', rawTimestamp);
          if (!error) deleted = true;
          else console.warn("visitor_audits delete by rawTimestamp error:", error);
        }
        // Try by id if rawTimestamp failed
        if (!deleted && id) {
          const { error } = await client.from('visitor_audits').delete().eq('id', id);
          if (!error) deleted = true;
          else console.warn("visitor_audits delete by id error:", error);
        }
        // Try by timestamp string as last resort
        if (!deleted && timestamp) {
          const { error } = await client.from('visitor_audits').delete().eq('timestamp', timestamp);
          if (!error) deleted = true;
          else console.warn("visitor_audits delete by timestamp error:", error);
        }
      } catch (e) {
        console.error("Supabase delete error:", e);
      }
    }
    
    window.showNotification("Visitor log deleted successfully", "success");
  };

})();

/* ==========================================================================
   RECRUITER GATE MODAL — download & open tracking
   with real-time company verification (Clearbit APIs)
   ========================================================================== */
(function() {
  // Free / personal email providers — flagged as suspicious
  const FREE_PROVIDERS = new Set([
    'gmail.com','yahoo.com','yahoo.in','hotmail.com','outlook.com','live.com',
    'icloud.com','me.com','protonmail.com','proton.me','aol.com','mail.com',
    'ymail.com','rediffmail.com','zoho.com','tutanota.com','gmx.com',
    'msn.com','yandex.com','yandex.ru','163.com','qq.com','126.com',
    'inbox.com','fastmail.com','tempmail.com','guerrillamail.com','mailinator.com',
    'throwam.com','sharklasers.com','guerrillamailblock.com','spam4.me'
  ]);

  // Clearbit free endpoints — no API key required
  const CLEARBIT_AUTOCOMPLETE = 'https://autocomplete.clearbit.com/v1/companies/suggest?query=';
  const CLEARBIT_LOGO         = 'https://logo.clearbit.com/';

  const PDF_PATH              = './Gautam_Baldaniya_Cybersecurity_Resume.pdf';
  const SESSION_PASS_KEY      = 'gautam_sec_gate_passed';
  const SESSION_SUSPICIOUS    = 'gautam_sec_gate_suspicious';
  const STORAGE_KEY_INQUIRIES = 'gautam_sec_recruiter_inquiries';

  let pendingAction          = null;  // 'open' | 'download'
  let selectedCompany        = null;  // { name, domain, logo } from Clearbit autocomplete
  let emailDomainVerified    = false; // true if Clearbit logo probe succeeded
  let emailDomainLogo        = null;  // URL if logo found
  let companyAutoTimer       = null;
  let emailVerifyTimer       = null;
  let autocompleteResults    = [];

  /* -------------------------------------------------------------------------
     Determine if we need to show the gate for this session
     - Company email → once per session (pass stored in sessionStorage)
     - Free email    → every session (no pass stored)
     ------------------------------------------------------------------------- */
  function gateRequired() {
    return sessionStorage.getItem(SESSION_PASS_KEY) !== 'true';
  }

  /* -------------------------------------------------------------------------
     Open the gate modal
     ------------------------------------------------------------------------- */
  function openGateModal(action) {
    pendingAction = action;
    const modal = document.getElementById('recruiter-gate-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    populateTelemetryPreview();
    resetGateForm();
    // Focus first field
    setTimeout(() => {
      const nameInput = document.getElementById('gate-name');
      if (nameInput) nameInput.focus();
    }, 350);
  }

  function closeGateModal() {
    const modal = document.getElementById('recruiter-gate-modal');
    if (modal) modal.classList.add('hidden');
    hideAutocompleteDropdown();
    pendingAction = null;
  }

  /* -------------------------------------------------------------------------
     Telemetry preview bar inside the modal
     ------------------------------------------------------------------------- */
  function populateTelemetryPreview() {
    const el = document.getElementById('gate-telemetry-preview');
    if (!el) return;
    const session = window.currentSessionTelemetry || {};
    const ip  = session.ip   || 'Resolving...';
    const dev = session.spec || session.deviceType || 'Unknown Device';
    const tz  = session.fetchable
      ? (session.fetchable.find(f => f.startsWith('Timezone:')) || '').replace('Timezone: ', '')
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    el.textContent = `IP: ${ip} | ${dev}${tz ? ' | TZ: ' + tz : ''}`;
  }

  /* =========================================================================
     COMPANY AUTOCOMPLETE — Clearbit Company Suggest API
     ========================================================================= */

  function initCompanyAutocomplete() {
    const companyInput = document.getElementById('gate-company');
    if (!companyInput) return;

    // Inject autocomplete dropdown container below the company field
    let dropdown = document.getElementById('gate-company-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'gate-company-dropdown';
      dropdown.className = 'gate-ac-dropdown hidden';
      companyInput.parentNode.appendChild(dropdown);
    }

    companyInput.addEventListener('input', () => {
      clearTimeout(companyAutoTimer);
      const q = companyInput.value.trim();
      if (q.length < 2) {
        hideAutocompleteDropdown();
        selectedCompany = null;
        return;
      }
      // Show loading state in dropdown
      showDropdownLoading(dropdown);
      companyAutoTimer = setTimeout(() => fetchCompanySuggestions(q, dropdown, companyInput), 380);
    });

    companyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideAutocompleteDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!companyInput.contains(e.target) && !dropdown.contains(e.target)) {
        hideAutocompleteDropdown();
      }
    });
  }

  async function fetchCompanySuggestions(query, dropdown, input) {
    try {
      const res = await fetch(CLEARBIT_AUTOCOMPLETE + encodeURIComponent(query));
      if (!res.ok) { hideAutocompleteDropdown(); return; }
      autocompleteResults = await res.json();
      renderAutocompleteDropdown(autocompleteResults, dropdown, input);
    } catch(e) {
      hideAutocompleteDropdown();
    }
  }

  function showDropdownLoading(dropdown) {
    dropdown.classList.remove('hidden');
    dropdown.innerHTML = `
      <div class="gate-ac-loading">
        <span class="gate-ac-spinner"></span>
        <span>Querying company registry...</span>
      </div>
    `;
  }

  function renderAutocompleteDropdown(results, dropdown, input) {
    if (!results || results.length === 0) {
      dropdown.innerHTML = `<div class="gate-ac-empty">No companies found — try a different name</div>`;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = '';
    dropdown.classList.remove('hidden');

    results.slice(0, 7).forEach(company => {
      const item = document.createElement('div');
      item.className = 'gate-ac-item';
      item.innerHTML = `
        <div class="gate-ac-logo-wrap">
          ${company.logo
            ? `<img src="${company.logo}" alt="${company.name}" class="gate-ac-logo" onerror="this.parentNode.innerHTML='<span class=\\"gate-ac-logo-fallback\\">${(company.name||'?')[0].toUpperCase()}</span>'">`
            : `<span class="gate-ac-logo-fallback">${(company.name||'?')[0].toUpperCase()}</span>`
          }
        </div>
        <div class="gate-ac-info">
          <span class="gate-ac-name">${escapeAC(company.name)}</span>
          <span class="gate-ac-domain">${escapeAC(company.domain || '')}</span>
        </div>
        <span class="gate-ac-verified-chip">✓ Verified</span>
      `;
      item.addEventListener('click', () => {
        selectCompany(company, input, dropdown);
      });
      dropdown.appendChild(item);
    });
  }

  function selectCompany(company, input, dropdown) {
    input.value        = company.name;
    selectedCompany    = company;
    input.classList.remove('input-error');
    input.classList.add('input-success');

    // Show verified badge on company field
    setCompanyVerifiedBadge(company);

    hideAutocompleteDropdown();

    // If email is already filled in — re-run cross-reference immediately
    const emailEl = document.getElementById('gate-email');
    if (emailEl && emailEl.value.includes('@')) {
      runEmailVerification(emailEl.value.trim());
    }
  }

  function setCompanyVerifiedBadge(company) {
    let badge = document.getElementById('gate-company-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'gate-company-badge';
      badge.className = 'gate-company-verified-badge';
      const companyInput = document.getElementById('gate-company');
      if (companyInput && companyInput.parentNode) {
        companyInput.parentNode.insertBefore(badge, companyInput.nextSibling);
      }
    }
    badge.innerHTML = `
      ${company.logo
        ? `<img src="${company.logo}" alt="${company.name}" class="gate-badge-logo" onerror="this.style.display='none'">`
        : ''}
      <span class="gate-badge-name">${escapeAC(company.name)}</span>
      <span class="gate-badge-chip verified">✓ COMPANY FOUND</span>
      ${company.domain ? `<span class="gate-badge-domain">@ ${escapeAC(company.domain)}</span>` : ''}
    `;
    badge.classList.remove('hidden');
  }

  function hideAutocompleteDropdown() {
    const dropdown = document.getElementById('gate-company-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  function escapeAC(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* =========================================================================
     EMAIL DOMAIN VERIFICATION — Clearbit Logo API probe + cross-reference
     ========================================================================= */

  async function runEmailVerification(email) {
    const hintEl  = document.getElementById('gate-email-trust');
    const flagEl  = document.getElementById('gate-suspicious-flag');
    const badgeEl = document.getElementById('gate-email-domain-badge');
    if (!hintEl) return;

    const domain = (email.split('@')[1] || '').toLowerCase();
    if (!domain || !domain.includes('.')) {
      clearEmailBadge();
      return;
    }

    // 1. Check free provider list first (instant)
    if (FREE_PROVIDERS.has(domain)) {
      hintEl.textContent = '⚠  Personal email — session will be flagged for review';
      hintEl.style.color = 'var(--cyber-yellow)';
      if (flagEl) flagEl.classList.remove('hidden');
      emailDomainVerified = false;
      emailDomainLogo     = null;
      showEmailDomainBadge('suspicious', domain, null);
      return;
    }

    // 2. Show "checking..." state
    hintEl.textContent = '⟳  Probing company domain registry...';
    hintEl.style.color = 'var(--text-muted)';
    if (flagEl) flagEl.classList.add('hidden');
    showEmailDomainBadge('checking', domain, null);

    // 3. Clearbit logo probe — load as Image (avoids CORS), 200 = company exists
    const logoExists = await probeClearbitLogo(domain);
    emailDomainVerified = logoExists;
    emailDomainLogo     = logoExists ? `${CLEARBIT_LOGO}${domain}` : null;

    // 4. Cross-reference with autocomplete selection
    const crossMatch = selectedCompany && selectedCompany.domain &&
                       selectedCompany.domain.toLowerCase() === domain;

    if (crossMatch && logoExists) {
      // STRONGEST: selected from Clearbit list AND email domain matches
      hintEl.textContent = `✓  ${selectedCompany.name} — Domain & company cross-verified`;
      hintEl.style.color = 'var(--cyber-green)';
      showEmailDomainBadge('strong', domain, emailDomainLogo);
      if (flagEl) flagEl.classList.add('hidden');
    } else if (logoExists) {
      // MEDIUM: domain recognized by Clearbit but no autocomplete match
      hintEl.textContent = `✓  Recognized corporate domain — company verified`;
      hintEl.style.color = 'var(--cyber-green)';
      showEmailDomainBadge('verified', domain, emailDomainLogo);
      if (flagEl) flagEl.classList.add('hidden');
    } else if (selectedCompany && !crossMatch) {
      // Company selected from list but email domain doesn't match
      hintEl.textContent = `⚠  Email domain doesn't match "${selectedCompany.name}"`;
      hintEl.style.color = 'var(--cyber-yellow)';
      showEmailDomainBadge('mismatch', domain, null);
      if (flagEl) flagEl.classList.remove('hidden');
    } else {
      // Unknown domain — not in Clearbit database
      hintEl.textContent = `ℹ  Unknown domain — not found in company registry`;
      hintEl.style.color = 'var(--text-muted)';
      showEmailDomainBadge('unknown', domain, null);
      if (flagEl) flagEl.classList.add('hidden');
    }
  }

  /**
   * Probes Clearbit Logo API by loading the image.
   * Returns true if the domain has a recognized company logo (= real company).
   */
  function probeClearbitLogo(domain) {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => { img.src = ''; resolve(false); }, 4000);
      img.onload  = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = `${CLEARBIT_LOGO}${domain}?size=24`;
    });
  }

  function showEmailDomainBadge(state, domain, logoUrl) {
    let badge = document.getElementById('gate-email-domain-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'gate-email-domain-badge';
      badge.className = 'gate-email-verify-badge';
      const emailInput = document.getElementById('gate-email');
      if (emailInput && emailInput.parentNode) {
        // Insert after the hint span
        const hintEl = document.getElementById('gate-email-trust');
        if (hintEl && hintEl.nextSibling) {
          emailInput.parentNode.insertBefore(badge, hintEl.nextSibling);
        } else {
          emailInput.parentNode.appendChild(badge);
        }
      }
    }

    const stateMap = {
      checking:   { chip: '⟳ Checking...', cls: 'checking',   icon: '' },
      strong:     { chip: '✓✓ CROSS-VERIFIED', cls: 'strong',  icon: '' },
      verified:   { chip: '✓ DOMAIN VERIFIED', cls: 'verified', icon: '' },
      mismatch:   { chip: '⚠ DOMAIN MISMATCH', cls: 'mismatch', icon: '' },
      suspicious: { chip: '⚠ PERSONAL EMAIL', cls: 'suspicious', icon: '' },
      unknown:    { chip: 'ℹ UNVERIFIED DOMAIN', cls: 'unknown', icon: '' },
    };

    const s = stateMap[state] || stateMap.unknown;
    badge.className = `gate-email-verify-badge state-${s.cls}`;
    badge.innerHTML = `
      ${logoUrl ? `<img src="${logoUrl}" alt="${domain}" class="gate-badge-logo" onerror="this.style.display='none'">` : ''}
      <span class="gate-badge-domain-text">${escapeAC(domain)}</span>
      <span class="gate-badge-chip ${s.cls}">${s.chip}</span>
    `;
    badge.classList.remove('hidden');
  }

  function clearEmailBadge() {
    const badge = document.getElementById('gate-email-domain-badge');
    if (badge) badge.classList.add('hidden');
    const hint = document.getElementById('gate-email-trust');
    if (hint) { hint.textContent = ''; hint.style.color = ''; }
    const flag = document.getElementById('gate-suspicious-flag');
    if (flag) flag.classList.add('hidden');
    emailDomainVerified = false;
    emailDomainLogo     = null;
  }

  /* -------------------------------------------------------------------------
     Form validation
     ------------------------------------------------------------------------- */
  function validateGateForm() {
    let valid = true;

    const fields = [
      { id: 'gate-name',    errId: 'gate-name-err',    label: 'Full name',    minLen: 2 },
      { id: 'gate-company', errId: 'gate-company-err', label: 'Company name', minLen: 2 },
    ];

    fields.forEach(f => {
      const input = document.getElementById(f.id);
      const err   = document.getElementById(f.errId);
      if (!input || !err) return;
      const val = input.value.trim();
      if (!val || val.length < f.minLen) {
        err.textContent = `${f.label} is required`;
        input.classList.add('input-error');
        input.classList.remove('input-success');
        valid = false;
      } else {
        err.textContent = '';
        input.classList.remove('input-error');
        input.classList.add('input-success');
      }
    });

    // Email
    const emailInput = document.getElementById('gate-email');
    const emailErr   = document.getElementById('gate-email-err');
    const emailVal   = emailInput ? emailInput.value.trim() : '';
    const emailRe    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRe.test(emailVal)) {
      if (emailErr) emailErr.textContent = 'Valid email address is required';
      if (emailInput) { emailInput.classList.add('input-error'); emailInput.classList.remove('input-success'); }
      valid = false;
    } else {
      if (emailErr) emailErr.textContent = '';
      if (emailInput) { emailInput.classList.remove('input-error'); emailInput.classList.add('input-success'); }
    }

    // Phone — must have at least 7 digits
    const phoneInput = document.getElementById('gate-phone');
    const phoneErr   = document.getElementById('gate-phone-err');
    const phoneVal   = phoneInput ? phoneInput.value.trim() : '';
    const digits     = (phoneVal.replace(/\D/g, '') || '').length;
    if (!phoneVal || digits < 7) {
      if (phoneErr) phoneErr.textContent = 'Valid phone number is required';
      if (phoneInput) { phoneInput.classList.add('input-error'); phoneInput.classList.remove('input-success'); }
      valid = false;
    } else {
      if (phoneErr) phoneErr.textContent = '';
      if (phoneInput) { phoneInput.classList.remove('input-error'); phoneInput.classList.add('input-success'); }
    }

    return valid;
  }

  /* -------------------------------------------------------------------------
     Determine verification trust level for saving
     ------------------------------------------------------------------------- */
  function getTrustLevel(emailDomain) {
    if (FREE_PROVIDERS.has(emailDomain)) return 'SUSPICIOUS';
    const crossMatch = selectedCompany && selectedCompany.domain &&
                       selectedCompany.domain.toLowerCase() === emailDomain;
    if (crossMatch && emailDomainVerified) return 'CROSS_VERIFIED';
    if (emailDomainVerified) return 'DOMAIN_VERIFIED';
    if (selectedCompany)    return 'COMPANY_SELECTED';
    return 'UNVERIFIED';
  }

  /* -------------------------------------------------------------------------
     Save the recruiter lead
     ------------------------------------------------------------------------- */
  async function saveRecruiterLead(name, company, email, phone) {
    const domain       = (email.split('@')[1] || '').toLowerCase();
    const isSuspicious = FREE_PROVIDERS.has(domain);
    const trustLevel   = getTrustLevel(domain);

    const session = window.currentSessionTelemetry || {};
    const ts = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false })
             + '.' + String(new Date().getMilliseconds()).padStart(3, '0');

    // Build a rich verification summary for the message field
    const verifySummary = [
      `Company: ${company}`,
      `Clearbit Match: ${selectedCompany ? selectedCompany.name + ' (' + (selectedCompany.domain||'N/A') + ')' : 'None selected'}`,
      `Email Domain Logo: ${emailDomainVerified ? 'FOUND ✓' : 'Not found'}`,
      `Trust Level: ${trustLevel}`,
      `Phone: ${phone}`,
      `Action: ${pendingAction || 'download'}`,
    ].join(' | ');

    const entry = {
      timestamp:       ts,
      name:            name,
      email:           email,
      subject:         `RESUME_DOWNLOAD [${trustLevel}]`,
      message:         verifySummary,
      ip:              session.ip            || 'Unknown',
      device:          session.deviceType    || 'Unknown',
      os:              session.os            || 'Unknown',
      spec:            session.spec          || 'Unknown',
      device_model:    session.device_model  || 'Unknown',
      connection_type: session.connection_type || 'Unknown',
    };

    // 1. Save locally
    try {
      const localData = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      const inquiries = localData ? JSON.parse(localData) : [];
      inquiries.unshift(entry);
      localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(inquiries));
    } catch(e) {}

    // 2. Push to Supabase
    const client = window.supabaseClient;
    if (client) {
      try {
        await client.from('recruiter_inquiries').insert([entry]);
      } catch(e) {
        console.warn('Gate: Supabase insert failed:', e);
      }
    }

    // 3. Email alert via FormSubmit
    const trustEmoji = {
      CROSS_VERIFIED:  '✅ CROSS-VERIFIED',
      DOMAIN_VERIFIED: '✓ DOMAIN VERIFIED',
      COMPANY_SELECTED:'🔵 COMPANY SELECTED (domain not verified)',
      SUSPICIOUS:      '⚠ SUSPICIOUS — FREE EMAIL',
      UNVERIFIED:      'ℹ UNVERIFIED DOMAIN',
    };

    try {
      fetch('https://formsubmit.co/ajax/gautam6213@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name:     `${name} (${company})`,
          email:    email,
          message:  `📄 RESUME DOWNLOAD ALERT\n\nName: ${name}\nCompany: ${company}\nEmail: ${email}\nPhone: ${phone}\n\n🔍 VERIFICATION RESULT: ${trustEmoji[trustLevel] || trustLevel}\nClearbit Company Match: ${selectedCompany ? selectedCompany.name : 'None'}\nDomain Logo Probe: ${emailDomainVerified ? 'PASS ✓' : 'FAIL'}\n\nDevice: ${session.deviceType||'N/A'} | IP: ${session.ip||'N/A'}\nAction: ${pendingAction}`,
          _subject: `[RESUME] ${name} @ ${company} — ${trustEmoji[trustLevel] || trustLevel}`,
          _captcha: 'false'
        })
      }).catch(() => {});
    } catch(e) {}

    // 4. Refresh admin inquiries table
    if (window.renderInquiriesTable) window.renderInquiriesTable();

    // 5. Session bypass — only for non-suspicious
    if (!isSuspicious) {
      sessionStorage.setItem(SESSION_PASS_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_PASS_KEY);
      sessionStorage.setItem(SESSION_SUSPICIOUS, 'true');
    }

    return { isSuspicious, trustLevel };
  }

  /* -------------------------------------------------------------------------
     Trigger the actual PDF action after verification
     ------------------------------------------------------------------------- */
  function executePdfAction(action) {
    if (action === 'open') {
      window.open(PDF_PATH, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = PDF_PATH;
      a.download = 'Gautam_Baldaniya_Cybersecurity_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  /* -------------------------------------------------------------------------
     Reset form fields & error states
     ------------------------------------------------------------------------- */
  function resetGateForm() {
    // Reset state vars
    selectedCompany     = null;
    emailDomainVerified = false;
    emailDomainLogo     = null;

    ['gate-name','gate-company','gate-email','gate-phone'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('input-error','input-success'); }
    });
    ['gate-name-err','gate-company-err','gate-email-err','gate-phone-err'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });

    const hintEl = document.getElementById('gate-email-trust');
    if (hintEl) { hintEl.textContent = ''; hintEl.style.color = ''; }
    const flagEl = document.getElementById('gate-suspicious-flag');
    if (flagEl) flagEl.classList.add('hidden');

    // Remove injected badges
    ['gate-company-badge','gate-email-domain-badge'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    hideAutocompleteDropdown();

    // Reset submit btn
    const btn  = document.getElementById('gate-submit-btn');
    const icon = document.getElementById('gate-submit-icon');
    const txt  = document.getElementById('gate-submit-text');
    if (btn)  btn.disabled = false;
    if (icon) icon.setAttribute('data-lucide', 'unlock');
    if (txt)  txt.textContent = 'VERIFY & ACCESS RESUME';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* -------------------------------------------------------------------------
     Wire up all button click interceptions
     ------------------------------------------------------------------------- */
  function initGateInterception() {
    // Hero download button
    const heroBtn = document.getElementById('hero-resume-btn');
    if (heroBtn) {
      heroBtn.addEventListener('click', (e) => {
        e.preventDefault();
        gateRequired() ? openGateModal('download') : executePdfAction('download');
      });
    }

    // Resume page — Open PDF directly
    const openBtn = document.getElementById('resume-open-btn');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        gateRequired() ? openGateModal('open') : executePdfAction('open');
      });
    }

    // Resume page — Download PDF
    const dlBtn = document.getElementById('resume-download-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', (e) => {
        e.preventDefault();
        gateRequired() ? openGateModal('download') : executePdfAction('download');
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('gate-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeGateModal);

    // Click outside to close
    const modal = document.getElementById('recruiter-gate-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeGateModal();
      });
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('recruiter-gate-modal');
        if (modal && !modal.classList.contains('hidden')) closeGateModal();
      }
    });

    // -----------------------------------------------------------------------
    // Company field — Clearbit autocomplete
    // -----------------------------------------------------------------------
    initCompanyAutocomplete();

    // -----------------------------------------------------------------------
    // Email field — debounced domain verification
    // -----------------------------------------------------------------------
    const emailInput = document.getElementById('gate-email');
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        clearTimeout(emailVerifyTimer);
        const val = emailInput.value.trim();
        if (!val.includes('@') || !val.split('@')[1]) {
          clearEmailBadge();
          return;
        }
        // Short debounce so we don't fire on every keystroke
        emailVerifyTimer = setTimeout(() => runEmailVerification(val), 600);
      });
    }

    // -----------------------------------------------------------------------
    // Form submit
    // -----------------------------------------------------------------------
    const form = document.getElementById('recruiter-gate-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateGateForm()) return;

        const name    = document.getElementById('gate-name').value.trim();
        const company = document.getElementById('gate-company').value.trim();
        const email   = document.getElementById('gate-email').value.trim();
        const phone   = document.getElementById('gate-phone').value.trim();

        const btn  = document.getElementById('gate-submit-btn');
        const icon = document.getElementById('gate-submit-icon');
        const txt  = document.getElementById('gate-submit-text');
        if (btn)  btn.disabled = true;
        if (icon) icon.setAttribute('data-lucide', 'loader');
        if (txt)  txt.textContent = 'VERIFYING...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
          const { isSuspicious, trustLevel } = await saveRecruiterLead(name, company, email, phone);

          if (icon) icon.setAttribute('data-lucide', 'check-circle');
          if (txt)  txt.textContent = 'ACCESS GRANTED';
          if (typeof lucide !== 'undefined') lucide.createIcons();

          if (window.showNotification) {
            if (isSuspicious) {
              window.showNotification('Lead captured — personal email flagged for review.', 'info');
            } else if (trustLevel === 'CROSS_VERIFIED') {
              window.showNotification('Cross-verified recruiter identity. Accessing resume...', 'success');
            } else {
              window.showNotification('Identity verified. Accessing resume files...', 'success');
            }
          }

          setTimeout(() => {
            closeGateModal();
            executePdfAction(pendingAction || 'download');
          }, 900);

        } catch(err) {
          console.error('Gate save error:', err);
          if (icon) icon.setAttribute('data-lucide', 'unlock');
          if (txt)  txt.textContent = 'VERIFY & ACCESS RESUME';
          if (btn)  btn.disabled = false;
          if (typeof lucide !== 'undefined') lucide.createIcons();
          // Never block the recruiter — open file anyway
          closeGateModal();
          executePdfAction(pendingAction || 'download');
        }
      });
    }
  }

  // Init after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGateInterception);
  } else {
    initGateInterception();
  }

})();

  const STORAGE_KEY_INQUIRIES = 'gautam_sec_recruiter_inquiries';

  let pendingAction = null; // 'open' | 'download'

  /* -------------------------------------------------------------------------
     Determine if we need to show the gate for this session
     - Company email → once per session (pass stored in sessionStorage)
     - Free email    → every session (no pass stored)
     ------------------------------------------------------------------------- */
  function gateRequired() {
    return sessionStorage.getItem(SESSION_PASS_KEY) !== 'true';
  }

  /* -------------------------------------------------------------------------
     Open the gate modal
     ------------------------------------------------------------------------- */
  function openGateModal(action) {
    pendingAction = action;
    const modal = document.getElementById('recruiter-gate-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    // Refresh icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Populate telemetry preview
    populateTelemetryPreview();

    // Reset form state
    resetGateForm();
  }

  function closeGateModal() {
    const modal = document.getElementById('recruiter-gate-modal');
    if (modal) modal.classList.add('hidden');
    pendingAction = null;
  }

  /* -------------------------------------------------------------------------
     Telemetry preview bar inside the modal
     ------------------------------------------------------------------------- */
  function populateTelemetryPreview() {
    const el = document.getElementById('gate-telemetry-preview');
    if (!el) return;
    const session = window.currentSessionTelemetry || {};
    const ip   = session.ip   || 'Resolving...';
    const dev  = session.spec || session.deviceType || 'Unknown Device';
    const tz   = session.fetchable
      ? (session.fetchable.find(f => f.startsWith('Timezone:')) || '').replace('Timezone: ', '')
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    el.textContent = `IP: ${ip} | ${dev}${tz ? ' | TZ: ' + tz : ''}`;
  }

  /* -------------------------------------------------------------------------
     Real-time email legitimacy feedback
     ------------------------------------------------------------------------- */
  function checkEmailLegitimacy(email) {
    const hintEl  = document.getElementById('gate-email-trust');
    const flagEl  = document.getElementById('gate-suspicious-flag');
    if (!hintEl || !flagEl) return;

    const domain = email.split('@')[1] || '';
    if (!domain) { hintEl.textContent = ''; hintEl.style.color = ''; flagEl.classList.add('hidden'); return; }

    if (FREE_PROVIDERS.has(domain.toLowerCase())) {
      hintEl.textContent = '⚠ Personal email — session will be flagged';
      hintEl.style.color = 'var(--cyber-yellow)';
      flagEl.classList.remove('hidden');
    } else {
      hintEl.textContent = '✓ Company email verified';
      hintEl.style.color = 'var(--cyber-green)';
      flagEl.classList.add('hidden');
    }
  }

  /* -------------------------------------------------------------------------
     Form validation
     ------------------------------------------------------------------------- */
  function validateGateForm() {
    let valid = true;

    const fields = [
      { id: 'gate-name',    errId: 'gate-name-err',    label: 'Full name',    minLen: 2 },
      { id: 'gate-company', errId: 'gate-company-err', label: 'Company name', minLen: 2 },
    ];

    fields.forEach(f => {
      const input = document.getElementById(f.id);
      const err   = document.getElementById(f.errId);
      if (!input || !err) return;
      const val = input.value.trim();
      if (!val || val.length < f.minLen) {
        err.textContent = `${f.label} is required`;
        input.classList.add('input-error');
        input.classList.remove('input-success');
        valid = false;
      } else {
        err.textContent = '';
        input.classList.remove('input-error');
        input.classList.add('input-success');
      }
    });

    // Email
    const emailInput = document.getElementById('gate-email');
    const emailErr   = document.getElementById('gate-email-err');
    const emailVal   = emailInput ? emailInput.value.trim() : '';
    const emailRe    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRe.test(emailVal)) {
      if (emailErr) emailErr.textContent = 'Valid email address is required';
      if (emailInput) { emailInput.classList.add('input-error'); emailInput.classList.remove('input-success'); }
      valid = false;
    } else {
      if (emailErr) emailErr.textContent = '';
      if (emailInput) { emailInput.classList.remove('input-error'); emailInput.classList.add('input-success'); }
    }

    // Phone — must have at least 7 digits
    const phoneInput = document.getElementById('gate-phone');
    const phoneErr   = document.getElementById('gate-phone-err');
    const phoneVal   = phoneInput ? phoneInput.value.trim() : '';
    const digits     = (phoneVal.replace(/\D/g, '') || '').length;
    if (!phoneVal || digits < 7) {
      if (phoneErr) phoneErr.textContent = 'Valid phone number is required';
      if (phoneInput) { phoneInput.classList.add('input-error'); phoneInput.classList.remove('input-success'); }
      valid = false;
    } else {
      if (phoneErr) phoneErr.textContent = '';
      if (phoneInput) { phoneInput.classList.remove('input-error'); phoneInput.classList.add('input-success'); }
    }

    return valid;
  }

  /* -------------------------------------------------------------------------
     Save the recruiter lead
     ------------------------------------------------------------------------- */
  async function saveRecruiterLead(name, company, email, phone) {
    const domain = (email.split('@')[1] || '').toLowerCase();
    const isSuspicious = FREE_PROVIDERS.has(domain);

    const session = window.currentSessionTelemetry || {};
    const ts = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false })
             + '.' + String(new Date().getMilliseconds()).padStart(3, '0');

    const entry = {
      timestamp:        ts,
      name:             name,
      email:            email,
      subject:          'RESUME_DOWNLOAD' + (isSuspicious ? ' [SUSPICIOUS]' : ' [VERIFIED]'),
      message:          `Company: ${company} | Phone: ${phone} | Action: ${pendingAction || 'download'} | Domain Trust: ${isSuspicious ? 'FREE EMAIL — FLAGGED' : 'COMPANY DOMAIN — TRUSTED'}`,
      ip:               session.ip            || 'Unknown',
      device:           session.deviceType    || 'Unknown',
      os:               session.os            || 'Unknown',
      spec:             session.spec          || 'Unknown',
      device_model:     session.device_model  || 'Unknown',
      connection_type:  session.connection_type || 'Unknown',
    };

    // 1. Save locally
    try {
      const localData   = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      const inquiries   = localData ? JSON.parse(localData) : [];
      inquiries.unshift(entry);
      localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(inquiries));
    } catch(e) {}

    // 2. Push to Supabase
    const client = window.supabaseClient;
    if (client) {
      try {
        await client.from('recruiter_inquiries').insert([entry]);
      } catch(e) {
        console.warn('Gate: Supabase insert failed:', e);
      }
    }

    // 3. Dispatch email alert via FormSubmit
    try {
      fetch('https://formsubmit.co/ajax/gautam6213@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name:     `${name} (${company})`,
          email:    email,
          message:  `📄 RESUME DOWNLOAD ALERT\n\nName: ${name}\nCompany: ${company}\nEmail: ${email}\nPhone: ${phone}\nAction: ${pendingAction}\nIP: ${session.ip || 'N/A'}\nDevice: ${session.deviceType || 'N/A'}\nSuspicious: ${isSuspicious ? 'YES ⚠' : 'No ✓'}`,
          _subject: `[RESUME ACCESS] ${name} @ ${company} — ${isSuspicious ? '⚠ FLAGGED' : '✓ Verified'}`,
          _captcha: 'false'
        })
      }).catch(() => {});
    } catch(e) {}

    // 4. Refresh admin inquiries table if visible
    if (window.renderInquiriesTable) {
      window.renderInquiriesTable();
    }

    // 5. Grant session bypass ONLY for company email domains
    if (!isSuspicious) {
      sessionStorage.setItem(SESSION_PASS_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_PASS_KEY);
      sessionStorage.setItem(SESSION_SUSPICIOUS, 'true');
    }

    return { isSuspicious };
  }

  /* -------------------------------------------------------------------------
     Trigger the actual PDF action after verification
     ------------------------------------------------------------------------- */
  function executePdfAction(action) {
    if (action === 'open') {
      window.open(PDF_PATH, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = PDF_PATH;
      a.download = 'Gautam_Baldaniya_Cybersecurity_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  /* -------------------------------------------------------------------------
     Reset form fields & error states
     ------------------------------------------------------------------------- */
  function resetGateForm() {
    ['gate-name','gate-company','gate-email','gate-phone'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('input-error','input-success'); }
    });
    ['gate-name-err','gate-company-err','gate-email-err','gate-phone-err'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    const hintEl = document.getElementById('gate-email-trust');
    if (hintEl) { hintEl.textContent = ''; hintEl.style.color = ''; }
    const flagEl = document.getElementById('gate-suspicious-flag');
    if (flagEl) flagEl.classList.add('hidden');

    // Reset submit btn
    const btn  = document.getElementById('gate-submit-btn');
    const icon = document.getElementById('gate-submit-icon');
    const txt  = document.getElementById('gate-submit-text');
    if (btn)  { btn.disabled = false; }
    if (icon) icon.setAttribute('data-lucide', 'unlock');
    if (txt)  txt.textContent = 'VERIFY & ACCESS RESUME';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* -------------------------------------------------------------------------
     Wire up all button click interceptions
     ------------------------------------------------------------------------- */
  function initGateInterception() {
    // Hero download button
    const heroBtn = document.getElementById('hero-resume-btn');
    if (heroBtn) {
      heroBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (gateRequired()) {
          openGateModal('download');
        } else {
          executePdfAction('download');
        }
      });
    }

    // Resume page — Open PDF directly
    const openBtn = document.getElementById('resume-open-btn');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (gateRequired()) {
          openGateModal('open');
        } else {
          executePdfAction('open');
        }
      });
    }

    // Resume page — Download PDF
    const dlBtn = document.getElementById('resume-download-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (gateRequired()) {
          openGateModal('download');
        } else {
          executePdfAction('download');
        }
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('gate-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeGateModal);
    }

    // Click outside to close
    const modal = document.getElementById('recruiter-gate-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeGateModal();
      });
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('recruiter-gate-modal');
        if (modal && !modal.classList.contains('hidden')) closeGateModal();
      }
    });

    // Real-time email domain feedback
    const emailInput = document.getElementById('gate-email');
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        const val = emailInput.value.trim();
        if (val.includes('@')) checkEmailLegitimacy(val);
      });
    }

    // Form submit
    const form = document.getElementById('recruiter-gate-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateGateForm()) return;

        const name    = document.getElementById('gate-name').value.trim();
        const company = document.getElementById('gate-company').value.trim();
        const email   = document.getElementById('gate-email').value.trim();
        const phone   = document.getElementById('gate-phone').value.trim();

        // Update button state
        const btn  = document.getElementById('gate-submit-btn');
        const icon = document.getElementById('gate-submit-icon');
        const txt  = document.getElementById('gate-submit-text');
        if (btn)  btn.disabled = true;
        if (icon) icon.setAttribute('data-lucide', 'loader');
        if (txt)  txt.textContent = 'VERIFYING...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
          const { isSuspicious } = await saveRecruiterLead(name, company, email, phone);
          
          if (icon) icon.setAttribute('data-lucide', 'check-circle');
          if (txt)  txt.textContent = 'ACCESS GRANTED';
          if (typeof lucide !== 'undefined') lucide.createIcons();

          if (window.showNotification) {
            if (isSuspicious) {
              window.showNotification(`Lead captured — personal email flagged for review.`, 'info');
            } else {
              window.showNotification(`Identity verified. Accessing resume files...`, 'success');
            }
          }

          // Short delay so user sees confirmation, then fire PDF
          setTimeout(() => {
            closeGateModal();
            executePdfAction(pendingAction || 'download');
          }, 900);

        } catch(err) {
          console.error('Gate save error:', err);
          if (icon) icon.setAttribute('data-lucide', 'unlock');
          if (txt)  txt.textContent = 'VERIFY & ACCESS RESUME';
          if (btn)  btn.disabled = false;
          if (typeof lucide !== 'undefined') lucide.createIcons();
          // Even on error — still open the file (don't block recruiter experience)
          closeGateModal();
          executePdfAction(pendingAction || 'download');
        }
      });
    }
  }

  // Init after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGateInterception);
  } else {
    initGateInterception();
  }

})();
