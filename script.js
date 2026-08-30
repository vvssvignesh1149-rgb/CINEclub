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

    // Render Team Uploads (Videos & Images)
    let allContent = JSON.parse(localStorage.getItem('cinenet_team_content')) || [];
    let teamContent = allContent.filter(c => c.team === teamName);
    let workGrid = document.getElementById('teamWorkGrid');
    
    if(teamContent.length === 0) {
        workGrid.innerHTML = `<div class="card"><div class="video-placeholder">No Uploads Yet</div><span class="team-tag">Team: ${teamName}</span></div>`;
    } else {
        workGrid.innerHTML = teamContent.map(item => {
            if(item.type === 'Video (Max 20s)') {
                return `
                    <div class="card" style="background:#1f1f1f;">
                        <span class="team-tag">Video Teaser</span>
                        <h4 style="margin-top:10px;">${item.title}</h4>
                        <video width="100%" height="130" controls style="margin-top:8px; border-radius:4px;">
                            <source src="${item.fileData}" type="video/mp4">
                            Your browser does not support video.
                        </video>
                        <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                    </div>
                `;
            } else {
                return `
                    <div class="card" style="background:#1f1f1f;">
                        <span class="team-tag">Photograph</span>
                        <h4 style="margin-top:10px;">${item.title}</h4>
                        <img src="${item.fileData}" alt="Photo" style="width:100%; height:130px; object-fit:cover; margin-top:8px; border-radius:4px;">
                        <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                    </div>
                `;
            }
        }).join('');
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
            <p style="color:#ccc; margin-bottom:15px;">You are a verified member. Upload separate Video Teasers (Max 20 seconds) or Photographs below:</p>
            
            <!-- Video Upload Form -->
            <div style="background:#1f1f1f; padding:20px; border-radius:6px; margin-top:20px;">
                <h4 style="margin-bottom:10px; color:#ffcc00;">Upload 20-Sec Video Teaser</h4>
                <form onsubmit="handleMediaUpload(event, '${teamName}', 'Video')" style="display:flex; flex-direction:column; gap:10px;">
                    <input type="text" id="vidTitle" placeholder="Video Title" required>
                    <input type="file" id="vidFile" accept="video/*" required style="background:#222; padding:10px; border:1px solid #444; color:#fff;">
                    <button type="submit" class="primary-btn" style="background:#e50914;">Upload Video (Max 20s)</button>
                </form>
            </div>

            <!-- Image Upload Form -->
            <div style="background:#1f1f1f; padding:20px; border-radius:6px; margin-top:20px;">
                <h4 style="margin-bottom:10px; color:#ffcc00;">Upload Photograph</h4>
                <form onsubmit="handleMediaUpload(event, '${teamName}', 'Image')" style="display:flex; flex-direction:column; gap:10px;">
                    <input type="text" id="imgTitle" placeholder="Photograph Title / Description" required>
                    <input type="file" id="imgFile" accept="image/*" required style="background:#222; padding:10px; border:1px solid #444; color:#fff;">
                    <button type="submit" class="primary-btn" style="background:#28a745;">Upload Photograph</button>
                </form>
            </div>

            <div style="margin-top:30px;">
                <h4>Your Team's Uploaded Media</h4>
                <div class="grid-layout" style="margin-top:15px;">
                    ${teamContent.length === 0 ? '<p style="color:#888;">No media uploaded yet.</p>' : 
                        teamContent.map(item => `
                            <div class="card" style="background:#1f1f1f;">
                                <span class="team-tag">${item.type}</span>
                                <h4 style="margin-top:10px;">${item.title}</h4>
                                <p style="font-size:12px; color:#aaa; margin:5px 0;">By: ${item.uploader}</p>
                                ${item.type === 'Video (Max 20s)' ? 
                                    `<video width="100%" height="120" controls style="border-radius:4px;"><source src="${item.fileData}" type="video/mp4"></video>` : 
                                    `<img src="${item.fileData}" alt="Uploaded Photo" style="width:100%; height:120px; object-fit:cover; border-radius:4px;">`
                                }
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
}

function handleMediaUpload(event, teamName, mediaType) {
    event.preventDefault();
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));

    if (mediaType === 'Video') {
        let fileInput = document.getElementById('vidFile');
        let title = document.getElementById('vidTitle').value;
        let file = fileInput.files[0];

        if (!file) return;

        // Check video duration (Max 20 seconds)
        let videoElement = document.createElement('video');
        let fileURL = URL.createObjectURL(file);
        videoElement.src = fileURL;

        videoElement.onloadedmetadata = function() {
            window.URL.revokeObjectURL(videoElement.src);
            if (videoElement.duration > 20.5) {
                alert(`Video duration is ${Math.round(videoElement.duration)} seconds! Please upload a video of 20 seconds or less.`);
                return;
            }

            // Convert to Base64 to store in localStorage
            let reader = new FileReader();
            reader.onload = function(e) {
                const newContent = {
                    team: teamName,
                    type: 'Video (Max 20s)',
                    title: title,
                    fileData: e.target.result,
                    uploader: currentUser.name
                };

                let allContent = JSON.parse(localStorage.getItem('cinenet_team_content')) || [];
                allContent.push(newContent);
                localStorage.setItem('cinenet_team_content', JSON.stringify(allContent));

                alert('Video uploaded successfully (Validated <= 20s)!');
                loadMyTeamWorkspace();
            };
            reader.readAsDataURL(file);
        };
    } else {
        // Image Upload
        let fileInput = document.getElementById('imgFile');
        let title = document.getElementById('imgTitle').value;
        let file = fileInput.files[0];

        if (!file) return;

        let reader = new FileReader();
        reader.onload = function(e) {
            const newContent = {
                team: teamName,
                type: 'Photograph',
                title: title,
                fileData: e.target.result,
                uploader: currentUser.name
            };

            let allContent = JSON.parse(localStorage.getItem('cinenet_team_content')) || [];
            allContent.push(newContent);
            localStorage.setItem('cinenet_team_content', JSON.stringify(allContent));

            alert('Photograph uploaded successfully!');
            loadMyTeamWorkspace();
        };
        reader.readAsDataURL(file);
    }
}