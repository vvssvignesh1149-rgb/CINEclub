function showSection(sectionId) {
    document.querySelectorAll('.main-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    if(sectionId === 'teams-page') {
        checkUserTeamStatus();
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

function joinTeam(teamName) {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) {
        alert('Please login first to join a team!');
        showSection('auth');
        return;
    }

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
    checkUserTeamStatus();
    viewTeamMembers(teamName);
}

function exitTeam() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    if(!currentUser) return;

    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    users = users.map(u => {
        if(u.roll === currentUser.roll) {
            u.team = null;
            currentUser.team = null;
        }
        return u;
    });

    localStorage.setItem('cinenet_users', JSON.stringify(users));
    localStorage.setItem('cinenet_current_user', JSON.stringify(currentUser));
    
    alert('Exited current team.');
    checkUserTeamStatus();
    document.getElementById('teamDetailView').style.display = 'none';
}

function checkUserTeamStatus() {
    let currentUser = JSON.parse(localStorage.getItem('cinenet_current_user'));
    let statusBox = document.getElementById('userStatusBox');
    if(currentUser && currentUser.team) {
        statusBox.style.display = 'block';
        document.getElementById('myAssignedTeam').innerText = currentUser.team;
    } else {
        statusBox.style.display = 'none';
    }
}

function viewTeamMembers(teamName) {
    let users = JSON.parse(localStorage.getItem('cinenet_users')) || [];
    let teamMembers = users.filter(u => u.team === teamName);

    document.getElementById('selectedTeamTitle').innerText = `Members of ${teamName}`;
    let listContainer = document.getElementById('teamMemberList');
    
    if(teamMembers.length === 0) {
        listContainer.innerHTML = '<p>No members in this team yet.</p>';
    } else {
        listContainer.innerHTML = teamMembers.map(m => `
            <div style="padding: 8px; border-bottom: 1px solid #333;">
                <strong>${m.name}</strong> - ${m.branch} (${m.year} Year)
            </div>
        `).join('');
    }
    document.getElementById('teamDetailView').style.display = 'block';
}