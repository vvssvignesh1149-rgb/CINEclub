function showSection(sectionId) {
    document.querySelectorAll('.main-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    if(sectionId === 'home') {
        loadHomeFeed();
        loadAwardsBanners();
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

function formatDescriptionWithLinks(text) {
    if (!text) return '';
    let urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" style="color:#e50914; text-decoration:underline; font-weight:bold;">${url}</a>`;
    });
}

function openCinenetDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("CinenetMediaDB", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("mediaStore")) {
                db.createObjectStore("mediaStore", { keyPath: "id", autoIncrement: true });
            }
        };
    });
}

// Load 3 Award Winners onto Home Page Team Cards
function loadAwardsBanners() {
    let categories = ['filmmaker', 'photographer', 'editor'];

    categories.forEach(cat => {
        // Fetch securely checking all variations
        let item = JSON.parse(localStorage.getItem(`cinenet_best_${cat}`)) || 
                   JSON.parse(localStorage.getItem(`cinenet_best_${cat.toUpperCase()}`)) ||
                   JSON.parse(localStorage.getItem(`cinenet_best_${cat.charAt(0).toUpperCase() + cat.slice(1)}`));
        
        let cardEl = document.getElementById(`bestCard_${cat}`);
        let nameEl = document.getElementById(`bestName_${cat}`);

        if (item && cardEl && nameEl) {
            cardEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80')`;
            cardEl.style.backgroundSize = 'cover';
            cardEl.style.backgroundPosition = 'center';
            cardEl.style.border = '2px solid #e50914';
            
            nameEl.innerHTML = `
                <div style="font-size:17px; font-weight:bold; color:#ffcc00; text-shadow:2px 2px 4px rgba(0,0,0,0.9);">${item.team}</div>
                <div style="font-size:13px; color:#fff; margin-top:3px;">By: ${item.uploader}</div>
                <div style="font-size:11px; color:#ccc; margin-top:2px; font-style:italic;">"${item.title ? item.title.substring(0, 25) : ''}..."</div>
            `;
        } else if(cardEl && nameEl) {
            nameEl.innerHTML = `<span style="color:#aaa; font-size:13px;">Not Set by Admin Yet</span>`;
        }
    });
}

async function openAwardOutput(category) {
    let item = JSON.parse(localStorage.getItem(`cinenet_best_${category}`)) || 
               JSON.parse(localStorage.getItem(`cinenet_best_${category.toUpperCase()}`)) ||
               JSON.parse(localStorage.getItem(`cinenet_best_${category.charAt(0).toUpperCase() + category.slice(1)}`));
               
    let modalContainer = document.getElementById('modalContentContainer');

    if (!item) {
        modalContainer.innerHTML = `<p style="color:#aaa; text-align:center;">Admin has not selected a Best ${category.toUpperCase()} for this month yet!</p>`;
        document.getElementById('awardModal').style.display = 'flex';
        return;
    } 
    
    document.getElementById('modalTitle').innerText = `Best ${category.charAt(0).toUpperCase() + category.slice(1)}: ${item.uploader} (${item.team})`;
    
    let db = await openCinenetDB();
    let transaction = db.transaction(["mediaStore"], "readonly");
    let store = transaction.objectStore("mediaStore");
    let request = store.get(Number(item.id));

    request.onsuccess = function() {
        let record = request.result;
        
        if(!record) {
            modalContainer.innerHTML = `<p style="color:#d9534f; text-align:center;">Error: Media file not found in Database!</p>`;
            document.getElementById('awardModal').style.display = 'flex';
            return;
        }

        let fileSrc = record.fileData;

        if(item.type === 'Photograph') {
            modalContainer.innerHTML = `
                <img src="${fileSrc}" style="width:100%; height:300px; object-fit:cover; border-radius:6px;">
                <h4 style="margin-top:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                <p style="font-size:13px; color:#aaa; margin-top:5px;">Team: ${item.team} | Photographer: ${item.uploader}</p>
            `;
        } else {
            modalContainer.innerHTML = `
                <video width="100%" height="300" controls autoplay style="border-radius:6px; background:#000;">
                    <source src="${fileSrc}" type="video/mp4">
                    Your browser does not support video playback.
                </video>
                <h4 style="margin-top:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                <p style="font-size:13px; color:#aaa; margin-top:5px;">Team: ${item.team} | Maker: ${item.uploader}</p>
            `;
        }
    };
    document.getElementById('awardModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('awardModal').style.display = 'none';
    document.getElementById('modalContentContainer').innerHTML = '';
}

async function loadHomeFeed() {
    let db = await openCinenetDB();
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
                    </video>
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');

        editsGrid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits uploaded yet.</p>' :
            edits.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <video width="100%" height="150" controls preload="metadata" style="border-radius:4px; background:#000;">
                        <source src="${item.fileData}" type="video/mp4">
                    </video>
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');

        photosGrid.innerHTML = photographs.length === 0 ? '<p style="color:#888;">No photographs uploaded yet.</p>' :
            photographs.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <img src="${item.fileData}" alt="Photograph" style="width:100%; height:150px; object-fit:cover; border-radius:4px;">
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Photographer: ${item.uploader} | Team: ${item.team}</p>
                </div>
            `).join('');
    };
}

async function loadDedicatedEdits() {
    let db = await openCinenetDB();
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
                    </video>
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
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

async function openTeamInterface(teamName) {
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

    let db = await openCinenetDB();
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
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
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

async function loadMyTeamWorkspace() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let container = document.getElementById('myTeamContainer');

    if(!currentUser || !currentUser.team) {
        container.innerHTML = `<p style="color:#d9534f;">⚠️ You must join a team first to access the workspace!</p>`;
        return;
    }

    let teamName = currentUser.team;
    let db = await openCinenetDB();
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
                        <input type="text" id="mediaTitle" placeholder="Title / Description (with links if any)" style="padding:10px; background:#222; color:#fff; border:1px solid #444;">
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
                                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                                    ${item.type === 'Photograph' ? 
                                        `<img src="${item.fileData}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; margin-top:5px;">` : 
                                        `<video width="100%" height="120" controls preload="metadata" style="border-radius:4px; margin-top:5px; background:#000;"><source src="${item.fileData}" type="video/mp4"></video>`
                                    }
                                    <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                                    <div style="display:flex; gap:10px; margin-top:10px;">
                                        <button onclick="editMediaTitle(${item.id})" style="background:#f0ad4e; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Edit Title</button>
                                        <button onclick="deleteMedia(${item.id})" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Delete</button>
                                    </div>
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

    reader.onload = async function(e) {
        let db = await openCinenetDB();
        let transaction = db.transaction(["mediaStore"], "readwrite");
        let store = transaction.objectStore("mediaStore");

        let newItem = {
            team: teamName,
            type: type,
            title: title,
            fileData: e.target.result,
            uploader: currentUser.name
        };

        let request = store.add(newItem);
        request.onsuccess = function() {
            alert('Successfully uploaded and stored safely in database!');
            loadMyTeamWorkspace();
            loadHomeFeed();
        };
        request.onerror = function() {
            alert('Upload failed due to storage limits.');
        };
    };

    reader.readAsDataURL(file);
}

async function editMediaTitle(id) {
    let db = await openCinenetDB();
    let transaction = db.transaction(["mediaStore"], "readwrite");
    let store = transaction.objectStore("mediaStore");
    let request = store.get(Number(id));

    request.onsuccess = function() {
        let item = request.result;
        if(!item) return;

        let newTitle = prompt("Enter new title / description:", item.title);
        if(newTitle === null || !newTitle.trim()) return;

        item.title = newTitle.trim();
        store.put(item);

        alert('Title updated successfully!');
        loadMyTeamWorkspace();
        loadHomeFeed();
    };
}

async function deleteMedia(id) {
    if(!confirm("Are you sure you want to delete this upload?")) return;

    let db = await openCinenetDB();
    let transaction = db.transaction(["mediaStore"], "readwrite");
    let store = transaction.objectStore("mediaStore");
    store.delete(Number(id));

    alert('Upload deleted successfully!');
    loadMyTeamWorkspace();
    loadHomeFeed();
}

window.onload = function() {
    loadHomeFeed();
    loadAwardsBanners();
};