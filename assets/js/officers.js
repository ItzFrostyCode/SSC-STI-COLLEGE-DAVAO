document.addEventListener('DOMContentLoaded', () => {
    loadOfficersPage();
});


const LAYOUT_CONFIG = [
    {
        type: 'divider',
        label: 'Adviser'
    },
    {
        type: 'row',
        names: ['Reinamie Dayrit']
    },
    {
        type: 'divider',
        label: 'OSA'
    },
    {
        type: 'row',
        names: ['Upcoming']
    },
    {
        type: 'divider',
        label: 'Executive Officers'
    },
    {
        type: 'row',
        names: ['Chester Paul Villasencio']
    },
    {
        type: 'row',
        names: ['Chesilyn Dianne Tabigue', 'Cj Love Marie Astudillo']
    },
    {
        type: 'row',
        names: ['Jandoe Garay', 'John Romar Pardo', 'Joshua Arabejo', 'Cherry Jane Villasencio']
    },
    {
        type: 'divider',
        label: 'Senators'
    },
    {
        type: 'row',
        names: ['Carol Dela Cerna', 'Rizza Joy Mendez', 'Rylle Manco']
    },
    {
        type: 'row',
        names: ['Grace Dhel Asoy', 'Reasylee Abella', 'Princess Rhian Tadem']
    },
    {
        type: 'divider',
        label: 'Staff'
    },
    {
        type: 'row',
        names: ['Ivy Robles']
    },
    {
        type: 'row',
        names: ['Yhanzee Manuel Payot', 'Tryx-C Espino', 'Najem Diaregun']
    },
    {
        type: 'row',
        names: ['Samantha Pabuaya', 'Arnold Tajo', 'Shamyll Gelbolingo']
    }
];

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        return null;
    }
}

async function loadOfficersPage() {
    const listContainer = document.querySelector('#officers-list');
    if (!listContainer) return;

    // Change the class to use wrapper instead of grid
    listContainer.className = 'officers-wrapper';

    const data = await fetchData('data/officers.json');
    if (!data) {
        listContainer.innerHTML = '<p class="text-center">Failed to load officers data.</p>';
        return;
    }

    // Map for easy lookup
    const officerMap = new Map();
    data.forEach(officer => {
        officerMap.set(officer.name.toLowerCase().trim(), officer);
    });

    let html = '';

    LAYOUT_CONFIG.forEach(item => {
        if (item.type === 'divider') {
            html += `
                <div class="section-divider">
                    <h2>${item.label}</h2>
                </div>
            `;
        } else if (item.type === 'row') {
            html += '<div class="officers-row">';
            item.names.forEach(name => {
                // Find officer by name (loose match or direct match)
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
                } else {
                    console.warn(`Officer not found: ${name}`);
                }
            });
            html += '</div>';
        }
    });

    listContainer.innerHTML = html;
}

function createOfficerCard(officer) {
    const constImageSrc = officer.image ? `assets/images/officers/${officer.image}` : '';
    const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(officer.name)}&background=f59e0b&color=fff&size=200`;


    const isPremium = officer.name === 'Reinamie Dayrit';
    const premiumClass = isPremium ? 'premium-card' : '';

    return `
        <div class="officer-card ${premiumClass}">
            <div class="officer-image-container">
                <img src="${constImageSrc}" 
                     alt="${officer.name}" 
                     class="officer-image"
                     onerror="this.onerror=null; this.src='${fallbackImage}';">
                
                <div class="officer-socials">
                    ${officer.email ? `
                        <a href="mailto:${officer.email}" aria-label="Email">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </a>
                    ` : ''}
                    
                     <a href="#" aria-label="Facebook">
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>
                </div>
            </div>
            
            <div class="officer-info">
                <h3>${officer.name}</h3>
                <p class="officer-role">${officer.position}</p>
                <p class="officer-dept">${officer.department}</p>
            </div>
        </div>
    `;
}
