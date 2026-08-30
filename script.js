// 🔥 SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://gwchrmdszjqymbgbocgz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ONhm4PIE3qg0UXkAUrIEyg_GroYqL7C';
                           
let supabaseClient = null;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
    console.error("Supabase initialization error:", err);
}

function showSection(sectionId) {
    document.querySelectorAll('.main-section').forEach(sec => sec.style.display = 'none');
    let targetSec = document.getElementById(sectionId);
    if(targetSec) targetSec.style.display = 'block';
    
    if(sectionId === 'home') {
        loadHomeFeed();
        loadAwardsBanners();
        fetchAndDisplayWinners();
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

// Load 3 Award Winners onto Home Page Team Cards
function loadAwardsBanners() {
    let categories = ['filmmaker', 'photographer', 'editor'];

    categories.forEach(cat => {
        let item = JSON.parse(localStorage.getItem(`cinenet_best_${cat}`));
        let cardEl = document.getElementById(`bestCard_${cat}`);
        let nameEl = document.getElementById(`bestName_${cat}`);

        if (item && nameEl) {
            if(cardEl) {
                cardEl.style.background = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80')`;
                cardEl.style.backgroundSize = 'cover';
                cardEl.style.backgroundPosition = 'center';
                cardEl.style.border = '2px solid #333';
            }
            
            let cleanTitle = item.title ? item.title.replace(/(https?:\/\/[^\s]+)/g, '').trim() : '';
            if(!cleanTitle) cleanTitle = "Masterpiece Winner";

            nameEl.innerHTML = `
                <div style="font-size:18px; font-weight:bold; color:#ffcc00; text-transform:uppercase; letter-spacing:1px;">${item.team}</div>
                <div style="font-size:14px; color:#ffffff; font-weight:600; margin-top:4px;">Winner: ${item.uploader}</div>
                <div style="font-size:12px; color:#cccccc; margin-top:2px; font-style:italic;">"${cleanTitle.substring(0, 25)}..."</div>
            `;
        } else if(nameEl) {
            if(cardEl) {
                cardEl.style.background = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80')`;
                cardEl.style.border = '2px solid #333';
            }
            nameEl.innerHTML = `<span style="color:#aaa; font-size:13px;">Not Set by Admin Yet</span>`;
        }
    });
}

async function openAwardOutput(category) {
    let item = JSON.parse(localStorage.getItem(`cinenet_best_${category}`));
    let modalContainer = document.getElementById('modalContentContainer');

    if (!item) {
        modalContainer.innerHTML = `<p style="color:#aaa; text-align:center;">Admin has not selected a Best ${category.toUpperCase()} for this month yet!</p>`;
        let modal = document.getElementById('awardModal');
        if(modal) modal.style.display = 'flex';
        return;
    } 
    
    let modalTitle = document.getElementById('modalTitle');
    if(modalTitle) modalTitle.innerText = `Best ${category.charAt(0).toUpperCase() + category.slice(1)}: ${item.uploader} (${item.team})`;
    
    let { data: record, error } = await supabaseClient
        .from('mediaStore')
        .select('*')
        .eq('id', item.id)
        .single();

    if(error || !record) {
        modalContainer.innerHTML = `<p style="color:#d9534f; text-align:center;">Error: Media file not found in Cloud Database!</p>`;
        let modal = document.getElementById('awardModal');
        if(modal) modal.style.display = 'flex';
        return;
    }

    let fileSrc = record.file_url;

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
    let modal = document.getElementById('awardModal');
    if(modal) modal.style.display = 'flex';
}

function closeModal() {
    let modal = document.getElementById('awardModal');
    if(modal) modal.style.display = 'none';
    let container = document.getElementById('modalContentContainer');
    if(container) container.innerHTML = '';
}

async function loadHomeFeed() {
    let { data: allContent, error } = await supabaseClient.from('mediaStore').select('*');
    if(error) { allContent = []; }

    let shortFilmsGrid = document.getElementById('homeShortFilmsGrid');
    let editsGrid = document.getElementById('homeEditsGrid');
    let photosGrid = document.getElementById('homePhotosGrid');

    let shortFilms = allContent.filter(c => c.type === 'Short Film');
    let edits = allContent.filter(c => c.type === 'Edit');
    let photographs = allContent.filter(c => c.type === 'Photograph');

    if(shortFilmsGrid) {
        shortFilmsGrid.innerHTML = shortFilms.length === 0 ? '<p style="color:#888;">No short films uploaded yet.</p>' :
            shortFilms.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <video width="100%" height="150" controls preload="metadata" style="border-radius:4px; background:#000;">
                        <source src="${item.file_url}" type="video/mp4">
                    </video>
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');
    }

    if(editsGrid) {
        editsGrid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits uploaded yet.</p>' :
            edits.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <video width="100%" height="150" controls preload="metadata" style="border-radius:4px; background:#000;">
                        <source src="${item.file_url}" type="video/mp4">
                    </video>
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
                </div>
            `).join('');
    }

    if(photosGrid) {
        photosGrid.innerHTML = photographs.length === 0 ? '<p style="color:#888;">No photographs uploaded yet.</p>' :
            photographs.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <img src="${item.file_url}" alt="Photograph" style="width:100%; height:150px; object-fit:cover; border-radius:4px;">
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#aaa; margin-top:4px;">Photographer: ${item.uploader} | Team: ${item.team}</p>
                </div>
            `).join('');
    }
}

async function loadDedicatedEdits() {
    let { data: allContent, error } = await supabaseClient.from('mediaStore').select('*');
    if(error) allContent = [];
    let edits = allContent.filter(c => c.type === 'Edit');
    let grid = document.getElementById('dedicatedEditsGrid');

    if(!grid) return;

    grid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits showcase available.</p>' :
        edits.map(item => `
            <div class="card" style="background:#1f1f1f;">
                <video width="100%" height="160" controls preload="metadata" style="border-radius:4px; background:#000;">
                    <source src="${item.file_url}" type="video/mp4">
                </video>
                <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${item.team} | By: ${item.uploader}</p>
            </div>
        `).join('');
}

function switchAuth(tab) {
    let signupForm = document.getElementById('signupForm');
    let loginForm = document.getElementById('loginForm');
    let btnSignupTab = document.getElementById('btnSignupTab');
    let btnLoginTab = document.getElementById('btnLoginTab');

    if(tab === 'signup') {
        if(signupForm) signupForm.style.display = 'flex';
        if(loginForm) loginForm.style.display = 'none';
        if(btnSignupTab) btnSignupTab.classList.add('active-tab');
        if(btnLoginTab) btnLoginTab.classList.remove('active-tab');
    } else {
        if(signupForm) signupForm.style.display = 'none';
        if(loginForm) loginForm.style.display = 'flex';
        if(btnLoginTab) btnLoginTab.classList.add('active-tab');
        if(btnSignupTab) btnSignupTab.classList.remove('active-tab');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const nameInput = document.getElementById('suName').value.trim();
    const rollInput = document.getElementById('suRoll').value.trim();
    
    let { data: users, error } = await supabaseClient.from('cinenet_users').select('*');
    if(error) users = [];

    let existingUser = users.find(u => u.roll.toLowerCase() === rollInput.toLowerCase() || u.name.toLowerCase() === nameInput.toLowerCase());
    if(existingUser) {
        alert('❌ An account with this Roll Number or Name already exists in Cloud! Please Login directly.');
        switchAuth('login');
        return;
    }

    let { error: insertError } = await supabaseClient.from('cinenet_users').insert([{
        name: nameInput,
        roll: rollInput,
        branch: document.getElementById('suBranch').value.trim(),
        year: document.getElementById('suYear').value.trim(),
        team: null
    }]);

    if(insertError) {
        alert('❌ Signup failed: ' + insertError.message);
        return;
    }

    alert('✅ Sign Up Successful in Cloud! Please Login.');
    switchAuth('login');
}

async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('liName').value.trim();
    const roll = document.getElementById('liRoll').value.trim();

    let { data: users, error } = await supabaseClient.from('cinenet_users').select('*');
    if(error || !users) {
        alert('❌ Database connection error.');
        return;
    }

    let user = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.roll.toLowerCase() === roll.toLowerCase());

    if(user) {
        localStorage.setItem('cinenet_current_user', JSON.stringify(user));
        alert('🎉 Login Successful!');
        showSection('home');
    } else {
        alert('❌ Invalid Credentials or Account not found.');
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
    let teamInterfaceView = document.getElementById('teamInterfaceView');
    if(teamInterfaceView) teamInterfaceView.style.display = 'block';
    
    let activeTeamTitle = document.getElementById('activeTeamTitle');
    if(activeTeamTitle) activeTeamTitle.innerText = teamName;
    
    let displayTeamNameForWork = document.getElementById('displayTeamNameForWork');
    if(displayTeamNameForWork) displayTeamNameForWork.innerText = teamName;

    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let joinContainer = document.getElementById('joinActionContainer');

    if(joinContainer) {
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
    }

    let { data: allContent } = await supabaseClient.from('mediaStore').select('*');
    let teamContent = (allContent || []).filter(c => c.team === teamName);
    let workGrid = document.getElementById('teamWorkGrid');
    
    if(workGrid) {
        workGrid.innerHTML = teamContent.length === 0 ? '<p style="color:#888;">No uploads by this team yet.</p>' :
            teamContent.map(item => `
                <div class="card" style="background:#1f1f1f;">
                    <span class="team-tag">${item.type}</span>
                    <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                    ${item.type === 'Photograph' ? 
                        `<img src="${item.file_url}" style="width:100%; height:130px; object-fit:cover; border-radius:4px; margin-top:8px;">` : 
                        `<video width="100%" height="130" controls preload="metadata" style="border-radius:4px; margin-top:8px; background:#000;"><source src="${item.file_url}" type="video/mp4"></video>`
                    }
                    <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                </div>
            `).join('');
    }

    let { data: users } = await supabaseClient.from('cinenet_users').select('*');
    let teamMembers = (users || []).filter(u => u.team === teamName);
    let memberListEl = document.getElementById('activeTeamMemberList');

    if(memberListEl) {
        memberListEl.innerHTML = teamMembers.length === 0 ? '<p style="color:#888;">No members in this team yet.</p>' :
            teamMembers.map(m => `<div style="padding: 6px 0; border-bottom: 1px solid #222;"><strong>${m.name}</strong> - ${m.branch} (${m.year} Year)</div>`).join('');
    }
}

async function confirmJoinTeam(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let { error } = await supabaseClient
        .from('cinenet_users')
        .update({ team: teamName })
        .eq('roll', currentUser.roll);

    if(error) {
        alert('❌ Error joining team.');
        return;
    }

    currentUser.team = teamName;
    localStorage.setItem('cinenet_current_user', JSON.stringify(currentUser));

    alert(`🎉 Successfully joined ${teamName}!`);
    updateUserStatusDisplay();
    openTeamInterface(teamName);
}

// 🔥 My Team Workspace + Login Check Feature Integration
async function loadMyTeamWorkspace() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let container = document.getElementById('myTeamContainer');

    if(!container) return;

    // FEATURE 3: Evaru login avvakapothe upload option block chesi login button chupisthundi
    if(!currentUser) {
        container.innerHTML = `
            <div style="background:#1a1a1a; border:1px dashed #e50914; padding:30px; text-align:center; border-radius:8px; margin-top:20px;">
                <p style="color:#ff4d4d; font-size:18px; margin-bottom:15px;">⚠️ You must be logged in to access team workspace and upload Short Films, Photographs or Edits.</p>
                <button onclick="showSection('auth')" class="primary-btn" style="background:#e50914; color:#fff; padding:12px 25px; border-radius:5px; font-size:15px; cursor:pointer;">Login / Register Now</button>
            </div>
        `;
        return;
    }

    if(!currentUser.team) {
        container.innerHTML = `<p style="color:#d9534f; text-align:center; padding:20px;">⚠️ You must join a team first under the "Teams" tab to access the workspace and upload files!</p>`;
        return;
    }

    let teamName = currentUser.team;
    let { data: allContent } = await supabaseClient.from('mediaStore').select('*');
    let teamContent = (allContent || []).filter(c => c.team === teamName);

    container.innerHTML = `
        <div style="background:#161616; padding:20px; border-radius:8px; border:1px solid #333;">
            <h3 style="color:#e50914;">${teamName} Workspace</h3>
            <p style="color:#ccc; margin-bottom:15px;">Upload Short Films, Edits, or Photographs to Cloud:</p>
            
            <div style="background:#1f1f1f; padding:20px; border-radius:6px; margin-top:20px;" id="uploadSection">
                <h4 style="margin-bottom:10px; color:#ffcc00;">Upload Content</h4>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <select id="mediaType" style="padding:10px; background:#222; color:#fff; border:1px solid #444;">
                        <option value="Short Film">Short Film (Video)</option>
                        <option value="Edit">Edit (Video)</option>
                        <option value="Photograph">Photograph (Image)</option>
                    </select>
                    <input type="text" id="mediaTitle" placeholder="Title / Description (with links if any)" style="padding:10px; background:#222; color:#fff; border:1px solid #444;">
                    <input type="file" id="mediaFile" accept="video/*,image/*" style="background:#222; padding:10px; border:1px solid #444; color:#fff;">
                    <button type="button" onclick="processCloudUpload('${teamName}')" class="primary-btn" style="background:#28a745; cursor:pointer; font-weight:bold; padding:12px;">Upload to Cloud</button>
                </div>
            </div>

            <div style="margin-top:30px;">
                <h4>Your Team's Cloud Uploads</h4>
                <div class="grid-layout" style="margin-top:15px;">
                    ${teamContent.length === 0 ? '<p style="color:#888;">No uploads yet.</p>' : 
                        teamContent.map(item => `
                            <div class="card" style="background:#1f1f1f;">
                                <span class="team-tag">${item.type}</span>
                                <h4 style="margin-top:10px;">${formatDescriptionWithLinks(item.title)}</h4>
                                ${item.type === 'Photograph' ? 
                                    `<img src="${item.file_url}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; margin-top:5px;">` : 
                                    `<video width="100%" height="120" controls preload="metadata" style="border-radius:4px; margin-top:5px; background:#000;"><source src="${item.file_url}" type="video/mp4"></video>`
                                }
                                <p style="font-size:12px; color:#aaa; margin-top:5px;">By: ${item.uploader}</p>
                                <div style="display:flex; gap:10px; margin-top:10px;">
                                    <button onclick="deleteCloudMedia(${item.id})" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
}

// 🔥 Supabase Cloud Storage File Upload & DB Insert
async function processCloudUpload(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) {
        alert('❌ You must be logged in to upload files!');
        return;
    }

    let type = document.getElementById('mediaType').value;
    let title = document.getElementById('mediaTitle').value.trim();
    let fileInput = document.getElementById('mediaFile');
    
    if(!title) {
        alert('Please enter a title!');
        return;
    }
    if(fileInput.files.length === 0) {
        alert('Please select a file to upload!');
        return;
    }

    let file = fileInput.files[0];
    let fileExt = file.name.split('.').pop();
    let fileName = `${Date.now()}.${fileExt}`;
    let filePath = `${teamName}/${fileName}`;

    alert('⏳ Uploading file to Supabase Cloud Storage... Please wait.');

    let { data: storageData, error: storageError } = await supabaseClient.storage
        .from('cinenet-bucket')
        .upload(filePath, file);

    if (storageError) {
        alert('❌ Upload failed: ' + storageError.message);
        return;
    }

    let { data: publicUrlData } = supabaseClient.storage
        .from('cinenet-bucket')
        .getPublicUrl(filePath);

    let fileUrl = publicUrlData.publicUrl;

    let { error: dbError } = await supabaseClient.from('mediaStore').insert([{
        team: teamName,
        type: type,
        title: title,
        file_url: fileUrl,
        uploader: currentUser.name
    }]);

    if (dbError) {
        alert('❌ Database entry failed: ' + dbError.message);
        return;
    }

    alert('🎉 Successfully uploaded to Cloud Database & Storage!');
    loadMyTeamWorkspace();
    loadHomeFeed();
}

async function deleteCloudMedia(id) {
    if(!confirm("Are you sure you want to delete this cloud upload?")) return;

    let { error } = await supabaseClient.from('mediaStore').delete().eq('id', id);
    if(error) {
        alert('❌ Delete failed.');
        return;
    }

    alert('✅ Deleted successfully from cloud!');
    loadMyTeamWorkspace();
    loadHomeFeed();
}

// 🔥 REAL-TIME WINNERS SYNC ACROSS ALL DEVICES (Mobile & Laptop)
async function fetchAndDisplayWinners() {
    let { data: winnersList, error } = await supabaseClient.from('winners').select('*');
    if(error || !winnersList) return;

    // First clear existing displays
    ['filmmaker', 'photographer', 'editor'].forEach(cat => {
        let div = document.getElementById(`display-winner-${cat}`);
        if(div) div.innerHTML = `<p style="color:#888; font-size:13px;">Not Set by Admin Yet</p>`;
    });

    winnersList.forEach(w => {
        let winnerDiv = document.getElementById(`display-winner-${w.category}`);
        if(winnerDiv) {
            winnerDiv.innerHTML = `
                <div style="background:#1a1a1a; border:2px solid #ffcc00; padding:15px; border-radius:8px; margin-top:10px; color:#fff;">
                    <h3 style="color:#ffcc00; margin:0 0 5px 0;">🏆 Best ${w.category.toUpperCase()}</h3>
                    <p style="margin:0; font-size:16px;"><strong>${w.title}</strong></p>
                    <p style="margin:5px 0 0 0; color:#aaa; font-size:14px;">By: ${w.uploader} | Team: <strong style="color:#fff;">${w.team}</strong></p>
                </div>
            `;
        }
    });
}

// Realtime Listener using Supabase WebSockets
if(supabaseClient) {
    supabaseClient
      .channel('public:winners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'winners' }, payload => {
          console.log('Winners table changed live!', payload);
          fetchAndDisplayWinners();
      })
      .subscribe();
}

// Page load initialization
window.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayWinners();
    loadHomeFeed();
});