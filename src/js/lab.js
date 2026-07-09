/**
 * Security Lab Topology (SVG Network diagram) & Digital Forensics Workbench
 */
(function() {
  if (typeof PORTFOLIO_DATA === 'undefined') return;

  const labTabBtns = document.querySelectorAll('[data-lab-tab]');
  const labSubviews = document.querySelectorAll('.lab-subview');
  
  // Topology elements
  const svgContainer = document.getElementById('topology-svg-container');
  const nodeSidebar = document.getElementById('topology-node-sidebar');

  // Forensics elements
  const forensicMenu = document.getElementById('forensics-case-menu');
  const forensicWorkspace = document.getElementById('forensics-workspace-panel');

  window.initLab = function() {
    setupTabSwitching();
    renderNetworkTopology();
    renderForensicsPanel();
  };

  function setupTabSwitching() {
    labTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        labTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const targetView = btn.getAttribute('data-lab-tab');
        labSubviews.forEach(view => {
          if (view.id === `lab-tab-${targetView}`) {
            view.classList.remove('hidden');
          } else {
            view.classList.add('hidden');
          }
        });
        
        // Re-align SVG elements or canvas sizes if needed
        window.showNotification(`Sub-module loaded: ${targetView.toUpperCase()}`, "info");
      });
    });
  }

  /* ==========================================================================
     INTERACTIVE LAB TOPOLOGY (SVG ENGINE)
     ========================================================================== */
  const topologyData = {
    nodes: [
      { id: "attacker", x: 80, y: 180, r: 15, name: "Kali Attacker", type: "Offensive Host", ip: "192.168.1.185", os: "Kali Linux (2025.2)", status: "vulnerable", statusLbl: "ATTACK ACTIVE", desc: "Simulated host mimicking adversary reconnaissance, web application vulnerability scans, and brute-force campaigns.", rules: ["ALLOW outgoing tcp/80, tcp/443, tcp/445", "LOG all egress sessions"], icon: "terminal" },
      { id: "firewall", x: 230, y: 180, r: 18, name: "pfSense Firewall", type: "Security Gateway", ip: "192.168.1.1", os: "pfSense v2.7", status: "secure", statusLbl: "FILTERING ACTIVE", desc: "Enterprise edge gateway configured with Snort IDS/IPS rulesets for packet capture, stateful inspection, and connection logging.", rules: ["BLOCK incoming from RFC1918 on WAN", "REDIRECT tcp/80, tcp/443 to WebServer", "LIMIT tcp/445 traffic internal-only"], icon: "shield" },
      { id: "webserver", x: 380, y: 100, r: 15, name: "Web Server (Django)", type: "DMZ Zone Node", ip: "192.168.1.80", os: "Ubuntu Server 22.04", status: "alert", statusLbl: "SQLi ATTEMPTS", desc: "Hosts the public web application and API interfaces. Currently logging SQL injection and directory traversal scans from Kali Host.", rules: ["ALLOW tcp/80, tcp/443 public", "ALLOW tcp/3306 outgoing database", "BLOCK all other ingress"], icon: "globe" },
      { id: "database", x: 530, y: 100, r: 15, name: "Database Server", type: "Secure Storage", ip: "192.168.1.88", os: "Debian 12 / SQLite", status: "secure", statusLbl: "ISOLATED ZONE", desc: "Back-end database node storing customer profiles and drug intelligence models. Accessible only from the Web Server node.", rules: ["ALLOW tcp/3306 from WebServer", "BLOCK all from WAN/LAN", "ENCRYPT storage arrays"], icon: "database" },
      { id: "workstation", x: 420, y: 260, r: 15, name: "Finance Workstation", type: "Internal Subnet", ip: "192.168.1.155", os: "Windows 10 Pro (22H2)", status: "vulnerable", statusLbl: "COMPROMISED - LEAK", desc: "Target workstation used for finance operations. Audited memory traces show active VeraCrypt processes and unauthorized USB leaks.", rules: ["ALLOW tcp/80, tcp/443 outgoing", "ALLOW tcp/445 inbound fileshare", "ENFORCE Active Directory GPO audits"], icon: "monitor" }
    ],
    links: [
      { from: "attacker", to: "firewall", alert: false },
      { from: "firewall", to: "webserver", alert: true },
      { from: "webserver", to: "database", alert: false },
      { from: "firewall", to: "workstation", alert: false },
      { from: "workstation", to: "firewall", alert: true }
    ]
  };

  function renderNetworkTopology() {
    if (!svgContainer) return;

    // Build SVG
    const svgWidth = 600;
    const svgHeight = 360;
    
    let svgHtml = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.25)">
        <defs>
          <!-- Neon glow filters -->
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <!-- Network Connection Cables -->
        <g id="topo-links">
    `;

    // Render lines
    topologyData.links.forEach((link, idx) => {
      const fromNode = topologyData.nodes.find(n => n.id === link.from);
      const toNode = topologyData.nodes.find(n => n.id === link.to);
      
      const linkColor = link.alert ? 'var(--cyber-red)' : 'rgba(255,255,255,0.08)';
      const linkClass = link.alert ? 'topo-link alert' : 'topo-link';
      
      svgHtml += `
        <line x1="${fromNode.x}" y1="${fromNode.y}" x2="${toNode.x}" y2="${toNode.y}" 
              stroke="${linkColor}" stroke-width="1.5" class="${linkClass}" id="link-${idx}" />
      `;
    });

    svgHtml += `</g><g id="topo-nodes">`;

    // Render nodes
    topologyData.nodes.forEach(node => {
      let strokeColor = 'rgba(255,255,255,0.15)';
      let fillColor = 'rgba(17, 24, 39, 0.9)';
      let textGlow = '';
      
      if (node.status === 'vulnerable') {
        strokeColor = 'var(--cyber-red)';
        textGlow = 'filter="url(#glow-red)"';
      } else if (node.status === 'alert') {
        strokeColor = 'var(--cyber-yellow)';
      } else if (node.status === 'secure') {
        strokeColor = 'var(--cyber-green)';
        textGlow = 'filter="url(#glow-green)"';
      }

      svgHtml += `
        <g class="topo-node" id="node-${node.id}" data-node-id="${node.id}">
          <!-- Glowing outer circle -->
          <circle cx="${node.x}" cy="${node.y}" r="${node.r}" 
                  fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5" />
          
          <!-- Small core node center -->
          <circle cx="${node.x}" cy="${node.y}" r="3" fill="${strokeColor}" />
          
          <!-- Label -->
          <text x="${node.x}" y="${node.y - (node.r + 8)}" fill="#f3f4f6" font-size="8" 
                font-family="var(--font-mono)" font-weight="700" text-anchor="middle">${node.name}</text>
          
          <!-- IP Sublabel -->
          <text x="${node.x}" y="${node.y + (node.r + 12)}" fill="#9ca3af" font-size="7" 
                font-family="var(--font-mono)" text-anchor="middle">${node.ip}</text>
        </g>
      `;
    });

    svgHtml += `</g></svg>`;
    
    svgContainer.innerHTML = svgHtml;

    // Attach Click Events to Nodes
    const svgNodes = svgContainer.querySelectorAll('.topo-node');
    svgNodes.forEach(svgNode => {
      svgNode.addEventListener('click', () => {
        // Deselect previous
        svgNodes.forEach(n => n.classList.remove('active'));
        svgNode.classList.add('active');

        const nodeId = svgNode.getAttribute('data-node-id');
        const node = topologyData.nodes.find(n => n.id === nodeId);
        showNodeDetails(node);
      });
    });
  }

  function showNodeDetails(node) {
    if (!nodeSidebar) return;
    
    let statusClass = 'status-secure';
    if (node.status === 'vulnerable') statusClass = 'status-vulnerable';
    else if (node.status === 'alert') statusClass = 'status-alert';

    let rulesList = "";
    node.rules.forEach(rule => {
      rulesList += `<li>${rule}</li>`;
    });

    nodeSidebar.innerHTML = `
      <div class="node-details-wrap">
        <div class="node-detail-header">
          <div class="node-detail-name">
            <i data-lucide="${node.icon || 'server'}" class="text-cyber-green"></i>
            <span>${node.name}</span>
          </div>
          <div class="node-detail-type">${node.type}</div>
          <div class="node-detail-status">
            <span class="node-status-badge ${statusClass}">${node.statusLbl}</span>
          </div>
        </div>
        
        <div class="node-section">
          <div class="node-section-title">Host Telemetry</div>
          <div class="node-dossier-list">
            <div class="node-dossier-item">
              <span class="lbl">IPV4 Address</span>
              <span class="val">${node.ip}</span>
            </div>
            <div class="node-dossier-item">
              <span class="lbl">Operating Sys</span>
              <span class="val">${node.os}</span>
            </div>
          </div>
        </div>

        <div class="node-section">
          <div class="node-section-title">Zone Description</div>
          <p style="font-size: 0.75rem; line-height: 1.4; color: var(--text-secondary);">${node.desc}</p>
        </div>

        <div class="node-section">
          <div class="node-section-title">Active Gateway Policies</div>
          <ul class="node-rules-box" style="list-style:none; padding-left: 0;">
            ${rulesList}
          </ul>
        </div>
      </div>
    `;
    
    lucide.createIcons();
  }

  /* ==========================================================================
     DIGITAL FORENSICS WORKBENCH
     ========================================================================== */
  const forensicsAssets = [
    {
      id: "chain-custody",
      name: "Chain of Custody Record",
      icon: "file-signature",
      title: "EVIDENCE FILE CHAIN OF CUSTODY - SEC-INC-2025-09",
      sub: "Document integrity audits tracing physical and logical evidence handlings"
    },
    {
      id: "volatility-mem",
      name: "Volatility Memory Dump",
      icon: "terminal",
      title: "PHYSICAL MEMORY EXTRACTION (VOLATILITY 3)",
      sub: "Dump details carved from workstation RAM"
    },
    {
      id: "disk-carving",
      name: "Disk USB Registry Artifacts",
      icon: "usb",
      title: "DISK IMAGE REGISTRY & USB TRACES (AUTOPSY)",
      sub: "Evidence details carved from backup filesystem partition"
    },
    {
      id: "threat-timeline",
      name: "Attacker Timeline Reconstruct",
      icon: "clock",
      title: "ATTACK CHRONOLOGY & LATERAL PROGRESS",
      sub: "Aggregated reconstruction of insider threat exfiltration steps"
    }
  ];

  function renderForensicsPanel() {
    if (!forensicMenu) return;

    // Render Sidebar list
    forensicMenu.innerHTML = "";
    forensicsAssets.forEach((asset, idx) => {
      const btn = document.createElement('button');
      btn.className = `forensic-menu-item ${idx === 0 ? 'active' : ''}`;
      btn.setAttribute('data-forensic-id', asset.id);
      btn.innerHTML = `
        <i data-lucide="${asset.icon}"></i>
        <span>${asset.name}</span>
      `;
      forensicMenu.appendChild(btn);
      
      btn.addEventListener('click', () => {
        forensicMenu.querySelectorAll('.forensic-menu-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadForensicWorkspace(asset);
      });
    });

    // Load first by default
    loadForensicWorkspace(forensicsAssets[0]);
    lucide.createIcons();
  }

  function loadForensicWorkspace(asset) {
    if (!forensicWorkspace) return;

    let bodyContent = "";

    switch (asset.id) {
      case 'chain-custody':
        let rows = "";
        PORTFOLIO_DATA.forensicsCase.chainOfCustody.forEach(c => {
          rows += `
            <tr>
              <td>Step 0${c.step}</td>
              <td><strong>${c.action}</strong></td>
              <td>${c.handler}</td>
              <td>${c.date}</td>
              <td class="font-mono text-cyber-green">${c.hash}</td>
            </tr>
          `;
        });
        
        bodyContent = `
          <p class="forensics-intro-txt">
            Strict documentation is maintained to satisfy judicial integrity rules. This dossier maps the chain of custody for 
            physical memory dump <code>memory_dump.raw</code> and USB partition artifacts.
          </p>
          <table class="chain-custody-table">
            <thead>
              <tr>
                <th>Index</th>
                <th>Action Taken</th>
                <th>Custodian</th>
                <th>Timestamp</th>
                <th>SHA-256 Hash / Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
        break;

      case 'volatility-mem':
        bodyContent = `
          <p class="forensics-intro-txt">
            Memory forensic operations executed on physical RAM raw dump. Carved commands and active process listings trace 
            unauthorized program executions.
          </p>
          <div class="node-section-title">IMAGE METADATA INFO</div>
          <pre class="volatility-terminal-box">${PORTFOLIO_DATA.forensicsCase.volatilityOutput.imageinfo}</pre>

          <div class="node-section-title">PROCESS TREE LIST (PSTREE)</div>
          <pre class="volatility-terminal-box">${PORTFOLIO_DATA.forensicsCase.volatilityOutput.pstree}</pre>
          
          <div class="node-section-title">FILESCAN SPECIFIC CARVING (.HC CONTAINER)</div>
          <pre class="volatility-terminal-box">${PORTFOLIO_DATA.forensicsCase.volatilityOutput.filescan}</pre>
        `;
        break;

      case 'disk-carving':
        bodyContent = `
          <p class="forensics-intro-txt">
            Filesystem autopsy reports. Traces USB storage mount logs and security config directories.
          </p>
          <div class="node-section-title">USB Connection Registry Keys</div>
          <div class="node-rules-box" style="margin-bottom: 1.5rem;">
            SYSTEM\\CurrentControlSet\\Enum\\USBSTOR\\Disk&Ven_Kingston&Prod_DataTraveler_3.0<br>
            ├── Serial: K12903AA09B772<br>
            ├── FriendlyName: Kingston DataTraveler 3.0 USB Device<br>
            ├── InstallDate: 2025-09-12 09:35:02 (UTC+5.30)<br>
            └── ParentIdPrefix: 7&23ab8192&0
          </div>
          
          <div class="node-section-title">Evidence Artifact Details</div>
          <div class="node-rules-box">
            Target File: /Users/finance/enc_evidence.hc (VeraCrypt container)<br>
            Size: 500,000,000 bytes (500MB)<br>
            Entropy Level: 7.9992 (Highly random / encrypted data stream)<br>
            VeraCrypt Installation Found: C:\\Program Files\\VeraCrypt\\VeraCrypt.exe (v1.26)
          </div>
        `;
        break;

      case 'threat-timeline':
        let timelineNodes = "";
        PORTFOLIO_DATA.forensicsCase.timeline.forEach(t => {
          const threatClass = t.threat ? 'threat' : '';
          timelineNodes += `
            <div class="forensics-timeline-node ${threatClass}">
              <div class="forensics-timeline-time">${t.time}</div>
              <div class="forensics-timeline-card">
                <div class="forensics-timeline-title">${t.title}</div>
                <div class="forensics-timeline-desc">${t.desc}</div>
              </div>
            </div>
          `;
        });

        bodyContent = `
          <p class="forensics-intro-txt">
            Step-by-step chronology reconstructing the exfiltration timeline. Aggregated from Windows event channels, 
            USB storage connections, and memory traces.
          </p>
          <div class="forensics-timeline-flow">
            ${timelineNodes}
          </div>
        `;
        break;
    }

    // Set panel content
    forensicWorkspace.innerHTML = `
      <div class="forensics-panel-header">
        <div class="forensics-panel-title">
          <i data-lucide="${asset.icon}"></i>
          <span>${asset.title}</span>
        </div>
        <span class="forensics-status-label">${asset.sub}</span>
      </div>
      <div class="forensics-panel-body">
        ${bodyContent}
      </div>
    `;
    
    lucide.createIcons();
  }
})();
