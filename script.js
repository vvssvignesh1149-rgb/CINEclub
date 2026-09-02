const SUPABASE_URL = 'https://gwchrmdszjqymbgbocgz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ONhm4PIE3qg0UXkAUrIEyg_GroYqL7C';

let photographs = [];
let shortFilms = [];
let edits = [];

let supabaseClient = null;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.warn("Supabase client init offline mode.");
}

async function safeQuery(queryFunction) {
    if (!supabaseClient) return { data: null, error: new Error("Offline") };
    try {
        return await queryFunction(supabaseClient);
    } catch (err) {
        return { data: null, error: err };
    }
}

function showSection(sectionId) {
    let targetSec = document.getElementById(sectionId);
    if (!targetSec) return;

    if (targetSec.style.display === 'block') return;

    document.querySelectorAll('.main-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    targetSec.style.display = 'block';
    window.scrollTo(0, 0);

    if(sectionId === 'home') {
        loadHomeFeed();
        loadAwardsBanners();
        fetchAndDisplayWinners();
    }
    else if(sectionId === 'teams-page') {
        updateUserStatusDisplay();
    }
    else if(sectionId === 'portfolio-page') {
        let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
        if(currentUser) {
            let nameEl = document.getElementById('portfolioUserName');
            if(!nameEl || !nameEl.innerText.includes(currentUser.name)) {
                openUserProfile(currentUser.name);
            }
        } else {
            alert('⚠️ Please login to view your profile!');
            showSection('auth');
        }
    }
    else if(sectionId === 'edits') {
        loadDedicatedEdits();
    }
}

function formatDescriptionWithLinks(text) {
    if (!text) return '';
    let urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" style="color:#ffcc00; text-decoration:underline; font-weight:bold;">${url}</a>`;
    });
}

function checkGlobalNavbarAuth() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let navAuthContainer = document.getElementById('globalAuthNav');
    if(!navAuthContainer) return;

    if(currentUser) {
        navAuthContainer.innerHTML = `
            <span style="color:#ffcc00; font-size:14px; margin-right:8px; font-weight:bold;">👤 ${currentUser.name}</span>
            <button onclick="globalWebsiteLogout()" style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Logout</button>
        `;
    } else {
        navAuthContainer.innerHTML = `
            <button onclick="showSection('auth')" style="background:#e50914; color:#fff; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:13px;">Login / Sign Up</button>
        `;
    }
}

function globalWebsiteLogout() {
    localStorage.removeItem('cinenet_current_user');
    alert('🔒 Logged out successfully from CINENET!');
    checkGlobalNavbarAuth();
    showSection('home');
}

function renderPhotographsGrid() {
    let photosGrid = document.getElementById('homePhotosGrid');
    if(photosGrid) {
        photosGrid.innerHTML = photographs.length === 0 ? '<p style="color:#888;">No photographs uploaded yet.</p>' :
            photographs.map(item => `
                <div class="card">
                    <img src="${item.file_url}" alt="Photograph" class="gallery-photo-item" data-url="${item.file_url}" data-title="${item.title ? item.title.replace(/"/g, '&quot;') : 'Photograph Masterpiece'}" style="cursor:pointer;" title="Click to view full image">
                    <h4 style="margin-top:10px; font-size:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#94a3b8; margin-top:4px;">Photographer: <span onclick="openUserProfile('${item.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${item.uploader}</span> | Team: ${item.team}</p>
                </div>
            `).join('');
    }
}

async function loadAwardsBanners() {
    let categories = ['filmmaker', 'photographer', 'editor'];
    renderPhotographsGrid();

    let winnersList = [];
    let res = await safeQuery(client => client.from('winners').select('*'));
    if (!res.error && res.data) {
        winnersList = res.data;
    }

    categories.forEach(cat => {
        let cardEl = document.getElementById(`bestCard_${cat}`);
        let nameEl = document.getElementById(`bestName_${cat}`);
        let matchedWinner = winnersList ? winnersList.find(w => w.category && w.category.trim().toLowerCase() === cat) : null;

        if (matchedWinner && nameEl) {
            let cleanTitle = matchedWinner.title ? matchedWinner.title.replace(/(https?:\/\/[^\s]+)/g, '').trim() : '';
            if(!cleanTitle) cleanTitle = "Masterpiece Winner";

            nameEl.innerHTML = `
                <div style="font-size:16px; font-weight:bold; color:#ffcc00; text-transform:uppercase; letter-spacing:1px;">${matchedWinner.team}</div>
                <div style="font-size:14px; color:#ffffff; font-weight:600; margin-top:4px;">Winner: <span onclick="event.stopPropagation(); openUserProfile('${matchedWinner.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline;">${matchedWinner.uploader}</span></div>
                <div style="font-size:12px; color:#cccccc; margin-top:2px; font-style:italic;">"${cleanTitle.substring(0, 25)}..."</div>
            `;
        } else if(nameEl) {
            nameEl.innerHTML = `<span style="color:#aaa; font-size:13px;">Not Set by Admin Yet</span>`;
        }
    });
}

window.openFullImageModal = function(url, title) {
    let modal = document.getElementById('awardModal');
    let modalTitle = document.getElementById('modalTitle');
    let container = document.getElementById('modalContentContainer');
    
    if(modalTitle) modalTitle.innerText = title || "Photograph Masterpiece";
    if(container) {
        container.innerHTML = `
            <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
                <img src="${url}" style="max-width:95vw; max-height:82vh; object-fit:contain; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,0.9); border:1px solid rgba(255,204,0,0.2);">
            </div>
        `;
    }
    if(modal) modal.style.display = 'flex';
};

window.closeModal = function() {
    let modal = document.getElementById('awardModal');
    if(modal) modal.style.display = 'none';
    let container = document.getElementById('modalContentContainer');
    if(container) container.innerHTML = '';
};

window.onclick = function(event) {
    let modal = document.getElementById('awardModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

document.addEventListener('click', function(event) {
    if (event.target && event.target.classList.contains('gallery-photo-item')) {
        let url = event.target.getAttribute('data-url');
        let title = event.target.getAttribute('data-title');
        if (url) {
            window.openFullImageModal(url, title);
        }
    }
});

async function openAwardOutput(category) {
    let modalContainer = document.getElementById('modalContentContainer');
    let { data: winnerRecord, error: winError } = await supabaseClient
        .from('winners')
        .select('*')
        .eq('category', category.trim().toLowerCase())
        .single();

    if (winError || !winnerRecord) {
        modalContainer.innerHTML = `<p style="color:#aaa; text-align:center;">Admin has not selected a Best ${category.toUpperCase()} for this month yet!</p>`;
        let modal = document.getElementById('awardModal');
        if(modal) modal.style.display = 'flex';
        return;
    } 
    
    let modalTitle = document.getElementById('modalTitle');
    if(modalTitle) modalTitle.innerText = `Best ${category.charAt(0).toUpperCase() + category.slice(1)}: ${winnerRecord.uploader} (${winnerRecord.team})`;
    
    let { data: record, error } = await supabaseClient
        .from('mediaStore')
        .select('*')
        .eq('id', winnerRecord.media_id)
        .single();

    if(error || !record) {
        modalContainer.innerHTML = `<p style="color:#d9534f; text-align:center;">Error: Media file not found in Cloud Database!</p>`;
        let modal = document.getElementById('awardModal');
        if(modal) modal.style.display = 'flex';
        return;
    }

    let fileSrc = record.file_url;
    if(winnerRecord.type === 'Photograph') {
        modalContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                <img src="${fileSrc}" style="max-width:95%; max-height:60vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9);">
                <h4 style="margin-top:12px; color:#fff; font-size:16px;">${formatDescriptionWithLinks(winnerRecord.title)}</h4>
                <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${winnerRecord.team} | Photographer: <span onclick="openUserProfile('${winnerRecord.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${winnerRecord.uploader}</span></p>
            </div>
        `;
    } else {
        modalContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                <video width="100%" controls autoplay style="max-width:95%; max-height:60vh; border-radius:8px; background:#000;">
                    <source src="${fileSrc}" type="video/mp4">
                </video>
                <h4 style="margin-top:12px; color:#fff; font-size:16px;">${formatDescriptionWithLinks(winnerRecord.title)}</h4>
                <p style="font-size:13px; color:#aaa; margin-top:4px;">Team: ${winnerRecord.team} | Maker: <span onclick="openUserProfile('${winnerRecord.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${winnerRecord.uploader}</span></p>
            </div>
        `;
    }
    
    let modal = document.getElementById('awardModal');
    if(modal) modal.style.display = 'flex';
}

async function loadHomeFeed() {
    let allContent = [];
    let res = await safeQuery(client => client.from('mediaStore').select('*'));
    if(!res.error && res.data) {
        allContent = res.data;
    }

    shortFilms = allContent.filter(c => c.type === 'Short Film');
    edits = allContent.filter(c => c.type === 'Edit');
    photographs = allContent.filter(c => c.type === 'Photograph');

    let shortFilmsGrid = document.getElementById('homeShortFilmsGrid');
    let editsGrid = document.getElementById('homeEditsGrid');

    if(shortFilmsGrid) {
        shortFilmsGrid.innerHTML = shortFilms.length === 0 ? '<p style="color:#888;">No short films uploaded yet.</p>' :
            shortFilms.map(item => `
                <div class="card">
                    <video width="100%" controls preload="metadata">
                        <source src="${item.file_url}" type="video/mp4">
                    </video>
                    <h4 style="margin-top:10px; font-size:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#94a3b8; margin-top:4px;">Team: ${item.team} | By: <span onclick="openUserProfile('${item.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${item.uploader}</span></p>
                </div>
            `).join('');
    }

    if(editsGrid) {
        editsGrid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits uploaded yet.</p>' :
            edits.map(item => `
                <div class="card">
                    <video width="100%" controls preload="metadata">
                        <source src="${item.file_url}" type="video/mp4">
                    </video>
                    <h4 style="margin-top:10px; font-size:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                    <p style="font-size:13px; color:#94a3b8; margin-top:4px;">Team: ${item.team} | By: <span onclick="openUserProfile('${item.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${item.uploader}</span></p>
                </div>
            `).join('');
    }

    renderPhotographsGrid();
}

async function loadDedicatedEdits() {
    let allContent = [];
    let res = await safeQuery(client => client.from('mediaStore').select('*'));
    if(!res.error && res.data) allContent = res.data;

    let edits = allContent.filter(c => c.type === 'Edit');
    let grid = document.getElementById('dedicatedEditsGrid');

    if(!grid) return;
    grid.innerHTML = edits.length === 0 ? '<p style="color:#888;">No edits showcase available.</p>' :
        edits.map(item => `
            <div class="card">
                <video width="100%" controls preload="metadata">
                    <source src="${item.file_url}" type="video/mp4">
                </video>
                <h4 style="margin-top:10px; font-size:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                <p style="font-size:13px; color:#94a3b8; margin-top:4px;">Team: ${item.team} | By: <span onclick="openUserProfile('${item.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${item.uploader}</span></p>
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
    
    let res = await safeQuery(client => client.from('cinenet_users').select('*'));
    let users = res.data || [];

    let existingUser = users.find(u => u.roll.toLowerCase() === rollInput.toLowerCase() || u.name.toLowerCase() === nameInput.toLowerCase());
    if(existingUser) {
        alert('❌ An account with this Roll Number or Name already exists in Cloud! Please Login directly.');
        switchAuth('login');
        return;
    }

    let insertRes = await safeQuery(client => client.from('cinenet_users').insert([{
        name: nameInput,
        roll: rollInput,
        branch: document.getElementById('suBranch').value.trim(),
        year: document.getElementById('suYear').value.trim(),
        team: null
    }]));

    if(insertRes.error) {
        alert('❌ Signup failed: ' + insertRes.error.message);
        return;
    }

    alert('✅ Sign Up Successful in Cloud! Please Login.');
    switchAuth('login');
}

async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('liName').value.trim();
    const roll = document.getElementById('liRoll').value.trim();

    let res = await safeQuery(client => client.from('cinenet_users').select('*'));
    if(res.error || !res.data) {
        alert('❌ Database connection error.');
        return;
    }

    let user = res.data.find(u => u.name.toLowerCase() === name.toLowerCase() && u.roll.toLowerCase() === roll.toLowerCase());

    if(user) {
        localStorage.setItem('cinenet_current_user', JSON.stringify(user));
        alert('🎉 Login Successful!');
        checkGlobalNavbarAuth();
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
        msgBox.innerHTML = "⚠️ Please <a href='#' onclick=\"showSection('auth')\" style='color:#ffcc00;'>Login</a> to join a team.";
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
    if(teamInterfaceView) {
        teamInterfaceView.style.display = 'block';
        teamInterfaceView.scrollIntoView({ behavior: 'smooth' });
    }
    
    let activeTeamTitle = document.getElementById('activeTeamTitle');
    if(activeTeamTitle) activeTeamTitle.innerText = teamName;
    
    let displayTeamNameForWork = document.getElementById('displayTeamNameForWork');
    if(displayTeamNameForWork) displayTeamNameForWork.innerText = teamName;

    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let joinContainer = document.getElementById('joinActionContainer');

    if(joinContainer) {
        if(!currentUser) {
            joinContainer.innerHTML = `
                <div style="background: rgba(255,204,0,0.1); border: 1px solid #ffcc00; padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="color:#ffcc00; font-weight:600; margin-bottom:8px;">⚠️ Please login to join ${teamName}.</p>
                    <button onclick="showSection('auth')" class="primary-btn" style="width: auto; padding: 8px 20px;">Login Now</button>
                </div>
            `;
        } else if(currentUser.team) {
            if(currentUser.team === teamName) {
                joinContainer.innerHTML = `<span style="background:rgba(40,167,69,0.2); border:1px solid #28a745; color:#28a745; padding:10px 20px; border-radius:8px; font-weight:bold; display:inline-block;">✅ You are an active member of this team</span>`;
            } else {
                joinContainer.innerHTML = `<p style="color:#ff4d4d; background:rgba(255,77,77,0.1); padding:10px; border-radius:6px; border:1px solid rgba(255,77,77,0.2);">🔒 You are currently locked into team <strong>${currentUser.team}</strong>.</p>`;
            }
        } else {
            joinContainer.innerHTML = `
                <div style="background: rgba(40, 167, 69, 0.15); border: 1px solid #28a745; padding: 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h4 style="color: #28a745; font-family:'Space Grotesk',sans-serif; font-size:16px;">Ready to join ${teamName}?</h4>
                        <p style="color: #cbd5e1; font-size: 13px; margin-top: 2px;">Collaborate, upload short films, edits, and photographs with your team members.</p>
                    </div>
                    <button onclick="confirmJoinTeam('${teamName}')" class="primary-btn" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #fff; width: auto; padding: 12px 25px; box-shadow: 0 4px 15px rgba(40,167,69,0.4);">🚀 Confirm & Join Team</button>
                </div>
            `;
        }
    }

    let resContent = await safeQuery(client => client.from('mediaStore').select('*'));
    let allContent = resContent.data || [];
    let teamContent = allContent.filter(c => c.team === teamName);
    let workGrid = document.getElementById('teamWorkGrid');
    
    if(workGrid) {
        workGrid.innerHTML = teamContent.length === 0 ? '<p style="color:#888;">No uploads by this team yet.</p>' :
            teamContent.map(item => `
                <div class="card">
                    <span class="team-tag" style="margin-bottom:8px; display:inline-block;">${item.type}</span>
                    <h4 style="margin-top:10px; font-size:15px; color:#fff;">${formatDescriptionWithLinks(item.title)}</h4>
                    ${item.type === 'Photograph' ? 
                        `<img src="${item.file_url}" style="width:100%; height:180px; object-fit:contain; background:#000; border-radius:6px; margin-top:8px;">` : 
                        `<video width="100%" controls preload="metadata" style="border-radius:6px; margin-top:8px; background:#000;"><source src="${item.file_url}" type="video/mp4"></video>`
                    }
                    <p style="font-size:12px; color:#aaa; margin-top:8px;">By: <span onclick="openUserProfile('${item.uploader}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">${item.uploader}</span></p>
                </div>
            `).join('');
    }

    let resUsers = await safeQuery(client => client.from('cinenet_users').select('*'));
    let users = resUsers.data || [];
    let teamMembers = users.filter(u => u.team === teamName);
    let memberListEl = document.getElementById('activeTeamMemberList');

    if(memberListEl) {
        memberListEl.innerHTML = teamMembers.length === 0 ? '<p style="color:#888;">No members in this team yet.</p>' :
            teamMembers.map(m => `<div style="padding: 8px 0; border-bottom: 1px solid #222;"><strong onclick="openUserProfile('${m.name}')" style="color:#ffcc00; cursor:pointer; text-decoration:underline;">${m.name}</strong> - ${m.branch} (${m.year} Year)</div>`).join('');
    }
}

async function confirmJoinTeam(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let res = await safeQuery(client => client.from('cinenet_users').update({ team: teamName }).eq('roll', currentUser.roll));

    if(res.error) {
        alert('❌ Error joining team.');
        return;
    }

    currentUser.team = teamName;
    localStorage.setItem('cinenet_current_user', JSON.stringify(currentUser));

    alert(`🎉 Successfully joined ${teamName}!`);
    updateUserStatusDisplay();
    openTeamInterface(teamName);
}

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

    let res = await safeQuery(client => client.from('mediaStore').insert([{
        team: teamName,
        type: type,
        title: title,
        file_url: fileUrl,
        uploader: currentUser.name
    }]));

    if (res.error) {
        alert('❌ Database entry failed: ' + res.error.message);
        return;
    }

    alert('🎉 Successfully uploaded to Cloud Database & Storage!');
    openUserProfile(currentUser.name);
}

async function deleteCloudMedia(id) {
    if(!confirm("Are you sure you want to delete this cloud upload?")) return;

    let res = await safeQuery(client => client.from('mediaStore').delete().eq('id', id));
    if(res.error) {
        alert('❌ Delete failed.');
        return;
    }

    alert('✅ Deleted successfully from cloud!');
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(currentUser) openUserProfile(currentUser.name);
}

async function fetchAndDisplayWinners() {
    await loadAwardsBanners();
}

if(supabaseClient) {
    supabaseClient
      .channel('public:winners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'winners' }, payload => {
          loadAwardsBanners();
      })
      .subscribe();
}

window.addEventListener('DOMContentLoaded', () => {
    checkGlobalNavbarAuth();
    fetchAndDisplayWinners();
    loadHomeFeed();
});

// Global Video Handler: Prevents multi-audio by pausing other playing videos
document.addEventListener('play', function(e) {
    if(e.target && e.target.tagName === 'VIDEO') {
        document.querySelectorAll('video').forEach(v => {
            if(v !== e.target) {
                v.pause();
            }
        });
    }
}, true);

function filterHomeContent(type) {
    let fBlock = document.getElementById('filter-block-films');
    let eBlock = document.getElementById('filter-block-edits');
    let pBlock = document.getElementById('filter-block-photos');

    if(type === 'all') {
        if(fBlock) fBlock.style.display = 'block';
        if(eBlock) eBlock.style.display = 'block';
        if(pBlock) pBlock.style.display = 'block';
    } else if(type === 'films') {
        if(fBlock) fBlock.style.display = 'block';
        if(eBlock) eBlock.style.display = 'none';
        if(pBlock) pBlock.style.display = 'none';
    } else if(type === 'edits') {
        if(fBlock) fBlock.style.display = 'none';
        if(eBlock) eBlock.style.display = 'block';
        if(pBlock) pBlock.style.display = 'none';
    } else if(type === 'photos') {
        if(fBlock) fBlock.style.display = 'none';
        if(eBlock) eBlock.style.display = 'none';
        if(pBlock) pBlock.style.display = 'block';
    }
}

async function openUserProfile(uploaderName) {
    showSection('portfolio-page');
    
    let nameEl = document.getElementById('portfolioUserName');
    let metaEl = document.getElementById('portfolioUserMeta');
    let gridEl = document.getElementById('portfolioContentGrid');
    
    if(nameEl) nameEl.innerText = `${uploaderName}'s Profile & Portfolio`;
    if(metaEl) metaEl.innerText = `Elegance in Every Frame | Exclusive showcase`;
    
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let isOwnProfile = currentUser && currentUser.name.toLowerCase() === uploaderName.toLowerCase();

    let res = await safeQuery(client => client.from('mediaStore').select('*'));
    let allContent = res.data || [];
    let userWorks = allContent.filter(c => c.uploader && c.uploader.toLowerCase() === uploaderName.toLowerCase());
    
    let resUsers = await safeQuery(client => client.from('cinenet_users').select('*'));
    let usersList = resUsers.data || [];
    let userInfo = usersList.find(u => u.name.toLowerCase() === uploaderName.toLowerCase());
    
    if(userInfo) {
        if(metaEl) {
            metaEl.innerHTML = `Branch: ${userInfo.branch} &bull; Year: ${userInfo.year} Year &bull; Team: ${userInfo.team || 'Independent Creator'}<br>Roll No: ${userInfo.roll}`;
        }
    }

    let uploadSectionHTML = '';
    if(isOwnProfile) {
        if(!userInfo || !userInfo.team) {
            uploadSectionHTML = `
                <div style="background:#161616; padding:20px; border-radius:10px; border:1px dashed #e50914; margin-bottom:30px; text-align:center;">
                    <p style="color:#d9534f; font-size:15px;">⚠️ You must join a team first under the "Teams" tab before you can upload media files!</p>
                </div>
            `;
        } else {
            let teamName = userInfo.team;
            uploadSectionHTML = `
                <div style="background: rgba(16, 18, 27, 0.9); padding: 25px; border-radius: 14px; border: 1px solid rgba(255,204,0,0.3); margin-bottom: 30px;">
                    <h3 style="color:#ffcc00; margin-bottom:15px; font-family:'Space Grotesk',sans-serif; font-size:18px;">📤 Upload New Masterpiece to ${teamName}</h3>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <select id="mediaType" style="padding:12px; background:#0a0c12; color:#fff; border:1px solid #333; border-radius:8px;">
                            <option value="Short Film">Short Film (Video)</option>
                            <option value="Edit">Edit (Video)</option>
                            <option value="Photograph">Photograph (Image)</option>
                        </select>
                        <input type="text" id="mediaTitle" placeholder="Title / Description (with links if any)" style="padding:12px; background:#0a0c12; color:#fff; border:1px solid #333; border-radius:8px;">
                        <input type="file" id="mediaFile" accept="video/*,image/*" style="background:#0a0c12; padding:10px; border:1px solid #333; color:#fff; border-radius:8px;">
                        <button type="button" onclick="processCloudUpload('${teamName}')" class="primary-btn">Upload to Cloud</button>
                    </div>
                </div>
            `;
        }
    }

    let containerWrapper = document.getElementById('portfolioContainerWrapper');
    if(containerWrapper) containerWrapper.innerHTML = uploadSectionHTML;

    if(gridEl) {
        gridEl.innerHTML = userWorks.length === 0 ? '<p style="color:#888;">No works uploaded by this creator yet.</p>' :
            userWorks.map(item => `
                <div class="card">
                    <span class="team-tag" style="margin-bottom:8px; display:inline-block;">${item.type}</span>
                    ${item.type === 'Photograph' ? 
                        `<img src="${item.file_url}" class="gallery-photo-item" data-url="${item.file_url}" data-title="${item.title ? item.title.replace(/"/g, '&quot;') : 'Masterpiece'}" style="width:100%; height:auto; max-height:350px; object-fit:contain; background:#000; border-radius:6px; cursor:pointer;" title="Click to view full image">` : 
                        `<video width="100%" controls preload="metadata" style="background:#000; border-radius:6px;"><source src="${item.file_url}" type="video/mp4"></video>`
                    }
                    <div style="padding-top:10px; display:flex; flex-direction:column; flex-grow:1;">
                        <h4 style="color:#fff; font-size: 15px; font-weight: 600;">${formatDescriptionWithLinks(item.title)}</h4>
                        <p style="font-size:12px; color:#888; margin-top:4px;">Team: ${item.team}</p>
                        ${isOwnProfile ? `<button onclick="deleteCloudMedia(${item.id})" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; margin-top:10px; width:fit-content;">Delete Work</button>` : ''}
                    </div>
                </div>
            `).join('');
    }
}