const SUPABASE_URL = 'https://gwchrmdszjqymbgbocgz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ONhm4PIE3qg0UXkAUrIEyg_GroYqL7C';

let photographs = [];
let shortFilms = [];

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

function checkIsAdmin() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    return currentUser && (currentUser.is_admin === true || currentUser.email === 'admin@cinenet.com');
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
        ensureHomeUploadFAB();
    }
    else if(sectionId === 'teams-page') {
        updateUserStatusDisplay();
        loadDynamicTeams();
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
    else if(sectionId === 'admin-panel') {
        loadAdminPanel();
    }
}

function formatDescriptionWithLinks(text) {
    if (!text) return '';
    let urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank" style="color:#ffcc00; text-decoration:underline; font-weight:bold;">' + url + '</a>';
    });
}

function checkGlobalNavbarAuth() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let navbarLinks = document.getElementById('globalNavbarLinks');
    
    if(!navbarLinks) return;

    let adminLinkHtml = checkIsAdmin() ? '<a href="#" onclick="showSection(\'admin-panel\')" style="background:#e50914; color:#fff; padding:6px 12px; border-radius:4px; font-weight:bold; margin-right:8px;">🛡️ Admin Panel</a>' : '';

    if(currentUser) {
        navbarLinks.innerHTML = '<a href="#" onclick="showSection(\'home\')">Home</a>' +
            '<a href="#" onclick="showSection(\'teams-page\')">Teams</a>' +
            '<a href="#" onclick="showSection(\'portfolio-page\')">My Profile</a>' +
            adminLinkHtml +
            '<span id="globalAuthNav">' +
                '<span onclick="openUserProfile(\'' + currentUser.name + '\')" style="color:#ffcc00; font-size:14px; margin-right:8px; font-weight:bold; cursor:pointer;">👤 ' + currentUser.name + '</span>' +
                '<span onclick="openUserSettingsModal()" style="color:#fff; font-size:14px; margin-right:8px; font-weight:bold; cursor:pointer; text-decoration:underline;">Settings</span>' +
            '</span>';
    } else {
        navbarLinks.innerHTML = '<a href="#" onclick="showSection(\'home\')">Home</a>' +
            adminLinkHtml +
            '<span id="globalAuthNav">' +
                '<a href="#" onclick="showSection(\'auth\')" style="background:#ffcc00; color:#090a0f; padding:6px 12px; border-radius:4px; font-weight:bold;">Login / Sign Up</a>' +
            '</span>';
    }
}

function globalWebsiteLogout() {
    localStorage.removeItem('cinenet_current_user');
    alert('🔒 Logged out successfully from CINENET!');
    closeUserSettingsModal();
    checkGlobalNavbarAuth();
    showSection('home');
}

function openCreateTeamModal() {
    if(!checkIsAdmin()) {
        alert('❌ Only Admin can create teams!');
        return;
    }
    let modal = document.getElementById('createTeamModal');
    if(modal) modal.style.display = 'flex';
}

function closeCreateTeamModal() {
    let modal = document.getElementById('createTeamModal');
    if(modal) modal.style.display = 'none';
}

async function loadDynamicTeams() {
    let grid = document.getElementById('dynamicTeamsGrid');
    if(!grid) return;

    let res = await safeQuery(function(client) { return client.from('teams').select('*'); });
    let teamsList = res.data || [];

    if(teamsList.length === 0) {
        grid.innerHTML = '<p style="color:#888;">No teams created yet.</p>';
        return;
    }

    grid.innerHTML = teamsList.map(function(t) {
        return '<div class="team-card-img" onclick="openTeamInterface(\'' + t.team_name + '\')" style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(\'' + t.wallpaper_url + '\');">' +
            '<h3 style="color: #ffcc00; margin-bottom: 2px;">' + t.team_name + '</h3>' +
            '<p style="color: #ddd; margin: 0;">✨ Click to explore team showcase</p>' +
        '</div>';
    }).join('');
}

async function processTeamCreation() {
    let teamNameInput = document.getElementById('newTeamName');
    let wallpaperInput = document.getElementById('newTeamWallpaper');

    if (!teamNameInput || !teamNameInput.value.trim()) {
        alert('⚠️ Please enter Team Name.');
        return;
    }

    let teamName = teamNameInput.value.trim();
    let wallpaperUrl = '';

    if (wallpaperInput && wallpaperInput.files.length > 0) {
        let file = wallpaperInput.files[0];
        let fileExt = file.name.split('.').pop();
        let fileName = 'team_' + Date.now() + '.' + fileExt;
        let filePath = 'teams/' + fileName;

        alert('⏳ Uploading team wallpaper...');

        let uploadRes = await supabaseClient.storage.from('cinenet-bucket').upload(filePath, file);

        if (uploadRes.error) {
            alert('❌ Wallpaper upload failed: ' + uploadRes.error.message);
            return;
        }

        let publicUrlData = supabaseClient.storage.from('cinenet-bucket').getPublicUrl(filePath);
        wallpaperUrl = publicUrlData.data.publicUrl;
    } else {
        wallpaperUrl = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80';
    }

    let res = await safeQuery(function(client) {
        return client.from('teams').insert([{ team_name: teamName, wallpaper_url: wallpaperUrl, members: '' }]);
    });

    if (res.error) {
        alert('❌ Team creation failed: ' + res.error.message);
        return;
    }

    alert('🎉 Team successfully launched!');
    teamNameInput.value = '';
    if(wallpaperInput) wallpaperInput.value = '';
    closeCreateTeamModal();
    loadDynamicTeams();
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
    let isAdmin = checkIsAdmin();
    let uploadWrapper = document.getElementById('teamUploadContainerWrapper');

    let resTeam = await safeQuery(function(client) { return client.from('teams').select('*').eq('team_name', teamName).single(); });
    let teamData = resTeam.data || {};
    let teamMembers = teamData.members ? teamData.members : 'No members added yet.';

    if (uploadWrapper) {
        uploadWrapper.innerHTML = '';
        
        if (isAdmin) {
            let adminDiv = document.createElement('div');
            adminDiv.style.cssText = 'background:rgba(229,9,20,0.1); border:1px solid rgba(229,9,20,0.3); padding:15px; border-radius:10px; margin-bottom:20px;';
            
            let h4 = document.createElement('h4');
            h4.style.color = '#e50914';
            h4.style.marginBottom = '8px';
            h4.innerText = '🛡️ Admin: Update Team Roaster (Members)';
            adminDiv.appendChild(h4);

            let input = document.createElement('input');
            input.type = 'text';
            input.id = 'teamMembersInput_' + teamName.replace(/\s+/g, '_');
            input.value = teamData.members || '';
            input.placeholder = 'Enter members names separated by comma';
            input.style.cssText = 'width:100%; padding:10px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; margin-bottom:10px;';
            adminDiv.appendChild(input);

            let saveBtn = document.createElement('button');
            saveBtn.innerText = 'Save Team Members';
            saveBtn.style.cssText = 'background:#e50914; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;';
            saveBtn.onclick = function() { updateTeamMembers(teamName); };
            adminDiv.appendChild(saveBtn);

            uploadWrapper.appendChild(adminDiv);
        }

        let contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'background:#13151f; border:1px solid rgba(255,204,0,0.3); padding:20px; border-radius:12px; margin-bottom:20px;';
        
        let roasterTitle = document.createElement('h4');
        roasterTitle.style.color = '#ffcc00';
        roasterTitle.style.marginBottom = '6px';
        roasterTitle.innerText = '👥 Team Roaster Members:';
        contentDiv.appendChild(roasterTitle);

        let roasterText = document.createElement('p');
        roasterText.style.cssText = 'color:#cbd5e1; font-size:14px; margin-bottom:15px; font-weight:500;';
        roasterText.innerText = teamMembers;
        contentDiv.appendChild(roasterText);

        if (currentUser) {
            let vidTitle = document.createElement('h4');
            vidTitle.style.color = '#ffcc00';
            vidTitle.style.marginBottom = '10px';
            vidTitle.innerText = '📹 Submit Team Video (Max 30 Seconds)';
            contentDiv.appendChild(vidTitle);

            let fileLabel = document.createElement('label');
            fileLabel.style.cssText = 'color:#aaa; font-size:12px; display:block; margin-bottom:4px;';
            fileLabel.innerText = 'Select Video File (Must be <= 30s):';
            contentDiv.appendChild(fileLabel);

            let fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'teamVideoFile';
            fileInput.accept = 'video/*';
            fileInput.style.cssText = 'width:100%; padding:8px; margin-bottom:10px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px;';
            contentDiv.appendChild(fileInput);

            let descLabel = document.createElement('label');
            descLabel.style.cssText = 'color:#aaa; font-size:12px; display:block; margin-bottom:4px;';
            descLabel.innerText = 'Description (Paste any URL, it will be clickable):';
            contentDiv.appendChild(descLabel);

            let descInput = document.createElement('textarea');
            descInput.id = 'teamVideoDesc';
            descInput.placeholder = 'Enter title & paste your project URL here...';
            descInput.style.cssText = 'width:100%; padding:10px; height:80px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; margin-bottom:12px;';
            contentDiv.appendChild(descInput);

            let uploadBtn = document.createElement('button');
            uploadBtn.className = 'primary-btn';
            uploadBtn.style.cssText = 'width:auto; padding:8px 20px;';
            uploadBtn.innerText = 'Upload Video';
            uploadBtn.onclick = function() { uploadTeamVideo(teamName); };
            contentDiv.appendChild(uploadBtn);
        } else {
            let loginMsg = document.createElement('p');
            loginMsg.style.cssText = 'color:#ffcc00; font-size:13px;';
            loginMsg.innerText = 'ℹ️ Please login to submit videos to this team.';
            contentDiv.appendChild(loginMsg);
        }

        uploadWrapper.appendChild(contentDiv);
    }

    let resContent = await safeQuery(function(client) { return client.from('mediaStore').select('*'); });
    let allContent = resContent.data || [];
    let teamContent = allContent.filter(function(c) { return c.team === teamName; });
    let workGrid = document.getElementById('teamWorkGrid');

    if(workGrid) {
        workGrid.innerHTML = teamContent.length === 0 ? '<p style="color:#888;">No video submissions by this team yet.</p>' :
            teamContent.map(function(item) {
                return '<div class="card">' +
                    '<span class="team-tag" style="margin-bottom:8px; display:inline-block;">' + item.type + '</span>' +
                    '<video width="100%" controls preload="metadata" style="border-radius:6px; margin-top:8px; background:#000;">' +
                        '<source src="' + item.file_url + '" type="video/mp4">' +
                    '</video>' +
                    '<h4 style="margin-top:10px; font-size:15px; color:#fff; word-break:break-word;">' + formatDescriptionWithLinks(item.title) + '</h4>' +
                    '<p style="font-size:12px; color:#aaa; margin-top:8px;">By: <span onclick="openUserProfile(\'' + item.uploader + '\')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">' + item.uploader + '</span></p>' +
                    (isAdmin ? '<button onclick="deleteCloudMedia(' + item.id + ')" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; margin-top:10px; width:fit-content;">Delete Work</button>' : '') +
                '</div>';
            }).join('');
    }
}

async function updateTeamMembers(teamName) {
    let inputId = 'teamMembersInput_' + teamName.replace(/\s+/g, '_');
    let inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    let membersText = inputEl.value.trim();

    let res = await safeQuery(function(client) {
        return client.from('teams').update({ members: membersText }).eq('team_name', teamName);
    });

    if (res.error) {
        alert('❌ Failed to update team members: ' + res.error.message);
        return;
    }

    alert('✅ Team members roaster updated successfully!');
    openTeamInterface(teamName);
}

async function uploadTeamVideo(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let fileInput = document.getElementById('teamVideoFile');
    let descInput = document.getElementById('teamVideoDesc');

    if(!fileInput || fileInput.files.length === 0 || !descInput || !descInput.value.trim()) {
        alert('⚠️ Please select a video file and enter a description!');
        return;
    }

    let file = fileInput.files[0];
    let title = descInput.value.trim();

    let videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(file);

    videoElement.onloadedmetadata = async function() {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 30.5) {
            alert('❌ Video length is ' + Math.round(videoElement.duration) + ' seconds! Strictly only 30 seconds videos are allowed for teams.');
            return;
        }

        let fileExt = file.name.split('.').pop();
        let fileName = 'team_vid_' + Date.now() + '.' + fileExt;
        let filePath = 'teams_videos/' + fileName;

        alert('⏳ Uploading team video...');

        let uploadRes = await supabaseClient.storage.from('cinenet-bucket').upload(filePath, file);

        if(uploadRes.error) {
            alert('❌ Upload failed: ' + uploadRes.error.message);
            return;
        }

        let publicUrlData = supabaseClient.storage.from('cinenet-bucket').getPublicUrl(filePath);
        let fileUrl = publicUrlData.data.publicUrl;

        let res = await safeQuery(function(client) {
            return client.from('mediaStore').insert([{
                type: 'Short Film',
                title: title,
                file_url: fileUrl,
                uploader: currentUser.name,
                team: teamName
            }]);
        });

        if(res.error) {
            alert('❌ Database entry failed: ' + res.error.message);
            return;
        }

        alert('🎉 Team video successfully submitted!');
        fileInput.value = '';
        descInput.value = '';
        openTeamInterface(teamName);
    };
}

async function loadAdminPanel() {
    if(!checkIsAdmin()) {
        alert('❌ Unauthorized Access!');
        showSection('home');
        return;
    }

    let grid = document.getElementById('adminAllWorksGrid');
    let teamsContainer = document.getElementById('adminTeamsListContainer');
    if(!grid) return;

    let adminExtras = document.getElementById('adminExtrasContainer');
    if(!adminExtras) {
        adminExtras = document.createElement('div');
        adminExtras.id = 'adminExtrasContainer';
        adminExtras.style.cssText = 'margin-bottom: 30px; background: #13151f; border: 1px solid rgba(255,204,0,0.3); padding: 25px; border-radius: 14px;';
        grid.parentNode.insertBefore(adminExtras, grid);
    }

    let resUsers = await safeQuery(function(client) { return client.from('cinenet_users').select('*'); });
    let allUsers = resUsers.data || [];

    let resWorks = await safeQuery(function(client) { return client.from('mediaStore').select('*'); });
    let allContent = resWorks.data || [];

    let resTeams = await safeQuery(function(client) { return client.from('teams').select('*'); });
    let allTeams = resTeams.data || [];

    let resWinners = await safeQuery(function(client) { return client.from('winners').select('*'); });
    let currentWinners = resWinners.data || [];
    let currentBestFilmmaker = '';
    let currentBestPhotographer = '';

    for(let i=0; i<currentWinners.length; i++) {
        if(currentWinners[i].category === 'filmmaker') currentBestFilmmaker = currentWinners[i].uploader || '';
        if(currentWinners[i].category === 'photographer') currentBestPhotographer = currentWinners[i].uploader || '';
    }

    let mediaOptionsHtml = allContent.map(function(m) {
        let safeTitle = m.title ? m.title.replace(/"/g, '&quot;') : 'Untitled';
        return '<option value="' + m.file_url + '">[' + m.type + '] ' + safeTitle + ' by ' + m.uploader + '</option>';
    }).join('');

    adminExtras.innerHTML = '<h3 style="color:#ffcc00; margin-bottom:15px; font-size:22px;">🏆 Set Best of the Month Winners & Their Best Output</h3>' +
        '<div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:25px;">' +
            '<div style="flex:1; min-width:280px; background:#0a0c12; padding:15px; border-radius:8px; border:1px solid #333;">' +
                '<h4 style="color:#ffcc00; margin-bottom:10px;">Best Filmmaker</h4>' +
                '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Winner Username:</label>' +
                '<input type="text" id="adminBestFilmmakerInput" value="' + currentBestFilmmaker + '" placeholder="Enter exact username" style="width:100%; padding:10px; background:#13151f; color:#fff; border:1px solid #444; border-radius:6px; margin-bottom:8px;">' +
                '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Select User Output:</label>' +
                '<select id="adminBestFilmmakerMedia" style="width:100%; padding:10px; background:#13151f; color:#fff; border:1px solid #444; border-radius:6px; margin-bottom:12px;">' +
                    '<option value="">-- Select Work --</option>' +
                    mediaOptionsHtml +
                '</select>' +
                '<button onclick="saveAdminWinner(\'filmmaker\')" style="background:#ffcc00; color:#000; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; width:100%;">Save Filmmaker Winner</button>' +
            '</div>' +
            '<div style="flex:1; min-width:280px; background:#0a0c12; padding:15px; border-radius:8px; border:1px solid #333;">' +
                '<h4 style="color:#ffcc00; margin-bottom:10px;">Best Photographer</h4>' +
                '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Winner Username:</label>' +
                '<input type="text" id="adminBestPhotographerInput" value="' + currentBestPhotographer + '" placeholder="Enter exact username" style="width:100%; padding:10px; background:#13151f; color:#fff; border:1px solid #444; border-radius:6px; margin-bottom:8px;">' +
                '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Select User Output:</label>' +
                '<select id="adminBestPhotographerMedia" style="width:100%; padding:10px; background:#13151f; color:#fff; border:1px solid #444; border-radius:6px; margin-bottom:12px;">' +
                    '<option value="">-- Select Work --</option>' +
                    mediaOptionsHtml +
                '</select>' +
                '<button onclick="saveAdminWinner(\'photographer\')" style="background:#ffcc00; color:#000; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; width:100%;">Save Photographer Winner</button>' +
            '</div>' +
        '</div>' +
        '<h3 style="color:#ffcc00; margin-bottom:15px; font-size:22px;">👤 Registered Users Details (' + allUsers.length + ')</h3>' +
        '<div style="max-height:220px; overflow-y:auto; background:#0a0c12; padding:15px; border-radius:8px; border:1px solid #333; margin-bottom:25px;">' +
            (allUsers.length === 0 ? '<p style="color:#888;">No users registered yet.</p>' : 
                allUsers.map(function(u) {
                    return '<div style="padding:8px 0; border-bottom:1px solid #222; display:flex; justify-content:space-between; font-size:13px;">' +
                        '<span style="color:#ffcc00; font-weight:bold;">' + u.name + ' (' + u.roll + ')</span>' +
                        '<span style="color:#ccc;">Branch: ' + (u.branch || 'N/A') + ' | Year: ' + (u.year || 'N/A') + ' | Email: ' + (u.email || 'N/A') + '</span>' +
                    '</div>';
                }).join('')) +
        '</div>';

    if(teamsContainer) {
        teamsContainer.innerHTML = allTeams.length === 0 ? '<p style="color:#888;">No teams created yet.</p>' :
            allTeams.map(function(t) {
                return '<div style="background:#0a0c12; padding:15px; border-radius:8px; border:1px solid #333; display:flex; justify-content:space-between; align-items:center;">' +
                    '<div><h4 style="color:#ffcc00; margin-bottom:4px;">' + t.team_name + '</h4></div>' +
                    '<button onclick="deleteTeam(\'' + t.team_name + '\')" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Delete Team</button>' +
                '</div>';
            }).join('');
    }

    if(allContent.length === 0) {
        grid.innerHTML = '<p style="color:#888; text-align:center;">No uploads found.</p>';
        return;
    }

    grid.innerHTML = allContent.map(function(item) {
        return '<div class="card" style="border: 1px solid rgba(255,204,0,0.2);">' +
            '<div style="background:#1a1d29; padding:4px 8px; border-radius:4px; font-size:11px; color:#ffcc00; font-weight:bold; margin-bottom:8px; display:inline-block;">MEDIA ID: ' + item.id + '</div>' +
            '<span class="team-tag" style="margin-bottom:8px; display:block;">' + item.type + ' | Team: ' + (item.team || 'Independent') + '</span>' +
            (item.type === 'Photograph' ? 
                '<img src="' + item.file_url + '" style="width:100%; height:180px; object-fit:contain; background:#000; border-radius:6px; margin-top:8px;">' : 
                '<video width="100%" controls preload="metadata" style="border-radius:6px; margin-top:8px; background:#000;"><source src="' + item.file_url + '" type="video/mp4"></video>') +
            '<h4 style="margin-top:10px; font-size:15px; color:#fff;">' + formatDescriptionWithLinks(item.title) + '</h4>' +
            '<p style="font-size:12px; color:#ffcc00; margin-top:4px; font-weight:bold;">Uploaded By: <span onclick="openUserProfile(\'' + item.uploader + '\')" style="cursor:pointer; text-decoration:underline;">' + item.uploader + '</span></p>' +
            '<button onclick="deleteCloudMedia(' + item.id + ')" style="background:#d9534f; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; margin-top:12px; width:100%;">🗑️ Delete File</button>' +
        '</div>';
    }).join('');
}

window.openFullImageModal = function(url, title, uploaderName) {
    let modal = document.getElementById('awardModal');
    let modalTitle = document.getElementById('modalTitle');
    let container = document.getElementById('modalContentContainer');
    
    let profileBtn = uploaderName ? 
        '<button onclick="closeModal(); openUserProfile(\'' + uploaderName + '\');" class="primary-btn" style="margin-top:15px; width:auto; padding:10px 20px; background:#ffcc00; color:#000; font-weight:bold; border-radius:6px; cursor:pointer;">👤 View ' + uploaderName + '\'s Profile</button>' : '';

    if(modalTitle) modalTitle.innerText = title || "Photograph Masterpiece";
    if(container) {
        container.innerHTML = '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 10px;">' +
            '<img src="' + url + '" style="max-width:90vw; max-height:65vh; object-fit:contain; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,0.9); border:1px solid rgba(255,204,0,0.2);">' +
            profileBtn +
        '</div>';
    }
    if(modal) modal.style.display = 'flex';
};

window.openFullVideoModal = function(url, title, uploaderName) {
    let modal = document.getElementById('awardModal');
    let modalTitle = document.getElementById('modalTitle');
    let container = document.getElementById('modalContentContainer');
    
    let profileBtn = uploaderName ? 
        '<button onclick="closeModal(); openUserProfile(\'' + uploaderName + '\');" class="primary-btn" style="margin-top:15px; width:auto; padding:10px 20px; background:#ffcc00; color:#000; font-weight:bold; border-radius:6px; cursor:pointer;">👤 View ' + uploaderName + '\'s Profile</button>' : '';

    if(modalTitle) modalTitle.innerText = title || "Masterpiece Video";
    if(container) {
        container.innerHTML = '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 10px;">' +
            '<video width="100%" controls autoplay style="max-width:90vw; max-height:65vh; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,0.9); border:1px solid rgba(255,204,0,0.2);">' +
                '<source src="' + url + '" type="video/mp4">' +
            '</video>' +
            profileBtn +
        '</div>';
    }
    if(modal) modal.style.display = 'flex';
};

async function loadAwardsBanners() {
    let categories = ['filmmaker', 'photographer'];

    let winnersList = [];
    let res = await safeQuery(function(client) { return client.from('winners').select('*'); });
    if (!res.error && res.data) {
        winnersList = res.data;
    }

    let resUsers = await safeQuery(function(client) { return client.from('cinenet_users').select('*'); });
    let allUsers = resUsers.data || [];

    categories.forEach(function(cat) {
        let cardEl = document.getElementById('bestCard_' + cat);
        let nameEl = document.getElementById('bestName_' + cat);
        let matchedWinner = winnersList ? winnersList.find(function(w) { return w.category && w.category.trim().toLowerCase() === cat; }) : null;

        if (matchedWinner && nameEl) {
            let winnerUser = allUsers.find(function(u) { return u.name && u.name.toLowerCase() === matchedWinner.uploader.toLowerCase(); });
            let userAvatar = (winnerUser && winnerUser.profile_pic) ? winnerUser.profile_pic : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80';
            
            if (cardEl) {
                cardEl.style.cssText = 'position:relative; width:100%; height:190px; padding:0; overflow:hidden; border-radius:12px; cursor:pointer; border:1px solid rgba(255,204,0,0.3); background-color:#0a0c12;';
                cardEl.innerHTML = '<img src="' + userAvatar + '" style="width:100%; height:100%; object-fit:cover; display:block; filter: brightness(1.35) contrast(1.15);" alt="Winner">';
                
                cardEl.onclick = function() {
                    let mediaToOpen = matchedWinner.media_url || matchedWinner.title;
                    if (mediaToOpen && mediaToOpen.startsWith('http')) {
                        let isVideo = mediaToOpen.includes('.mp4') || mediaToOpen.includes('video');
                        if(isVideo) {
                            window.openFullVideoModal(mediaToOpen, matchedWinner.uploader + '\'s Best Masterpiece', matchedWinner.uploader);
                        } else {
                            window.openFullImageModal(mediaToOpen, matchedWinner.uploader + '\'s Best Masterpiece', matchedWinner.uploader);
                        }
                    } else {
                        openUserProfile(matchedWinner.uploader);
                    }
                };
            }

            nameEl.innerHTML = '<div onclick="openUserProfile(\'' + matchedWinner.uploader + '\')" style="font-size:16px; color:#ffcc00; font-weight:700; margin-top:6px; cursor:pointer; text-decoration:underline;" title="View Profile">' + matchedWinner.uploader + '</div>' +
                '<div style="font-size:11px; color:#aaa; margin-top:2px;">✨ Tap card for best output</div>';
        } else if(nameEl) {
            if(cardEl) {
                let defaultPlaceholder = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80';
                cardEl.style.cssText = 'position:relative; width:100%; height:190px; padding:0; overflow:hidden; border-radius:12px; cursor:default; border:1px solid rgba(255,204,0,0.15); background-color:#0a0c12;';
                cardEl.innerHTML = '<img src="' + defaultPlaceholder + '" style="width:100%; height:100%; object-fit:cover; display:block; filter: brightness(0.6) contrast(1.1);">';
            }
            nameEl.innerHTML = '<span style="color:#aaa; font-size:13px; margin-top:6px; display:block;">Not Set Yet</span>';
        }
    });
}

window.openFullImageModal = function(url, title) {
    let modal = document.getElementById('awardModal');
    let modalTitle = document.getElementById('modalTitle');
    let container = document.getElementById('modalContentContainer');
    
    if(modalTitle) modalTitle.innerText = title || "Masterpiece";
    if(container) {
        container.innerHTML = '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 10px;">' +
            '<img src="' + url + '" style="max-width:95vw; max-height:75vh; object-fit:contain; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,0.9); border:1px solid rgba(255,204,0,0.2);">' +
            '<h3 style="color:#ffcc00; margin-top:15px; font-size:18px; word-break: break-word;">' + formatDescriptionWithLinks(title) + '</h3>' +
        '</div>';
    }
    if(modal) modal.style.display = 'flex';
};

window.closeModal = function() {
    let modal = document.getElementById('awardModal');
    if(modal) modal.style.display = 'none';
    let container = document.getElementById('modalContentContainer');
    if(container) container.innerHTML = '';
};

document.addEventListener('click', function(event) {
    let modal = document.getElementById('awardModal');
    let settingsModal = document.getElementById('userSettingsModal');
    let uploadModal = document.getElementById('homeUploadModal');
    
    if (event.target === modal) modal.style.display = 'none';
    if (event.target === settingsModal) settingsModal.style.display = 'none';
    if (event.target === uploadModal) uploadModal.style.display = 'none';

    if (!event.target.closest('.three-dots-menu')) {
        document.querySelectorAll('.dropdown-options').forEach(function(el) { el.style.display = 'none'; });
    }

    if (event.target && event.target.classList.contains('gallery-photo-item')) {
        let url = event.target.getAttribute('data-url');
        let title = event.target.getAttribute('data-title');
        if (url) {
            window.openFullImageModal(url, title);
        }
    }
});

function toggleDropdownMenu(id) {
    event.stopPropagation();
    let menu = document.getElementById('dropdown_' + id);
    document.querySelectorAll('.dropdown-options').forEach(function(el) {
        if(el.id !== 'dropdown_' + id) el.style.display = 'none';
    });
    if(menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function openEditPhotoModal(id, currentTitle, currentUrl) {
    let modal = document.getElementById('editPhotoModal');
    document.getElementById('editPhotoId').value = id;
    document.getElementById('editPhotoTitleInput').value = currentTitle;
    document.getElementById('editPhotoPreviewImg').src = currentUrl;
    if(modal) modal.style.display = 'flex';
}

function closeEditPhotoModal() {
    let modal = document.getElementById('editPhotoModal');
    if(modal) modal.style.display = 'none';
}

async function saveEditedPhotograph() {
    let id = document.getElementById('editPhotoId').value;
    let newTitle = document.getElementById('editPhotoTitleInput').value.trim();

    if(!newTitle) {
        alert('⚠️ Title cannot be empty!');
        return;
    }

    let res = await safeQuery(function(client) {
        return client.from('mediaStore').update({ title: newTitle }).eq('id', id);
    });

    if(res.error) {
        alert('❌ Failed to update photograph.');
        return;
    }

    alert('✅ Photograph updated successfully!');
    closeEditPhotoModal();
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(currentUser) openUserProfile(currentUser.name);
}

function createEditModalHTML() {
    if(document.getElementById('editPhotoModal')) return;
    let modal = document.createElement('div');
    modal.id = 'editPhotoModal';
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; justify-content:center; align-items:center;';
    modal.innerHTML = '<div style="background:#13151f; border:1px solid rgba(255,204,0,0.3); padding:30px; border-radius:14px; width:90%; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.9); text-align:center;">' +
        '<h3 style="color:#ffcc00; font-family:\'Space Grotesk\',sans-serif; margin-bottom:15px; font-size:20px;">✏️ Edit Photograph</h3>' +
        '<input type="hidden" id="editPhotoId">' +
        '<img id="editPhotoPreviewImg" style="width:100%; height:150px; object-fit:contain; background:#000; border-radius:6px; margin-bottom:15px;">' +
        '<input type="text" id="editPhotoTitleInput" placeholder="New Title / Description" style="width:100%; padding:10px; margin-bottom:20px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; font-size:13px;">' +
        '<div style="display:flex; gap:10px; justify-content:flex-end;">' +
            '<button onclick="closeEditPhotoModal()" style="background:#444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Cancel</button>' +
            '<button onclick="saveEditedPhotograph()" style="background:#ffcc00; color:#000; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">Save</button>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modal);
}

async function loadHomeFeed() {
    let allContent = [];
    let res = await safeQuery(function(client) { return client.from('mediaStore').select('*'); });
    if(!res.error && res.data) {
        allContent = res.data;
    }

    shortFilms = allContent.filter(function(c) { return c.type === 'Short Film'; });
    photographs = allContent.filter(function(c) { return c.type === 'Photograph'; });

    let shortFilmsGrid = document.getElementById('homeShortFilmsGrid');
    let isAdmin = checkIsAdmin();

    if(shortFilmsGrid) {
        shortFilmsGrid.innerHTML = shortFilms.length === 0 ? '<p style="color:#888;">No short films uploaded yet.</p>' :
            shortFilms.map(function(item) {
                return '<div class="card">' +
                    '<video width="100%" controls preload="metadata">' +
                        '<source src="' + item.file_url + '" type="video/mp4">' +
                    '</video>' +
                    '<h4 style="margin-top:10px; font-size:15px; color:#fff;">' + formatDescriptionWithLinks(item.title) + '</h4>' +
                    '<p style="font-size:13px; color:#94a3b8; margin-top:4px;">By: <span onclick="openUserProfile(\'' + item.uploader + '\')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">' + item.uploader + '</span></p>' +
                    (isAdmin ? '<button onclick="deleteCloudMedia(' + item.id + ')" style="background:#d9534f; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; margin-top:10px; width:fit-content;">Delete Work</button>' : '') +
                '</div>';
            }).join('');
    }

    renderPhotographsGrid();
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
    const emailInput = document.getElementById('suEmail').value.trim();
    const rollInput = document.getElementById('suRoll').value.trim();
    
    let res = await safeQuery(function(client) { return client.from('cinenet_users').select('*'); });
    let users = res.data || [];

    let existingUser = users.find(function(u) {
        return (u.roll && u.roll.toLowerCase() === rollInput.toLowerCase()) || 
               (u.name && u.name.toLowerCase() === nameInput.toLowerCase()) || 
               (u.email && u.email.toLowerCase() === emailInput.toLowerCase());
    });

    if(existingUser) {
        alert('❌ An account with this Roll Number, Name, or Email already exists!');
        switchAuth('login');
        return;
    }

    let insertRes = await safeQuery(function(client) {
        return client.from('cinenet_users').insert([{
            name: nameInput,
            email: emailInput,
            roll: rollInput,
            branch: document.getElementById('suBranch').value.trim(),
            year: document.getElementById('suYear').value.trim(),
            profile_pic: '',
            insta_id: ''
        }]);
    });

    if(insertRes.error) {
        alert('❌ Signup failed: ' + insertRes.error.message);
        return;
    }

    alert('✅ Sign Up Successful! Please Login.');
    switchAuth('login');
}

async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('liName').value.trim();
    const roll = document.getElementById('liRoll').value.trim();

    let res = await safeQuery(function(client) { return client.from('cinenet_users').select('*'); });
    if(res.error || !res.data) {
        alert('❌ Database connection error.');
        return;
    }

    let user = res.data.find(function(u) {
        return u.name.toLowerCase() === name.toLowerCase() && u.roll.toLowerCase() === roll.toLowerCase();
    });

    if(user) {
        localStorage.setItem('cinenet_current_user', JSON.stringify(user));
        alert('🎉 Login Successful!');
        checkGlobalNavbarAuth();
        showSection('home');
    } else {
        alert('❌ Invalid Credentials.');
    }
}

function updateUserStatusDisplay() {
    let msgBox = document.getElementById('userTeamStatusMsg');
    if(!msgBox) return;
    msgBox.innerHTML = 'ℹ️ Explore teams below. To join a team, click on any team card to submit your 30s video.';
}

async function deleteCloudMedia(id) {
    if(!confirm('Are you sure you want to delete this file?')) return;

    let res = await safeQuery(function(client) { return client.from('mediaStore').delete().eq('id', id); });
    if(res.error) {
        alert('❌ Delete failed.');
        return;
    }

    alert('✅ Deleted successfully!');
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(currentUser) openUserProfile(currentUser.name);
}

async function fetchAndDisplayWinners() {
    await loadAwardsBanners();
}

window.addEventListener('DOMContentLoaded', function() {
    checkGlobalNavbarAuth();
    fetchAndDisplayWinners();
    loadHomeFeed();
    ensureHomeUploadFAB();
});

function ensureHomeUploadFAB() {
    if(document.getElementById('homeUploadFAB')) return;
    let fab = document.createElement('div');
    fab.id = 'homeUploadFAB';
    fab.innerHTML = '+';
    fab.title = 'Upload Photograph';
    fab.style.cssText = 'position:fixed; bottom:30px; right:30px; width:60px; height:60px; background:linear-gradient(135deg, #ffcc00 0%, #ff9900 100%); color:#000; font-size:32px; font-weight:bold; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 10px 25px rgba(255,204,0,0.5); z-index:9998; transition:transform 0.2s;';
    fab.onmouseover = function() { fab.style.transform = 'scale(1.1)'; };
    fab.onmouseout = function() { fab.style.transform = 'scale(1)'; };
    fab.onclick = function() { openHomeUploadModal(); };
    document.body.appendChild(fab);

    createHomeUploadModalHTML();
    createEditModalHTML();
}

function createHomeUploadModalHTML() {
    if(document.getElementById('homeUploadModal')) return;
    let modal = document.createElement('div');
    modal.id = 'homeUploadModal';
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; justify-content:center; align-items:center;';
    modal.innerHTML = '<div style="background:#13151f; border:1px solid rgba(255,204,0,0.3); padding:25px; border-radius:14px; width:90%; max-width:420px; box-shadow:0 10px 30px rgba(0,0,0,0.9); position:relative;">' +
        '<h3 style="color:#ffcc00; font-family:\'Space Grotesk\',sans-serif; margin-bottom:12px; font-size:20px;">📸 Upload New Photograph</h3>' +
        '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Select Image File:</label>' +
        '<input type="file" id="homePhotoFile" accept="image/*" onchange="previewHomePhoto(event)" style="width:100%; padding:8px; margin-bottom:12px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; font-size:13px;">' +
        '<div id="homePhotoPreviewContainer" style="display:none; text-align:center; margin-bottom:12px;">' +
            '<img id="homePhotoPreviewImg" style="max-height:110px; max-width:100%; object-fit:contain; border-radius:6px; border:1px solid #ffcc00;">' +
        '</div>' +
        '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Title / Description:</label>' +
        '<input type="text" id="homePhotoTitle" placeholder="Photograph Title" style="width:100%; padding:10px; margin-bottom:20px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; font-size:13px;">' +
        '<div style="display:flex; gap:10px; justify-content:flex-end;">' +
            '<button onclick="closeHomeUploadModal()" style="background:#444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Cancel</button>' +
            '<button onclick="uploadHomePhotograph()" style="background:#ffcc00; color:#000; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">Upload</button>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modal);
}

function previewHomePhoto(event) {
    let file = event.target.files[0];
    let container = document.getElementById('homePhotoPreviewContainer');
    let previewImg = document.getElementById('homePhotoPreviewImg');
    
    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            container.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        container.style.display = 'none';
    }
}

function openHomeUploadModal() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) {
        alert('⚠️ Please login to upload photographs!');
        showSection('auth');
        return;
    }
    let modal = document.getElementById('homeUploadModal');
    let container = document.getElementById('homePhotoPreviewContainer');
    if(container) container.style.display = 'none';
    if(modal) modal.style.display = 'flex';
}

function closeHomeUploadModal() {
    let modal = document.getElementById('homeUploadModal');
    if(modal) modal.style.display = 'none';
}

async function uploadHomePhotograph() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let title = document.getElementById('homePhotoTitle').value.trim();
    let fileInput = document.getElementById('homePhotoFile');

    if(!title || fileInput.files.length === 0) {
        alert('⚠️ Please select an image and provide a title!');
        return;
    }

    let file = fileInput.files[0];
    let fileExt = file.name.split('.').pop();
    let fileName = 'photo_' + Date.now() + '.' + fileExt;
    let filePath = 'photographs/' + fileName;

    alert('⏳ Uploading photograph to cloud...');

    let storageRes = await supabaseClient.storage.from('cinenet-bucket').upload(filePath, file);

    if(storageRes.error) {
        alert('❌ Upload failed: ' + storageRes.error.message);
        return;
    }

    let publicUrlData = supabaseClient.storage.from('cinenet-bucket').getPublicUrl(filePath);
    let fileUrl = publicUrlData.data.publicUrl;

    let res = await safeQuery(function(client) {
        return client.from('mediaStore').insert([{
            type: 'Photograph',
            title: title,
            file_url: fileUrl,
            uploader: currentUser.name,
            team: currentUser.team || 'Independent'
        }]);
    });

    if(res.error) {
        alert('❌ Database entry failed: ' + res.error.message);
        return;
    }

    alert('🎉 Photograph uploaded successfully!');
    document.getElementById('homePhotoTitle').value = '';
    fileInput.value = '';
    closeHomeUploadModal();
    loadHomeFeed();
}

function openUserSettingsModal() {
    let modal = document.getElementById('userSettingsModal');
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let instaInput = document.getElementById('modalEditInstaId');
    if(instaInput) instaInput.value = currentUser.insta_id || '';

    if(modal) {
        modal.style.display = 'flex';
    } else {
        createSettingsModalHTML();
        document.getElementById('userSettingsModal').style.display = 'flex';
    }
}

function closeUserSettingsModal() {
    let modal = document.getElementById('userSettingsModal');
    if(modal) modal.style.display = 'none';
}

function createSettingsModalHTML() {
    if(document.getElementById('userSettingsModal')) return;
    let modalDiv = document.createElement('div');
    modalDiv.id = 'userSettingsModal';
    modalDiv.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; justify-content:center; align-items:center;';
    modalDiv.innerHTML = '<div style="background:#13151f; border:1px solid rgba(255,204,0,0.3); padding:30px; border-radius:14px; width:90%; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.9); position:relative;">' +
        '<h3 style="color:#ffcc00; font-family:\'Space Grotesk\',sans-serif; margin-bottom:15px; font-size:20px;">⚙️ Edit Profile Settings</h3>' +
        '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Upload Profile Picture:</label>' +
        '<input type="file" id="modalEditProfilePicFile" accept="image/*" style="width:100%; padding:8px; margin-bottom:15px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; font-size:13px;">' +
        '<label style="color:#aaa; font-size:12px; display:block; margin-bottom:4px;">Instagram ID (Username - Optional):</label>' +
        '<input type="text" id="modalEditInstaId" placeholder="username" style="width:100%; padding:10px; margin-bottom:20px; background:#0a0c12; color:#fff; border:1px solid #444; border-radius:6px; font-size:13px;">' +
        '<div style="display:flex; flex-direction:column; gap:10px;">' +
            '<div style="display:flex; gap:10px; justify-content:flex-end;">' +
                '<button onclick="closeUserSettingsModal()" style="background:#444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Cancel</button>' +
                '<button onclick="saveUserProfileSettings()" style="background:#ffcc00; color:#000; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">Save Changes</button>' +
            '</div>' +
            '<button onclick="globalWebsiteLogout()" style="background:#dc3545; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; width:100%; margin-top:5px;">🔒 Logout from CINENET</button>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modalDiv);
}

function toBase64(file) {
    return new Promise(function(resolve, reject) {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = function(error) { reject(error); };
    });
}

async function saveUserProfileSettings() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let newInsta = document.getElementById('modalEditInstaId').value.trim();
    let fileInput = document.getElementById('modalEditProfilePicFile');
    let profilePicUrl = currentUser.profile_pic || '';

    if (fileInput.files.length > 0) {
        let file = fileInput.files[0];
        try {
            alert('⏳ Processing profile picture...');
            profilePicUrl = await toBase64(file);
        } catch (error) {
            console.error('File read error: ', error);
            alert('❌ Failed to read image file.');
            return;
        }
    }

    await updateProfileInDatabase(currentUser, profilePicUrl, newInsta);
}

async function updateProfileInDatabase(currentUser, profilePicUrl, newInsta) {
    let identifierKey = currentUser.id ? 'id' : (currentUser.roll ? 'roll' : 'email');
    let identifierVal = currentUser.id ? currentUser.id : (currentUser.roll ? currentUser.roll : currentUser.email);

    let res = await safeQuery(function(client) {
        return client.from('cinenet_users').update({ profile_pic: profilePicUrl, insta_id: newInsta }).eq(identifierKey, identifierVal);
    });

    if(res.error) {
        console.error("Supabase Update Error:", res.error);
        alert('❌ Failed to update profile settings in database: ' + res.error.message);
        return;
    }

    currentUser.profile_pic = profilePicUrl;
    currentUser.insta_id = newInsta;
    localStorage.setItem('cinenet_current_user', JSON.stringify(currentUser));

    alert('✅ Profile settings updated successfully!');
    closeUserSettingsModal();
    openUserProfile(currentUser.name);
}

async function openUserProfile(uploaderName) {
    showSection('portfolio-page');
    
    let containerWrapper = document.getElementById('portfolioContainerWrapper');
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let isAdmin = checkIsAdmin();
    let isOwnProfile = currentUser && currentUser.name.toLowerCase() === uploaderName.toLowerCase();

    createSettingsModalHTML();
    createEditModalHTML();

    let resUsers = await safeQuery(function(client) { return client.from('cinenet_users').select('*'); });
    let usersList = resUsers.data || [];
    let userInfo = usersList.find(function(u) { return u.name.toLowerCase() === uploaderName.toLowerCase(); });

    let safeDefaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='%23ffcc00'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

    let profilePic = (userInfo && userInfo.profile_pic) ? userInfo.profile_pic : safeDefaultAvatar;
    let instaId = (userInfo && userInfo.insta_id) ? userInfo.insta_id.trim() : '';
    let branch = userInfo ? userInfo.branch : 'N/A';
    let year = userInfo ? userInfo.year : 'N/A';
    let roll = userInfo ? userInfo.roll : 'N/A';

    if(containerWrapper) {
        containerWrapper.innerHTML = '<div style="background: linear-gradient(135deg, #13151f 0%, #1a1d29 100%); border: 1px solid rgba(255,204,0,0.3); border-radius: 16px; padding: 35px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">' +
            '<div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left; flex: 1; min-width: 250px;">' +
                '<h2 style="color: #ffcc00; font-family: \'Space Grotesk\', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">' + uploaderName + '</h2>' +
                '<p style="color: #cbd5e1; font-size: 15px; margin-bottom: 6px;"><strong>Branch:</strong> ' + branch + ' &bull; <strong>Year:</strong> ' + year + ' Year</p>' +
                '<p style="color: #cbd5e1; font-size: 14px; margin-bottom: 12px;"><strong>Roll No:</strong> ' + roll + '</p>' +
                (instaId ? '<p style="margin-top: 4px;"><a href="https://instagram.com/' + instaId.replace('@','') + '" target="_blank" style="color: #e1306c; font-weight: bold; text-decoration: none; background: rgba(225,48,108,0.1); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(225,48,108,0.3); display: inline-flex; align-items: center; gap: 6px;">📷 Instagram: @' + instaId.replace('@','') + '</a></p>' : '<p style="color: #888; font-size: 13px; font-style: italic;">Instagram ID: Not provided (Optional)</p>') +
            '</div>' +
            '<div style="display: flex; justify-content: center; align-items: center;">' +
                '<img src="' + profilePic + '" style="width: 130px; height: 130px; border-radius: 50%; object-fit: cover; border: 4px solid #ffcc00; box-shadow: 0 0 25px rgba(255,204,0,0.4);" onerror="this.src=\'' + safeDefaultAvatar + '\'">' +
            '</div>' +
        '</div>';
    }

    let res = await safeQuery(function(client) { return client.from('mediaStore').select('*'); });
    let allContent = res.data || [];
    let userWorks = allContent.filter(function(c) { return c.uploader && c.uploader.toLowerCase() === uploaderName.toLowerCase() && c.type === 'Photograph'; });
    let gridEl = document.getElementById('portfolioContentGrid');

    if(gridEl) {
        gridEl.innerHTML = userWorks.length === 0 ? '<p style="color:#888; text-align:center; grid-column: 1/-1;">No photographs uploaded in portfolio yet.</p>' :
            userWorks.map(function(item) {
                let safeTitle = item.title ? item.title.replace(/"/g, '&quot;') : 'Masterpiece';
                return '<div class="card" style="position: relative;">' +
                    ((isAdmin || isOwnProfile) ? '<div class="three-dots-menu" style="position: absolute; top: 15px; right: 15px; z-index: 10;">' +
                        '<button onclick="toggleDropdownMenu(' + item.id + ')" style="background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.3); color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 16px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.8);">⋮</button>' +
                        '<div id="dropdown_' + item.id + '" class="dropdown-options" style="display: none; position: absolute; right: 0; top: 38px; background: #1a1d29; border: 1px solid #444; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.9); width: 130px; z-index: 20; overflow: hidden;">' +
                            '<button onclick="openEditPhotoModal(' + item.id + ', \'' + safeTitle + '\', \'' + item.file_url + '\')" style="width: 100%; text-align: left; background: none; border: none; color: #fff; padding: 10px 14px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #333;">✏️ Edit</button>' +
                            '<button onclick="deleteCloudMedia(' + item.id + ')" style="width: 100%; text-align: left; background: none; border: none; color: #ff4d4d; padding: 10px 14px; font-size: 13px; cursor: pointer; font-weight: bold;">🗑️ Delete</button>' +
                        '</div>' +
                    '</div>' : '') +
                    '<div style="width: 100%; overflow: hidden; cursor: pointer;" class="gallery-photo-item" data-url="' + item.file_url + '" data-title="' + safeTitle + '">' +
                        '<img src="' + item.file_url + '" alt="Photograph" onload="adjustMasonrySpan(this)" style="width: 100%; display: block;" title="Click to view full image & description">' +
                    '</div>' +
                    '<div style="padding-top: 10px;">' +
                        '<h4 style="color:#fff; font-size: 15px; font-weight: 600; word-break: break-word;">' + formatDescriptionWithLinks(item.title) + '</h4>' +
                    '</div>' +
                '</div>';
            }).join('');
    }
}

function renderPhotographsGrid() {
    let photosGrid = document.getElementById('homePhotosGrid');
    if (!photosGrid) return;
    
    photosGrid.innerHTML = photographs.length === 0 ? '<p style="color:#888; text-align:center;">No photographs uploaded yet.</p>' :
        photographs.map(function(item) {
            return '<div class="card">' +
                '<span class="team-tag" style="margin-bottom:8px; display:inline-block;" ...>' +
                '<img src="' + item.file_url + '" onclick="openFullImageModal(\'' + item.file_url + '\', \'' + (item.title || 'Photograph') + '\', \'' + item.uploader + '\')" alt="Photo">' +
                '<h4 style="margin-top:10px; font-size:15px; color:#fff; word-break:break-word;">' + formatDescriptionWithLinks(item.title) + '</h4>' +
                '<p style="font-size:12px; color:#aaa; margin-top:8px;">By: <span onclick="openUserProfile(\'' + item.uploader + '\')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">' + item.uploader + '</span></p>' +
            '</div>';
        }).join('');
}


function adjustMasonrySpan(img) {
    // Masonry layout helper adjustment
    if (!img) return;
    let grid = img.closest('#homePhotosGrid, #portfolioContentGrid');
    if (!grid) return;
    let rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows')) || 20;
    let rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('gap')) || 15;
    let card = img.closest('.card') || img.parentElement;
    if (card) {
        let contentHeight = img.getBoundingClientRect().height;
        let span = Math.ceil((contentHeight + rowGap) / (rowHeight + rowGap));
        card.style.gridRowEnd = 'span ' + span;
    }
}
async function saveAdminWinner(category) {
    let inputEl = document.getElementById(category === 'filmmaker' ? 'adminBestFilmmakerInput' : 'adminBestPhotographerInput');
    let mediaEl = document.getElementById(category === 'filmmaker' ? 'adminBestFilmmakerMedia' : 'adminBestPhotographerMedia');
    if(!inputEl) return;

    let winnerName = inputEl.value.trim();
    let mediaUrl = mediaEl ? mediaEl.value : '';

    if(!winnerName) {
        alert('⚠️ Please enter the winner username!');
        return;
    }

    let resCheck = await safeQuery(function(client) { return client.from('winners').select('*').eq('category', category); });
    let existing = resCheck.data || [];

    if(existing.length > 0) {
        let resUpdate = await safeQuery(function(client) {
            return client.from('winners').update({ uploader: winnerName, media_url: mediaUrl, title: mediaUrl }).eq('category', category);
        });
        if(resUpdate.error) {
            alert('❌ Failed to update winner: ' + resUpdate.error.message);
            return;
        }
    } else {
        let resInsert = await safeQuery(function(client) {
            return client.from('winners').insert([{ category: category, uploader: winnerName, media_url: mediaUrl, title: mediaUrl }]);
        });
        if(resInsert.error) {
            alert('❌ Failed to insert winner: ' + resInsert.error.message);
            return;
        }
    }

    alert('✅ Best ' + category + ' winner updated successfully!');
    loadAwardsBanners();
}
function toggleMobileMenu() {
    let nav = document.getElementById('globalNavbarLinks');
    if (nav) {
        nav.classList.toggle('mobile-active');
    }
}

function closeMobileMenu() {
    let nav = document.getElementById('globalNavbarLinks');
    if (nav) {
        nav.classList.remove('mobile-active');
    }
}

function filterHomeContent(type) {
    let filmsBlock = document.getElementById('filter-block-films');
    let photosBlock = document.getElementById('filter-block-photos');
    let filmsGrid = document.getElementById('homeShortFilmsGrid');
    let photosGrid = document.getElementById('homePhotosGrid');

    if (type === 'films') {
        if(filmsBlock) {
            filmsBlock.style.display = 'block';
            filmsBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if(photosBlock) photosBlock.style.display = 'none';
    } else if (type === 'photos') {
        if(filmsBlock) filmsBlock.style.display = 'none';
        if(photosBlock) {
            photosBlock.style.display = 'block';
            photosBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        if(filmsBlock) filmsBlock.style.display = 'block';
        if(photosBlock) photosBlock.style.display = 'block';
        
        let filterTabs = document.querySelector('.content-block') || filmsBlock;
        if(filterTabs) {
            filterTabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (filmsGrid) {
        filmsGrid.innerHTML = shortFilms.length === 0 ? '<p style="color:#888; text-align:center; width:100%; grid-column:1/-1;">No short films uploaded yet.</p>' :
            shortFilms.map(function(item) {
                return '<div class="card">' +
                    '<video width="100%" controls preload="metadata" style="border-radius:6px; margin-top:8px; background:#000;">' +
                        '<source src="' + item.file_url + '" type="video/mp4">' +
                    '</video>' +
                    '<h4 style="margin-top:10px; font-size:15px; color:#fff; word-break:break-word;">' + formatDescriptionWithLinks(item.title) + '</h4>' +
                    '<p style="font-size:12px; color:#aaa; margin-top:8px;">By: <span onclick="openUserProfile(\'' + item.uploader + '\')" style="color:#ffcc00; cursor:pointer; text-decoration:underline; font-weight:bold;">' + item.uploader + '</span></p>' +
                '</div>';
            }).join('');
    }
}

async function handleUserSearch() {
    let inputEl = document.getElementById('globalUserSearchInput');
    if(!inputEl) return;
    
    let searchName = inputEl.value.trim().toLowerCase();
    if(!searchName) {
        alert('⚠️ Please enter a username to search!');
        return;
    }

    try {
        let res = await safeQuery(function(client) { 
            return client.from('cinenet_users').select('*'); 
        });
        
        if (res.error) {
            alert('❌ Database query failed: ' + res.error.message);
            return;
        }

        let allUsers = res.data || [];
        let matchedUser = allUsers.find(function(u) {
            return u.name && u.name.toLowerCase().includes(searchName);
        });

        if(matchedUser) {
            inputEl.value = '';
            openUserProfile(matchedUser.name);
        } else {
            alert('❌ No user found with the name "' + searchName + '"');
        }
    } catch (err) {
        console.error("Search error:", err);
        alert('⚠️ An error occurred during search.');
    }
}
function toggleSearchInput() {
    let popup = document.getElementById('searchInputPopup');
    if(popup) {
        if(popup.style.display === 'none' || popup.style.display === '') {
            popup.style.display = 'flex';
            let input = document.getElementById('globalUserSearchInput');
            if(input) input.focus();
        } else {
            popup.style.display = 'none';
        }
    }
}


