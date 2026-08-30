function showSection(sectionId) {
    document.querySelectorAll('.main-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    if(sectionId === 'teams-page') {
        updateUserStatusDisplay();
    }
    if(sectionId === 'my-team') {
        loadMyTeamWorkspace();
    }
}

function switchAuth(tab) {
    if(tab === 'signup') {
        document.getElementById('signupForm').style.display = 'flex';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('btnSignupTab').classList.add('active-tab');
        document.getElementById('btnLoginTab').classList.remove('active-tab');
    } else {
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'flex';
        document.getElementById('btnLoginTab').classList.add('active-tab');
        document.getElementById('btnSignupTab').classList.remove('active-tab');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const newUser = {
        name: document.getElementById('suName').value,
        roll: document.getElementById('suRoll').value,
        branch: document.getElementById('suBranch').value,
        year: document.getElementById('suYear').value,
        team: null
    };

    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    if(users.some(u => u.roll === newUser.roll)) {
        alert('Roll Number already registered!');
        return;
    }

    users.push(newUser);
    localStorage.setItem('cinenet_users', JSON.stringify(users));
    alert('Sign Up Successful! Please Login.');
    switchAuth('login');
}

function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('liName').value;
    const roll = document.getElementById('liRoll').value;

    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    let user = users.find(u => u.name === name && u.roll === roll);

    if(user) {
        localStorage.setItem('cinenet_current_user', JSON.stringify(user));
        alert('Login Successful!');
        showSection('home');
    } else {
        alert('Invalid Credentials or Sign Up First.');
    }
}

function updateUserStatusDisplay() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let msgBox = document.getElementById('userTeamStatusMsg');
    if(!currentUser) {
        msgBox.innerHTML = "⚠️ Please <a href='#' onclick=\"showSection('auth')\" style='color:#e50914;'>Login</a> to join a team.";
        return;
    }
    if(currentUser.team) {
        msgBox.innerHTML = `✅ You are currently locked into team: <strong>${currentUser.team}</strong>. (Exit can only be done by Admin)`;
    } else {
        msgBox.innerHTML = `ℹ️ You are not in any team. Click a team below to view details and join.`;
    }
}

function openTeamInterface(teamName) {
    document.getElementById('teamInterfaceView').style.display = 'block';
    document.getElementById('activeTeamTitle').innerText = teamName;
    document.getElementById('displayTeamNameForWork').innerText = teamName;
    document.getElementById('workTeamTag').innerText = `Team: ${teamName}`;

    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let joinContainer = document.getElementById('joinActionContainer');

    if(!currentUser) {
        joinContainer.innerHTML = `<p style="color:#ffcc00;">Please login to join this team.</p>`;
    } else if(currentUser.team) {
        if(currentUser.team === teamName) {
            joinContainer.innerHTML = `<span style="background:#28a745; color:#fff; padding:8px 15px; border-radius:4px; font-weight:bold; display:inline-block;">You are a Member of this Team</span>`;
        } else {
            joinContainer.innerHTML = `<p style="color:#d9534f;">You are locked in team <strong>${currentUser.team}</strong>. You cannot join another team.</p>`;
        }
    } else {
        joinContainer.innerHTML = `<button onclick="confirmJoinTeam('${teamName}')" class="primary-btn" style="background:#28a745;">Join This Team</button>`;
    }

    // Render Team Uploads
    let allContent = JSON.parse(localStorage.getItem('cinenet_team_content')) || [];
    let teamContent = allContent.filter(c => c.team === teamName);
    let workGrid = document.getElementById('teamWorkGrid');
    
    if(teamContent.length === 0) {
        workGrid.innerHTML = `<div class="card"><div class="video-placeholder">No Uploads Yet</div><span class="team-tag">Team: ${teamName}</span></div>`;
    } else {
        workGrid.innerHTML = teamContent.map(item => `
            <div class="card" style="background:#1f1f1f;">
                <span class="team-tag">${item.type}</span>
                <h4 style="margin-top:10px;">${item.title}</h4>
                <p style="font-size:13px; color:#aaa;">By: ${item.uploader}</p>
                <a href="${item.url}" target="_blank" style="color:#e50914; text-decoration:none; font-weight:bold;">Watch / View &rarr;</a>
            </div>
        `).join('');
    }

    // Render Members
    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    let teamMembers = users.filter(u => u.team === teamName);
    let memberListEl = document.getElementById('activeTeamMemberList');

    if(teamMembers.length === 0) {
        memberListEl.innerHTML = '<p style="color:#888;">No members in this team yet.</p>';
    } else {
        memberListEl.innerHTML = teamMembers.map(m => `
            <div style="padding: 6px 0; border-bottom: 1px solid #222;">
                <strong>${m.name}</strong> - ${m.branch} (${m.year} Year)
            </div>
        `).join('');
    }
}

function confirmJoinTeam(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    users = users.map(u => {
        if(u.roll === currentUser.roll) {
            u.team = teamName;
            currentUser.team = teamName;
        }
        return u;
    });

    localStorage.setItem('cinenet_users', JSON.stringify(users));
    localStorage.setItem('cinenet_current_user', JSON.stringify(currentUser));

    alert(`Successfully joined ${teamName}! You now have upload access in 'My Team'.`);
    updateUserStatusDisplay();
    openTeamInterface(teamName);
}

function loadMyTeamWorkspace() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let container = document.getElementById('myTeamContainer');

    if(!currentUser) {
        container.innerHTML = `<p style="color:#ffcc00;">⚠️ Please <a href='#' onclick="showSection('auth')" style='color:#e50914;'>Login</a> first to view your workspace.</p>`;
        return;
    }

    if(!currentUser.team) {
        container.innerHTML = `<p style="color:#d9534f;">⚠️ You are not in any team yet! Go to <a href='#' onclick="showSection('teams-page')" style='color:#e50914;'>Teams</a>, pick a team, and click 'Join This Team' to get upload access.</p>`;
        return;
    }

    let teamName = currentUser.team;
    let allContent = JSON.parse(localStorage.getItem('cinenet_team_content')) || [];
    let teamContent = allContent.filter(c => c.team === teamName);

    container.innerHTML = `
        <div style="background:#161616; padding:20px; border-radius:8px; border:1px solid #333;">
            <h3 style="color:#e50914;">${teamName} Workspace</h3>
            <p style="color:#ccc; margin-bottom:15px;">You are a verified member. Upload your team's short films, edits, or photographs below:</p>
            
            <div style="background:#1f1f1f; padding:20px; border-radius:6px; margin-top:20px;">
                <h4 style="margin-bottom:10px;">Upload Content</h4>
                <form onsubmit="handleTeamUpload(event, '${teamName}')" style="display:flex; flex-direction:column; gap:10px;">
                    <select id="contentType" required style="padding:10px; background:#222; color:#fff; border:1px solid #444;">
                        <option value="">Select Type</option>
                        <option value="Short Film">Short Film (YouTube URL)</option>
                        <option value="Edit">Edit (YouTube URL)</option>
                        <option value="Photograph">Photograph</option>
                    </select>
                    <input type="text" id="contentTitle" placeholder="Title / Description" required>
                    <input type="text" id="contentUrl" placeholder="YouTube URL or Image Link" required>
                    <button type="submit" class="primary-btn" style="background:#28a745;">Upload</button>
                </form>
            </div>

            <div style="margin-top:30px;">
                <h4>Your Team's Uploads</h4>
                <div class="grid-layout" style="margin-top:15px;">
                    ${teamContent.length === 0 ? '<p style="color:#888;">No uploads yet.</p>' : 
                        teamContent.map(item => `
                            <div class="card" style="background:#1f1f1f;">
                                <span class="team-tag">${item.type}</span>
                                <h4 style="margin-top:10px;">${item.title}</h4>
                                <p style="font-size:13px; color:#aaa;">By: ${item.uploader}</p>
                                <a href="${item.url}" target="_blank" style="color:#e50914; text-decoration:none; font-weight:bold;">View &rarr;</a>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
}

function handleTeamUpload(e, teamName) {
    e.preventDefault();
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    
    const newContent = {
        team: teamName,
        type: document.getElementById('contentType').value,
        title: document.getElementById('contentTitle').value,
        url: document.getElementById('contentUrl').value,
        uploader: currentUser.name
    };

    let allContent = JSON.parse(localStorage.getItem('cinenet_team_content')) || [];
    allContent.push(newContent);
    localStorage.setItem('cinenet_team_content', JSON.stringify(allContent));

    alert('Uploaded successfully!');
    loadMyTeamWorkspace();
}