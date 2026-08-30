// IndexedDB Initialization for large video support
let db;
const dbRequest = indexedDB.open("CinenetMediaDB", 1);

dbRequest.onerror = function(event) {
    console.error("IndexedDB error: " + event.target.errorCode);
};

dbRequest.onsuccess = function(event) {
    db = event.target.result;
    loadHomeFeed();
};

dbRequest.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("mediaStore")) {
        db.createObjectStore("mediaStore", { keyPath: "id", autoIncrement: true });
    }
};

function showSection(sectionId) {
    document.querySelectorAll('.main-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    if(sectionId === 'home') {
        loadHomeFeed();
    }
    if(sectionId === 'teams-page') {
        updateUserStatusDisplay();
    }
    if(sectionId === 'my-team') {
        loadMyTeamWorkspace();
    }
    if(sectionId === 'edits') {
        loadDedicatedEdits();
    }
}

function loadHomeFeed() {
    if (!db) return;
    let transaction = db.transaction(["mediaStore"], "readonly");
    let store = transaction.objectStore("mediaStore");
    let request = store.getAll();

    request.onsuccess = function() {
        let allContent = request.result || [];

        let shortFilmsGrid = document.getElementById('homeShortFilmsGrid');
        let editsGrid = document.getElementById('homeEditsGrid');
        let photosGrid = document.getElementById('homePhotosGrid');

        if(!shortFilmsGrid || !editsGrid || !photosGrid) return;

        let shortFilms = allContent.filter(c => c.type === 'Short Film');
        let edits = allContent.filter(c => c.type === 'Edit');
        let photographs = allContent.filter(c => c.type === 'Photograph');

        shortFilmsGrid.innerHTML = shortFilms.length === 0 ? '<p style="color:#888;">No short films uploaded yet.</p>' :
            shortFilms.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <video width="100%" height="150" controls preload="metadata" style="border-radius:4px; background:#000;">
                        <source src="${item.fileData}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                    <h4 style="margin-top:10px;">${item.title}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');

        editsGrid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits uploaded yet.</p>' :
            edits.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <video width="100%" height="150" controls preload="metadata" style="border-radius:4px; background:#000;">
                        <source src="${item.fileData}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                    <h4 style="margin-top:10px;">${item.title}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');

        photosGrid.innerHTML = photographs.length === 0 ? '<p style="color:#888;">No photographs uploaded yet.</p>' :
            photographs.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <img src="${item.fileData}" alt="Photograph" style="width:100%; height:150px; object-fit:cover; border-radius:4px;">
                    <h4 style="margin-top:10px;">${item.title}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Photographer: ${item.uploader} | Team: ${item.team}</p>
                </div>
            `).join('');
    };
}

function loadDedicatedEdits() {
    if (!db) return;
    let transaction = db.transaction(["mediaStore"], "readonly");
    let store = transaction.objectStore("mediaStore");
    let request = store.getAll();

    request.onsuccess = function() {
        let allContent = request.result || [];
        let edits = allContent.filter(c => c.type === 'Edit');
        let grid = document.getElementById('dedicatedEditsGrid');

        if(!grid) return;

        grid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits showcase available.</p>' :
            edits.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <video width="100%" height="160" controls preload="metadata" style="border-radius:4px; background:#000;">
                        <source src="${item.fileData}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                    <h4 style="margin-top:10px;">${item.title}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');
    };
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
    if(!msgBox) return;

    if(!currentUser) {
        msgBox.innerHTML = "⚠️ Please <a href='#' onclick=\"showSection('auth')\" style='color:#e50914;'>Login</a> to join a team.";
        return;
    }
    if(currentUser.team) {
        msgBox.innerHTML = `✅ You are currently locked into team: <strong>${currentUser.team}</strong>.`;
    } else {
        msgBox.innerHTML = `ℹ️ You are not in any team. Click a team below to view details and join.`;
    }
}

function openTeamInterface(teamName) {
    document.getElementById('teamInterfaceView').style.display = 'block';
    document.getElementById('activeTeamTitle').innerText = teamName;
    document.getElementById('displayTeamNameForWork').innerText = teamName;

    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let joinContainer = document.getElementById('joinActionContainer');

    if(!currentUser) {
        joinContainer.innerHTML = `<p style="color:#ffcc00;">Please login to join this team.</p>`;
    } else if(currentUser.team) {
        if(currentUser.team === teamName) {
            joinContainer.innerHTML = `<span style="background:#28a745; color:#fff; padding:8px 15px; border-radius:4px; font-weight:bold; display:inline-block;">You are a Member of this Team</span>`;
        } else {
            joinContainer.innerHTML = `<p style="color:#d9534f;">You are locked in team <strong>${currentUser.team}</strong>.</p>`;
        }
    } else {
        joinContainer.innerHTML = `<button onclick="confirmJoinTeam('${teamName}')" class="primary-btn" style="background:#28a745;">Join This Team</button>`;
    }

    if (!db) return;
    let transaction = db.transaction(["mediaStore"], "readonly");
    let store = transaction.objectStore("mediaStore");
    let request = store.getAll();

    request.onsuccess = function() {
        let allContent = request.result || [];
        let teamContent = allContent.filter(c => c.team === teamName);
        let workGrid = document.getElementById('teamWorkGrid');
        
        workGrid.innerHTML = teamContent.length === 0 ? '<p style="color:#888;">No uploads by this team yet.</p>' :
            teamContent.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <span class="team-tag">${item.type}</span>
                    <h4 style="margin-top:10px;">${item.title}</h4>
                    ${item.type === 'Photograph' ? 
                        `<img src="${item.fileData}" style="width:100%; height:130px; object-fit:cover; border-radius:4px; margin-top:8px;">` : 
                        `<video width="100%" height="130" controls preload="metadata" style="border-radius:4px; margin-top:8px; background:#000;"><source src="${item.fileData}" type="video/mp4"></video>`
                    }
                    <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                </div>
            `).join('');
    };

    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    let teamMembers = users.filter(u => u.team === teamName);
    let memberListEl = document.getElementById('activeTeamMemberList');

    memberListEl.innerHTML = teamMembers.length === 0 ? '<p style="color:#888;">No members in this team yet.</p>' :
        teamMembers.map(m => `<div style="padding: 6px 0; border-bottom: 1px solid #222;"><strong>${m.name}</strong> - ${m.branch} (${m.year} Year)</div>`).join('');
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

    alert(`Successfully joined ${teamName}!`);
    updateUserStatusDisplay();
    openTeamInterface(teamName);
}

function loadMyTeamWorkspace() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let container = document.getElementById('myTeamContainer');

    if(!currentUser || !currentUser.team) {
        container.innerHTML = `<p style="color:#d9534f;">⚠️ You must join a team first to access the workspace!</p>`;
        return;
    }

    let teamName = currentUser.team;

    if (!db) return;
    let transaction = db.transaction(["mediaStore"], "readonly");
    let store = transaction.objectStore("mediaStore");
    let request = store.getAll();

    request.onsuccess = function() {
        let allContent = request.result || [];
        let teamContent = allContent.filter(c => c.team === teamName);

        container.innerHTML = `
            <div style="background:#161616; padding:20px; border-radius:8px; border:1px solid #333;">
                <h3 style="color:#e50914;">${teamName} Workspace</h3>
                <p style="color:#ccc; margin-bottom:15px;">Upload Short Films, Edits, or Photographs:</p>
                
                <div style="background:#1f1f1f; padding:20px; border-radius:6px; margin-top:20px;">
                    <h4 style="margin-bottom:10px; color:#ffcc00;">Upload Content</h4>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <select id="mediaType" style="padding:10px; background:#222; color:#fff; border:1px solid #444;">
                            <option value="Short Film">Short Film (Video)</option>
                            <option value="Edit">Edit (Video)</option>
                            <option value="Photograph">Photograph (Image)</option>
                        </select>
                        <input type="text" id="mediaTitle" placeholder="Title / Description" style="padding:10px; background:#222; color:#fff; border:1px solid #444;">
                        <input type="file" id="mediaFile" accept="video/*,image/*" style="background:#222; padding:10px; border:1px solid #444; color:#fff;">
                        <button type="button" onclick="processUpload('${teamName}')" class="primary-btn" style="background:#28a745; cursor:pointer; font-weight:bold; padding:12px;">Upload to Home Feed</button>
                    </div>
                </div>

                <div style="margin-top:30px;">
                    <h4>Your Team's Uploads</h4>
                    <div class="grid-layout" style="margin-top:15px;">
                        ${teamContent.length === 0 ? '<p style="color:#888;">No uploads yet.</p>' : 
                            teamContent.map(item => `
                                <div class="card" style="background:#1f1f1f;">
                                    <span class="team-tag">${item.type}</span>
                                    <h4 style="margin-top:10px;">${item.title}</h4>
                                    ${item.type === 'Photograph' ? 
                                        `<img src="${item.fileData}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; margin-top:5px;">` : 
                                        `<video width="100%" height="120" controls preload="metadata" style="border-radius:4px; margin-top:5px; background:#000;"><source src="${item.fileData}" type="video/mp4"></video>`
                                    }
                                    <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                                    <button onclick="deleteMedia(${item.id})" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-top:10px; font-weight:bold;">Delete Upload</button>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;
    };
}

function processUpload(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let type = document.getElementById('mediaType').value;
    let title = document.getElementById('mediaTitle').value;
    let fileInput = document.getElementById('mediaFile');
    
    if(!title.trim()) {
        alert('Please enter a title!');
        return;
    }
    if(fileInput.files.length === 0) {
        alert('Please select a video or image file!');
        return;
    }

    let file = fileInput.files[0];
    let reader = new FileReader();

    reader.onload = function(e) {
        let newItem = {
            team: teamName,
            type: type,
            title: title,
            fileData: e.target.result,
            uploader: currentUser.name
        };

        let transaction = db.transaction(["mediaStore"], "readwrite");
        let store = transaction.objectStore("mediaStore");
        let request = store.add(newItem);

        request.onsuccess = function() {
            alert('Successfully uploaded and stored permanently!');
            loadMyTeamWorkspace();
        };

        request.onerror = function() {
            alert('Failed to save video into database.');
        };
    };

    reader.readAsDataURL(file);
}

// Delete media item function
function deleteMedia(id) {
    if(!confirm("Are you sure you want to delete this upload?")) return;

    let transaction = db.transaction(["mediaStore"], "readwrite");
    let store = transaction.objectStore("mediaStore");
    let request = store.delete(id);

    request.onsuccess = function() {
        alert('Upload deleted successfully!');
        loadMyTeamWorkspace();
    };

    request.onerror = function() {
        alert('Failed to delete upload.');
    };
}