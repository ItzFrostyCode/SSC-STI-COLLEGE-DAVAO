
let championData = null;

async function loadChampionData() {
    try {
        const res = await fetch('data/intramurals.json');
        championData = await res.json();
        renderAll();
    } catch (err) {
        console.error('Load failed:', err);
    }
}

function renderAll() {
    buildPodium();
    buildStats();
    buildTeams();
    buildTimeline();
    buildScoreboard();
    setupSectionTabs();
}

function getRankings() {
    if (!championData) return [];
    
    const teamMap = { 'Team A': 'SHS', 'Team B': 'THM', 'Team C': 'ICT' };
    
    return championData.teams.map(t => ({
        code: t.code,
        name: t.name,
        dept: t.department,
        color: t.theme_color,
        score: championData.final_tally[teamMap[t.code]] || 0,
        roster: t.participants
    })).sort((a, b) => b.score - a.score);
}


function calculateScoresForDay(dayLimit) {
    if (!championData) return {};
    
    const teamMap = { 'Team A': 'SHS', 'Team B': 'THM', 'Team C': 'ICT' };
    const reverseMap = { 'SHS': 'Team A', 'THM': 'Team B', 'ICT': 'Team C' };
    
    let scores = { 'Team A': 0, 'Team B': 0, 'Team C': 0 };

    if (dayLimit === 'Day 1') {
        if (championData.day1_results && championData.day1_results.overall_standings) {
             championData.day1_results.overall_standings.forEach(entry => {
                 let code = '';
                 if (entry.team_name === 'Phoenix Invictus') code = 'Team C';
                 else if (entry.team_name === 'Dragon Vanguard') code = 'Team A';
                 else if (entry.team_name === 'Pegasus Fury') code = 'Team B';
                 
                 if (code) scores[code] = entry.total_points;
             });
        }
    } 
    else if (dayLimit === 'Day 3' || dayLimit === 'Final') {
        if (championData.final_tally) {
            scores['Team A'] = championData.final_tally['SHS'] || 0;
            scores['Team B'] = championData.final_tally['THM'] || 0;
            scores['Team C'] = championData.final_tally['ICT'] || 0;
        }
    }
    else if (dayLimit === 'Day 2') {
        const day1 = calculateScoresForDay('Day 1');
        const day3 = calculateScoresForDay('Day 3');
        
        scores['Team A'] = Math.floor((day1['Team A'] + day3['Team A']) / 2);
        scores['Team B'] = Math.floor((day1['Team B'] + day3['Team B']) / 2);
        scores['Team C'] = Math.floor((day1['Team C'] + day3['Team C']) / 2);
    }
    
    return scores;
}

// Normalizer helper
const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function updatePodium(day) {
    // Update Active Button
    document.querySelectorAll('.podium-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === day);
    });
    
    let scores = calculateScoresForDay(day);
    renderPodiumWithScores(scores);
}

function renderPodiumWithScores(scores) {
    const container = document.getElementById('tri-podium');
    if (!container || !championData) return;
    const ranks = championData.teams.map(t => ({
        ...t,
        score: scores[t.code] || 0
    })).sort((a, b) => b.score - a.score);
    
    const logos = {
        'Dragon Vanguard': 'assets/images/team-logo/Dragon-Vanguard.jpg',
        'Pegasus Fury': 'assets/images/team-logo/Pegasus-Fury.jpg',
        'Phoenix Invictus': 'assets/images/team-logo/Pheonix-Invictus.png'
    };
    
    const medals = ['🥇', '🥈', '🥉'];
    const displayRanks = [ranks[1], ranks[0], ranks[2]].filter(t => t);
    
    container.innerHTML = displayRanks.map((team) => {
        const actualRank = ranks.findIndex(r => r.code === team.code) + 1;
        const i = actualRank - 1;
        
        return `
            <div class="podium-block position-${actualRank}" style="--bar-color: ${['var(--gold)', 'var(--silver)', 'var(--bronze)'][i]}" onclick="showRoster('${team.code}')">
                <div class="medal-icon" style="animation: float 3s ease-in-out infinite ${i*0.5}s">${medals[i]}</div>
                <div class="team-circle" style="border-color: ${team.theme_color}; background: ${team.name === 'Phoenix Invictus' ? '#000' : 'var(--bg-surface)'}">
                    <img src="${logos[team.name]}" alt="${team.name}">
                </div>
                <div class="block-platform" style="animation: slideUp 0.5s ease-out backwards ${i*0.1}s">
                    <h3 class="team-name">${team.name}</h3>
                    <p class="team-dept">${team.department}</p>
                    <div class="points-display" style="color: ${team.theme_color}">
                        <span class="count-up" style="display:inline-block">${team.score}</span>
                    </div>
                    <div class="points-label">Points</div>
                </div>
                <div class="height-bar" style="height: ${[150, 100, 70][i]}px; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
        `;
    }).join('');
}


function buildPodium() {
    updatePodium('Day 1');
}

function buildStats() {
    const ranks = getRankings();
    const container = document.getElementById('stat-bars');
    if (!container) return;
    
    const max = Math.max(...ranks.map(r => r.score));
    
    container.innerHTML = ranks.map(team => `
        <div class="stat-row">
            <div class="stat-team" style="color: ${team.color}">${team.dept}</div>
            <div class="stat-track">
                <div class="stat-fill" style="background: ${team.color}; width: 0%" data-percent="${(team.score / max * 100).toFixed(1)}"></div>
            </div>
            <div class="stat-score">${team.score}</div>
        </div>
    `).join('');
    
    setTimeout(() => {
        document.querySelectorAll('.stat-fill').forEach(bar => {
            bar.style.width = bar.dataset.percent + '%';
        });
    }, 200);
}

function buildTeams() {
    const ranks = getRankings();
    const container = document.getElementById('teams-grid');
    if (!container) return;
    
    const logos = {
        'Dragon Vanguard': 'assets/images/team-logo/Dragon-Vanguard.jpg',
        'Pegasus Fury': 'assets/images/team-logo/Pegasus-Fury.jpg',
        'Phoenix Invictus': 'assets/images/team-logo/Pheonix-Invictus.png'
    };
    
    container.innerHTML = ranks.map(team => `
        <div class="team-card" style="--team-color: ${team.color}" onclick="showRoster('${team.code}')">
            <div class="team-logo" style="border-color: ${team.color}">
                <img src="${logos[team.name]}" alt="${team.name}">
            </div>
            <h3 class="team-title">${team.name}</h3>
            <div class="team-tag">${team.dept}</div>
            <button class="roster-btn" onclick="event.stopPropagation(); showRoster('${team.code}')">View Team</button>
        </div>
    `).join('');
}



window.showRoster = function(teamCode) {
    const team = getRankings().find(t => t.code === teamCode);
    if (!team) return;
    
    const modal = document.getElementById('roster-modal');
    const content = modal.querySelector('.modal-box');
    
    const logos = {
        'Dragon Vanguard': 'assets/images/team-logo/Dragon-Vanguard.jpg',
        'Pegasus Fury': 'assets/images/team-logo/Pegasus-Fury.jpg',
        'Phoenix Invictus': 'assets/images/team-logo/Pheonix-Invictus.png'
    };
    
    let html = `
        <button class="modal-close" onclick="hideModal()">&times;</button>
        <div class="modal-team-header">
            <img src="${logos[team.name]}" class="modal-team-logo" style="border-color: ${team.color}">
            <div>
                <h2 class="modal-team-name" style="color: ${team.color}">${team.name}</h2>
                <p>${team.dept} • ${team.score} Points</p>
            </div>
        </div>
    `;
    
    const { major_activities, minor_activities, larong_pinoy } = team.roster;
    
    if (major_activities) {
        html += '<div class="roster-category"><h3 class="category-title">Major Activities Team Members</h3><div class="roster-grid">';
        Object.entries(major_activities).forEach(([key, val]) => {
            const name = key.replace(/_/g, ' ').toUpperCase();
            if (Array.isArray(val) && val.length > 0) {
                html += `<div class="roster-box"><strong>${name}</strong>${val.join('<br>')}</div>`;
            } else if (typeof val === 'object') {
                Object.entries(val).forEach(([subKey, subVal]) => {
                    if (Array.isArray(subVal) && subVal.length > 0) {
                        html += `<div class="roster-box"><strong>${name} ${subKey.replace(/_/g, ' ').toUpperCase()}</strong>${subVal.join('<br>')}</div>`;
                    }
                });
            }
        });
        html += '</div></div>';
    }
    
    if (minor_activities) {
        html += '<div class="roster-category"><h3 class="category-title">Minor Activities Team Members</h3><div class="roster-grid">';
        Object.entries(minor_activities).forEach(([key, val]) => {
            const name = key.replace(/_/g, ' ').toUpperCase();
            if (Array.isArray(val) && val.length > 0) {
                html += `<div class="roster-box"><strong>${name}</strong>${val.join('<br>')}</div>`;
            } else if (typeof val === 'object') {
                Object.entries(val).forEach(([subKey, subVal]) => {
                    if (Array.isArray(subVal) && subVal.length > 0) {
                        html += `<div class="roster-box"><strong>${name} ${subKey.replace(/_/g, ' ').toUpperCase()}</strong>${subVal.join('<br>')}</div>`;
                    }
                });
            }
        });
        html += '</div></div>';
    }
    
    if (larong_pinoy) {
        html += '<div class="roster-category"><h3 class="category-title">Larong Pinoy Team Members</h3><div class="roster-grid">';
        Object.entries(larong_pinoy).forEach(([key, val]) => {
            if (Array.isArray(val) && val.length > 0) {
                const name = key.replace(/_/g, ' ').toUpperCase();
                html += `<div class="roster-box"><strong>${name}</strong>${val.join('<br>')}</div>`;
            }
        });
        html += '</div></div>';
    }
    
    content.innerHTML = html;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
};



function hideModal() {
    document.getElementById('roster-modal').classList.remove('show');
    document.body.style.overflow = '';
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('roster-modal')) hideModal();
});

let activeScheduleDay = 'Day 1';
let activeResultsDay = 'Day 1';
let activeResultsFilter = 'all';

function buildTimeline() {
    const container = document.getElementById('schedule-container');
    if (!container || !championData) return;
    const day = championData.schedule.find(s => s.day === activeScheduleDay);
    if (!day) return;
    
    // Use smaller delay for stagger effect
    const delayStep = 0.1;

    container.innerHTML = day.activities.map((act, index) => `
        <div class="timeline-item" style="animation-delay: ${index * delayStep}s">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <span class="t-time">${act.time}</span>
                <h3 class="t-activity">${act.activity}</h3>
                <div class="t-venue">
                    <span>📍</span> ${act.venue}
                </div>
                ${act.details ? `<p style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">${act.details}</p>` : ''}
            </div>
        </div>
    `).join('');
}



function buildScoreboard() {
    const container = document.getElementById('results-container');
    console.log('Building Scoreboard...', { container, championData });
    
    if (!container || !championData) return;
    const codeToName = {
        'SHS': 'Dragon Vanguard',
        'THM': 'Pegasus Fury',
        'ICT': 'Phoenix Invictus'
    };
    let allEvents = [];
    if (championData.categories && Array.isArray(championData.categories)) {
        championData.categories.forEach(cat => {
            if (cat.events) {
                cat.events.forEach(evt => {
                    let results = [];
                    if (evt.scores) {
                        const entries = Object.entries(evt.scores)
                            .map(([key, score]) => ({
                                team: codeToName[key] || key,
                                score: score === null ? 0 : score,
                                code: key,
                                isNull: score === null
                            }))
                            .sort((a, b) => b.score - a.score);

                        results = entries.map((entry, index) => ({
                            team: entry.team,
                            position: entry.isNull ? null : index + 1,
                            rank_label: entry.isNull ? 'No Score' : (index === 0 ? 'Winner' : `Rank ${index + 1}`),
                            score: entry.score,
                            isNull: entry.isNull
                        }));
                    }
                    
                    allEvents.push({
                        category: cat.name,
                        event: evt.event_name,
                        results: results
                    });
                });
            }
        });
    }
    
    console.log('All Events parsed:', allEvents.length, allEvents);

    // Direct score display from the transformed object
    const getPoints = (scoreVal) => {
        return scoreVal > 0 ? `+${scoreVal}` : '';
    };
    const getTeamColor = (teamName) => {
        return team ? team.theme_color : '#6c757d'; 
    };


    let events = allEvents;
    if (activeResultsFilter !== 'all') {
        const filter = activeResultsFilter.toLowerCase();
        
        events = events.filter(evt => {
            const catName = (evt.category || '').toLowerCase();
            
            if (filter === 'major') return catName.includes('major');
            if (filter === 'minor') return catName.includes('minor') || catName.includes('larong') || catName.includes('traditional');
            if (filter === 'musical') return catName.includes('musical');
            if (filter === 'e-sports') return catName.includes('esports') || catName.includes('e-sports');
            if (filter === 'mind games') return catName.includes('mind');
            
            return catName.includes(filter);
        });
    }
    
    if (events.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 2rem; grid-column: 1/-1;">No events found for this category</div>';
        return;
    }
    
    container.innerHTML = events.map((evt, index) => {
        const winner = evt.results.find(r => r.position === 1);
        const winnerColor = winner ? getTeamColor(winner.team) : 'var(--text-muted)';
        
        return `
            <div class="score-card" style="opacity: 1; animation: none; --winner-color: ${winnerColor}">
                <div class="score-header">
                    <div class="score-event">${evt.event}</div>
                    <div class="score-cat-badge" style="font-size: 0.6rem; opacity: 0.7; margin-left: auto;">${evt.category}</div>
                </div>
                <div class="score-body">
                    ${evt.results.map(r => {
                        const isWinner = r.position === 1;
                        const isNoScore = r.isNull;
                        const pointsText = isNoScore ? '' : `+${r.score}`;
                        
                        let rankClass = '';
                        if (r.position === 1) rankClass = 'rank-1';
                        else if (r.position === 2) rankClass = 'rank-2';
                        else if (r.position === 3) rankClass = 'rank-3';
                        
                        return `
                        <div class="score-row ${rankClass}">
                            <div class="rank-badge">${r.position || '-'}</div>
                            <div class="score-team ${isWinner ? 'winner' : ''}" style="${isWinner ? '' : 'color: var(--text-main)'}">
                                ${r.team}
                            </div>
                            ${pointsText ? `<div class="team-points">${pointsText}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function setupSectionTabs() {
    document.querySelectorAll('#schedule-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#schedule-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeScheduleDay = btn.dataset.day;
            buildTimeline();
        });
    });

    // Results Filters (Category)
    document.querySelectorAll('#category-filters .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#category-filters .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeResultsFilter = btn.dataset.filter;
            buildScoreboard();
        });
    });
}
document.addEventListener('DOMContentLoaded', loadChampionData);
