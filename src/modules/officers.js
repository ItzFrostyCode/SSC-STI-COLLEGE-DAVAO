
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeOfficers } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';


const LAYOUT_CONFIG = [
    { type: 'divider', label: 'Adviser' },
    { type: 'row', names: ['Reinamie Dayrit'] },
    { type: 'divider', label: 'SAO' },
    { type: 'row', names: ['Diether Kenz Cabrestante Vallejo'] },
    { type: 'divider', label: 'Executive Officers' },
    { type: 'row', names: ['Chester Paul Villasencio'] },
    { type: 'row', names: ['Chesilyn Dianne Tabigue', 'Cj Love Marie Astudillo'] },
    { type: 'row', names: ['Jandoe Garay', 'John Romar Pardo', 'Joshua Arabejo', 'Cherry Jane Villasencio'] },
    { type: 'divider', label: 'Senators' },
    { type: 'row', names: ['Carol Dela Cerna', 'Rizza Joy Mendez', 'Rylle Manco'] },
    { type: 'row', names: ['Grace Dhel Asoy', 'Reasylee Abella', 'Princess Rhian Tadem'] },
    { type: 'divider', label: 'Staff' },
    { type: 'row', names: ['Ivy Robles'] },
    { type: 'row', names: ['Yhanzee Manuel Payot', 'Tryx-C Espino', 'Najem Diaregun'] },
    { type: 'row', names: ['Samantha Pabuaya', 'Arnold Tajo', 'Shamyll Gelbolingo'] }
];

export async function init() {
    console.log('Initializing Officers Module');
    try {
        const data = await fetchJSON('data/officers.json', {
            cache: true,
            ttl: 300,
            adapter: normalizeOfficers 
        });

        if (data) {
            renderOfficers(data);
        }
    } catch (e) {
        console.error('Officers load failed', e);
    }
}

function renderOfficers(allOfficers) {
    const listContainer = document.querySelector('#officers-list');
    if (!listContainer) return;

    listContainer.className = 'officers-wrapper'; 

    
    const officerMap = new Map();
    allOfficers.forEach(officer => {
        if(officer && officer.name) {
            officerMap.set(officer.name.toLowerCase().trim(), officer);
        }
    });

    let html = '';

    LAYOUT_CONFIG.forEach(item => {
        if (item.type === 'divider') {
            html += `
                <div class="section-divider">
                    <h2>${escapeHtml(item.label)}</h2>
                </div>
            `;
        } else if (item.type === 'row') {
            html += '<div class="officers-row">';
            item.names.forEach(name => {
                
                if (name === 'Upcoming') {
                     
                     
                     
                    
                    
                    
                    
                    
                }

                let officer = officerMap.get(name.toLowerCase().trim());
                
                
                if (!officer) {
                    for (let [key, val] of officerMap) {
                        if (key.includes(name.toLowerCase().trim())) {
                            officer = val;
                            break;
                        }
                    }
                }

                if (officer) {
                    html += createOfficerCard(officer);
                } else if (name === 'Upcoming') {
                    
                     html += `
                        <div class="officer-card">
                             <div class="officer-image-container">
                                <div class="officer-image" style="background: #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                    <img src="assets/images/default-avatar.svg" alt="Placeholder" style="width:100%; height:100%; object-fit:cover; opacity:0.5;">
                                </div>
                             </div>
                             <div class="officer-info">
                                <h3>-</h3>
                                <p class="officer-role">SAO Representative</p>
                             </div>
                        </div>
                     `;
                }
            });
            html += '</div>';
        }
    });

    listContainer.innerHTML = html;
    attachImageListeners();
}

function createOfficerCard(officer) {
    const constImageSrc = officer.image ? `assets/images/officers/${officer.image}` : 'assets/images/default-avatar.svg';
    
    const isPremium = officer.name === 'Reinamie Dayrit';
    const premiumClass = isPremium ? 'premium-card' : '';
    

    const cardHTML = `
        <div class="officer-card ${premiumClass} fade-in">
            <div class="officer-image-container skeleton">
                <img src="${constImageSrc}" 
                     alt="${escapeHtml(officer.name)}" 
                     class="officer-image"
                     loading="lazy">
                
                ${officer.email ? `
                <div class="officer-socials">
                    <a href="mailto:${officer.email}" aria-label="Email">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </a>
                </div>` : ''}
            </div>
            
            <div class="officer-info">
                <h3>${escapeHtml(officer.name)}</h3>
                <p class="officer-role">${escapeHtml(officer.position)}</p>
                <p class="officer-dept">${escapeHtml(officer.department)}</p>
            </div>
        </div>
    `;
    return cardHTML;
}

export function attachImageListeners() {
    const images = document.querySelectorAll('.officer-image');
    images.forEach(img => {
        
        if (img.dataset.loaded === 'true') return;

        const handleLoad = () => {
             const container = img.closest('.officer-image-container');
             if(container) container.classList.remove('skeleton');
             img.dataset.loaded = 'true';
        };
        
        const handleError = () => {
             const container = img.closest('.officer-image-container');
             if(container) container.classList.remove('skeleton');
             img.src = 'assets/images/default-avatar.svg';
        };

        if (img.complete && img.naturalWidth > 0) {
            handleLoad();
        } else {
            img.onload = handleLoad;
            img.onerror = handleError;
        }
    });
}
