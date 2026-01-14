// src/modules/intramurals.js
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeIntramurals } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

let championData = null;

// State needed for filters
let activeScheduleDay = 'Day 1';
let activeResultsFilter = 'all';

export async function init() {
    console.log('Initializing Intramurals Module');
    try {
        championData = await fetchJSON('data/intramurals.json', {
            cache: true,
            ttl: 3600,
            adapter: normalizeIntramurals
        });
        renderAll();
    } catch (err) {
        console.error('Intramurals load failed:', err);
    }
}

function renderAll() {
    buildPodium();
    buildStats();
    buildTeams();
    buildTimeline();
    buildScoreboard();
    setupSectionTabs();
    setupModalListeners(); // Initialize modal events
}

function getRankings() {
    if (!championData) return [];
    
    // Consistent mapping
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
        // Simple interpolation as per original logic
        const day1 = calculateScoresForDay('Day 1');
        const day3 = calculateScoresForDay('Day 3');
        
        scores['Team A'] = Math.floor((day1['Team A'] + day3['Team A']) / 2);
        scores['Team B'] = Math.floor((day1['Team B'] + day3['Team B']) / 2);
        scores['Team C'] = Math.floor((day1['Team C'] + day3['Team C']) / 2);
    }
    
    return scores;
}

// Dom Builders

function buildPodium() {
    updatePodium('Day 1'); // Default start
    
    // Attach event listeners for podium buttons
    document.querySelectorAll('.podium-btn').forEach(btn => {
        // Clone to remove old listeners if any
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            updatePodium(e.target.textContent.trim());
        });
    });
}

function updatePodium(day) {
    document.querySelectorAll('.podium-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === day);
    });
    
    const scores = calculateScoresForDay(day);
    renderPodiumWithScores(scores);
}

function renderPodiumWithScores(scores) {
    const container = document.getElementById('tri-podium');
    if (!container || !championData) return;
    
    // Map scores to teams and sort
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
    
    const html = displayRanks.map((team) => {
        const actualRank = ranks.findIndex(r => r.code === team.code) + 1;
        const i = actualRank - 1; 
        
        return `
            <div class="podium-block position-${actualRank}" 
                 style="--bar-color: ${['var(--gold)', 'var(--silver)', 'var(--bronze)'][i]}" 
                 data-team="${team.code}">
                <div class="medal-icon" style="animation: float 3s ease-in-out infinite ${i*0.5}s">${medals[i]}</div>
                <div class="team-circle" style="border-color: ${team.theme_color}; background: ${team.name === 'Phoenix Invictus' ? '#000' : 'var(--bg-surface)'}">
                    <img src="${logos[team.name]}" alt="${escapeHtml(team.name)}" loading="lazy">
                </div>
                <div class="block-platform" style="animation: slideUp 0.5s ease-out backwards ${i*0.1}s">
                    <h3 class="team-name">${escapeHtml(team.name)}</h3>
                    <p class="team-dept">${escapeHtml(team.department)}</p>
                    <div class="points-display" style="color: ${team.theme_color}">
                        <span class="count-up" style="display:inline-block">${team.score}</span>
                    </div>
                    <div class="points-label">Points</div>
                </div>
                <div class="height-bar" style="height: ${[150, 100, 70][i]}px; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Re-attach click listeners for "showRoster"
    container.querySelectorAll('.podium-block').forEach(block => {
        block.addEventListener('click', () => showRoster(block.dataset.team));
    });
}

function buildStats() {
    const ranks = getRankings();
    const container = document.getElementById('stat-bars');
    if (!container) return;
    
    const max = Math.max(...ranks.map(r => r.score));
    
    container.innerHTML = ranks.map(team => `
        <div class="stat-row">
            <div class="stat-team" style="color: ${team.color}">${escapeHtml(team.dept)}</div>
            <div class="stat-track">
                <div class="stat-fill" style="background: ${team.color}; width: 0%" data-percent="${(team.score / max * 100).toFixed(1)}"></div>
            </div>
            <div class="stat-score">${team.score}</div>
        </div>
    `).join('');
    
    // Animation
    setTimeout(() => {
        container.querySelectorAll('.stat-fill').forEach(bar => {
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
        <div class="team-card" style="--team-color: ${team.color}" data-team="${team.code}">
            <div class="team-logo" style="border-color: ${team.color}">
                <img src="${logos[team.name]}" alt="${escapeHtml(team.name)}" loading="lazy">
            </div>
            <h3 class="team-title">${escapeHtml(team.name)}</h3>
            <div class="team-tag">${escapeHtml(team.dept)}</div>
            <button class="roster-btn">View Team</button>
        </div>
    `).join('');

    // Event delegation or direct attachment
    container.querySelectorAll('.team-card').forEach(card => {
        card.addEventListener('click', (e) => {
             // Stop propagation handled naturally by specific listeners unless strictly required
             showRoster(card.dataset.team);
        });
        card.querySelector('.roster-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showRoster(card.dataset.team);
        });
    });
}

function buildTimeline() {
    const container = document.getElementById('schedule-container');
    if (!container || !championData) return;
    
    const day = championData.schedule.find(s => s.day === activeScheduleDay);
    if (!day) return;
    
    const delayStep = 0.1;

    container.innerHTML = day.activities.map((act, index) => `
        <div class="timeline-item" style="animation-delay: ${index * delayStep}s">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <span class="t-time">${escapeHtml(act.time)}</span>
                <h3 class="t-activity">${escapeHtml(act.activity)}</h3>
                <div class="t-venue">
                    <span>📍</span> ${escapeHtml(act.venue)}
                </div>
                ${act.details ? `<p style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(act.details)}</p>` : ''}
            </div>
        </div>
    `).join('');
}


function buildScoreboard() {
    const container = document.getElementById('results-container');
    if (!container || !championData) return;

    // Team Mapping: Code -> Full Name
    const codeToName = {
        'SHS': 'Dragon Vanguard',
        'THM': 'Pegasus Fury',
        'ICT': 'Phoenix Invictus'
    };
    
    // Process Categories (Similar logic to original but ensuring safety)
    let allEvents = [];
    if (Array.isArray(championData.categories)) {
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

    // Filter Logic
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
    
    // Safe DOM creation using HTML string
    container.innerHTML = events.map((evt) => {
        const winner = evt.results.find(r => r.position === 1);
        const winnerColor = winner && getTeamColor(winner.team) || 'var(--text-muted)';
        
        return `
            <div class="score-card" style="opacity: 1; animation: none; --winner-color: ${winnerColor}">
                <div class="score-header">
                    <div class="score-event">${escapeHtml(evt.event)}</div>
                    <div class="score-cat-badge" style="font-size: 0.6rem; opacity: 0.7; margin-left: auto;">${escapeHtml(evt.category)}</div>
                </div>
                <div class="score-body">
                    ${evt.results.map(r => {
                        const isWinner = r.position === 1;
                        const pointsText = r.isNull ? '' : `+${r.score}`;
                        let rankClass = r.position === 1 ? 'rank-1' : (r.position === 2 ? 'rank-2' : (r.position === 3 ? 'rank-3' : ''));
                        
                        return `
                        <div class="score-row ${rankClass}">
                            <div class="rank-badge">${r.position || '-'}</div>
                            <div class="score-team ${isWinner ? 'winner' : ''}" style="${isWinner ? '' : 'color: var(--text-main)'}">
                                ${escapeHtml(r.team)}
                            </div>
                            ${pointsText ? `<div class="team-points">${pointsText}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function getTeamColor(teamName) {
    if(!championData) return '#6c757d';
    const team = championData.teams.find(t => t.name === teamName);
    return team ? team.theme_color : '#6c757d'; 
}

function setupSectionTabs() {
    // Schedule Tabs
    const scheduleTabs = document.getElementById('schedule-tabs');
    if (scheduleTabs) {
        scheduleTabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                scheduleTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeScheduleDay = btn.dataset.day;
                buildTimeline();
            });
        });
    }

    // Results Tabs
    const catFilters = document.getElementById('category-filters');
    if (catFilters) {
         catFilters.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                catFilters.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeResultsFilter = btn.dataset.filter;
                buildScoreboard();
            });
        });
    }
}

// Modal Logic
function setupModalListeners() {
    // Global listener for modal close on background click
    const modal = document.getElementById('roster-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target.classList.contains('roster-modal')) hideModal();
        });
    }
}

function showRoster(teamCode) {
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
        <button class="modal-close" onclick="document.getElementById('roster-modal').classList.remove('show'); document.body.style.overflow = '';">&times;</button>
        <div class="modal-team-header">
            <img src="${logos[team.name]}" class="modal-team-logo" style="border-color: ${team.color}" loading="lazy">
            <div>
                <h2 class="modal-team-name" style="color: ${team.color}">${escapeHtml(team.name)}</h2>
                <p>${escapeHtml(team.dept)} • ${team.score} Points</p>
            </div>
        </div>
    `;
    
    // Roster generation logic (Simplified for clarity, ported from original)
    const renderCategory = (title, data) => {
       if(!data) return '';
       let section = `<div class="roster-category"><h3 class="category-title">${title}</h3><div class="roster-grid">`;
       let hasContent = false;
       
       Object.entries(data).forEach(([key, val]) => {
           const name = key.replace(/_/g, ' ').toUpperCase();
           if (Array.isArray(val) && val.length > 0) {
               section += `<div class="roster-box"><strong>${escapeHtml(name)}</strong>${val.map(escapeHtml).join('<br>')}</div>`;
               hasContent = true;
           } else if (typeof val === 'object') {
                Object.entries(val).forEach(([subKey, subVal]) => {
                    if (Array.isArray(subVal) && subVal.length > 0) {
                         section += `<div class="roster-box"><strong>${escapeHtml(name)} ${subKey.replace(/_/g, ' ').toUpperCase()}</strong>${subVal.map(escapeHtml).join('<br>')}</div>`;
                         hasContent = true;
                    }
                });
           }
       });
       section += '</div></div>';
       return hasContent ? section : '';
    };

    html += renderCategory('Major Activities Team Members', team.roster.major_activities);
    html += renderCategory('Minor Activities Team Members', team.roster.minor_activities);
    html += renderCategory('Larong Pinoy Team Members', team.roster.larong_pinoy);

    content.innerHTML = html;
    
    // Add close listener to the new button
    content.querySelector('.modal-close').addEventListener('click', hideModal);

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    document.getElementById('roster-modal').classList.remove('show');
    document.body.style.overflow = '';
}
