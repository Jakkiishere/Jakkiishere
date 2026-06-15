import './theme.css'
import './style.css'

class GameEngine {
  constructor() {
    this.app = document.querySelector('#app')
    this.caseData = null
    this.currentCaseId = null
    this.discoveredClues = []
    this.discoveredSuspects = []
    this.isDossierOpen = false
    this.isSolveOpen = false
    
    // Suspect image mapping (generic assets from designer to specific characters)
    this.suspectImages = {
      // Case 1
      'suspect-eleanor': '/assets/suspect-1-spouse.png',
      'suspect-nightowl': '/assets/suspect-2-neighbor.png',
      'suspect-patricia': '/assets/suspect-3-colleague.png',
      'suspect-danny': '/assets/suspect-3-colleague.png',
      // Case 2
      'suspect-claire': '/assets/suspect-1-spouse.png',
      'suspect-amara': '/assets/suspect-2-neighbor.png',
      'suspect-leo': '/assets/suspect-3-colleague.png',
      'suspect-buyer': '/assets/suspect-3-colleague.png',
      // Case 3
      'suspect-tom': '/assets/suspect-1-spouse.png',
      'suspect-kowalski': '/assets/suspect-2-neighbor.png',
      'suspect-karen': '/assets/suspect-3-colleague.png'
    }

    this.init()
  }

  async init() {
    this.renderSplash()
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed: ', err));
      });
    }

    // Small delay to show off the splash
    setTimeout(() => {
      this.renderMenu()
    }, 1500)
  }

  renderSplash() {
    this.app.innerHTML = `
      <div class="splash-overlay animate-in">
        <div class="badge badge--red">Bureau of Investigation</div>
        <h1 class="splash-overlay__title text-serif">COLD CASE SCROLL</h1>
        <p class="splash-overlay__subtitle">Decrypting secure files...</p>
      </div>
    `
  }

  async renderMenu() {
    this.app.innerHTML = `
      <div class="p-6 flex flex-col items-center justify-center min-h-screen animate-in">
        <header class="text-center mb-12">
          <h1 class="text-3xl text-serif mb-2">ACTIVE FILES</h1>
          <p class="text-muted">Select a case to begin your investigation.</p>
        </header>
        
        <div class="grid grid-cols-1 gap-6 w-full max-w-md">
          <div class="card card--elevated cursor-pointer hover-border case-card" data-case="case-1">
            <div class="badge badge--red mb-2">PRIORITY: HIGH</div>
            <h3 class="m-0">The Midnight Caller</h3>
            <p class="text-xs text-muted mt-2">Locked-room mystery at a radio station.</p>
          </div>
          
          <div class="card card--elevated cursor-pointer hover-border case-card" data-case="case-2">
            <div class="badge badge--blue mb-2">STAGED BURGLARY</div>
            <h3 class="m-0">The Art Heist</h3>
            <p class="text-xs text-muted mt-2">Gallery owner found dead amidst missing masterpieces.</p>
          </div>
          
          <div class="card card--elevated cursor-pointer hover-border case-card" data-case="case-3">
            <div class="badge badge--gold mb-2">MISSING PERSON</div>
            <h3 class="m-0">Suburban Silence</h3>
            <p class="text-xs text-muted mt-2">A missing neighbor and a fresh grave in the backyard.</p>
          </div>
        </div>

        <div class="mt-12 text-center">
          <button class="btn btn--secondary btn--sm" id="restore-purchase">Restore Purchases</button>
        </div>
      </div>
    `

    document.querySelectorAll('.case-card').forEach(card => {
      card.onclick = async () => {
        const caseId = card.dataset.case
        await this.startCase(caseId)
      }
    })

    const restoreBtn = document.getElementById('restore-purchase');
    if (restoreBtn) {
        restoreBtn.onclick = () => {
          this.showModal('Restore Purchases', 'Searching database for previous subscriptions... No active subscriptions found for this device.')
        }
    }
  }

  async startCase(caseId) {
    this.currentCaseId = caseId
    this.discoveredClues = []
    this.discoveredSuspects = []
    
    this.app.innerHTML = `
      <div class="splash-overlay">
        <p class="splash-overlay__subtitle">Loading case file ${caseId}...</p>
      </div>
    `

    await this.loadCase(caseId)
    this.renderGame()
    this.setupIntersectionObserver()
    window.scrollTo(0,0)
  }

  async loadCase(caseId) {
    const filenames = {
      'case-1': 'case-1-midnight-caller.json',
      'case-2': 'case-2-art-heist.json',
      'case-3': 'case-3-suburban-silence.json'
    }
    
    try {
      const response = await fetch(`/${filenames[caseId]}`)
      this.caseData = await response.json()
    } catch (e) {
      console.error("Failed to load case data", e)
    }
  }

  renderGame() {
    this.app.innerHTML = `
      <header class="flex items-center justify-between p-4 sticky top-0 bg-primary z-sticky border-bottom">
        <button class="btn btn--ghost p-2" id="back-to-menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-xs m-0 tracking-wider">FILE: ${this.caseData.id.toUpperCase()}</h2>
        <button class="btn btn--secondary btn--sm" id="dossier-toggle">Case Dossier</button>
      </header>
      
      <main id="game-container" class="scroll-narrative">
        <div class="hero-section mb-12 animate-in">
          <img src="/assets/hero-crime-scene.png" class="w-full rounded-lg shadow-lg" alt="Crime Scene">
          <div class="p-6 text-center">
            <h1 class="text-3xl text-serif mt-4 uppercase tracking-tight">${this.caseData.title}</h1>
            <p class="text-muted italic mt-2">${this.caseData.description}</p>
          </div>
        </div>

        ${this.caseData.scenes.map((scene, index) => this.renderScene(scene, index)).join('')}
        
        <div class="pb-32"></div>
      </main>

      <!-- UI Overlays -->
      <div id="dossier-overlay" class="overlay flex-col p-4">
        <div class="w-full max-w-xl mx-auto py-8 h-full">
          <div class="card card--elevated flex flex-col h-full">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl m-0">Case Dossier</h2>
              <button class="btn btn--ghost" id="close-dossier">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div class="overflow-y-auto flex-1 pr-2">
                <div class="mb-8">
                  <h3 class="text-xs label">Evidence Log</h3>
                  <div id="clue-list" class="flex flex-col gap-4 mt-4">
                    <p class="text-tertiary">No evidence collected yet. Keep scrolling.</p>
                  </div>
                </div>

                <div>
                  <h3 class="text-sm label">Suspects</h3>
                  <div id="suspect-list" class="grid grid-cols-1 gap-4 mt-4">
                    <p class="text-tertiary">No suspects identified yet.</p>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div id="solve-overlay" class="overlay flex-col items-center justify-center p-4">
        <div class="card card--elevated w-full max-w-md overflow-hidden relative">
          <h2 class="text-2xl mb-2">Final Accusation</h2>
          <p class="text-muted mb-6">Justice depends on your decision. Who is the killer?</p>
          
          <div id="suspect-choice-list" class="flex flex-col gap-4 my-4 overflow-y-auto" style="max-height: 50vh;">
            <!-- Rendered via JS -->
          </div>
          
          <div class="flex gap-4 mt-6">
            <button class="btn btn--secondary flex-1" id="cancel-solve">Wait</button>
            <button class="btn btn--primary flex-1" id="confirm-solve" disabled>Accuse</button>
          </div>
        </div>
      </div>

      <!-- General Purpose Modal -->
      <div id="modal-overlay" class="overlay flex-col items-center justify-center p-4">
        <div class="card card--elevated w-full max-w-sm text-center">
          <h2 id="modal-title" class="text-xl mb-4"></h2>
          <p id="modal-body" class="text-muted mb-8 leading-relaxed"></p>
          <button class="btn btn--primary w-full" id="modal-close">Dismiss</button>
        </div>
      </div>

      <!-- Suspect Detail Modal -->
       <div id="suspect-detail-overlay" class="overlay flex-col items-center justify-center p-4">
        <div class="card card--elevated w-full max-w-md overflow-hidden p-0 flex flex-col">
          <div id="suspect-detail-content" class="overflow-y-auto flex-1"></div>
          <div class="p-4 bg-secondary border-top">
            <button class="btn btn--secondary w-full" id="close-suspect-detail">Back to Dossier</button>
          </div>
        </div>
      </div>

      <footer class="p-12 text-center bg-secondary">
        <div class="card card--accent inline-block p-6 mb-8 max-w-sm">
          <h4 class="mb-2">Go Ad-Free</h4>
          <p class="text-sm mb-4">Support the investigation and get unlimited access to all cold cases.</p>
          <button class="btn btn--gold w-full" id="subscribe-btn">Subscribe ($3.99/mo)</button>
        </div>
        <p class="text-xs text-tertiary">Cold Case Scroll &copy; 2026. Data encrypted.</p>
      </footer>
    `

    this.setupEventListeners()
  }

  renderScene(scene, index) {
    let content = ''

    switch (scene.type) {
      case 'narrative':
        content = `<div class="scene-text">${this.formatText(scene.text)}</div>`
        break
      case 'clue':
        content = `
          <div class="evidence-block animate-in">
            <div class="badge badge--gold mb-3">NEW EVIDENCE FOUND</div>
            <h3 class="text-xl mb-2 text-serif">${scene.clue_name}</h3>
            <p class="text-muted leading-relaxed">${scene.text}</p>
          </div>
        `
        break
      case 'suspect_intro':
        content = `
          <div class="my-8">
            <div class="scene-text mb-6">${this.formatText(scene.text)}</div>
            <div class="flex flex-col gap-2 p-4 bg-blue-dim rounded border-blue">
               <div class="badge badge--blue">PERSONS OF INTEREST IDENTIFIED</div>
               <p class="text-xs text-muted m-0">Profiles added to your Dossier.</p>
            </div>
          </div>
        `
        break
      case 'solve':
        content = `
          <div class="my-24 text-center p-12 bg-elevated rounded-lg border-accent card--accent animate-in">
            <h3 class="text-3xl text-serif mb-4">Close the File?</h3>
            <p class="text-lg mb-8">${scene.text}</p>
            <button class="btn btn--primary btn--lg w-full solve-trigger">SIGN FINAL ACCUSATION</button>
          </div>
        `
        break
      case 'reveal':
        content = `
          <div class="reveal-section hidden pt-12 border-top" id="reveal-content">
            <div class="badge badge--red mb-4">CASE CLOSED — VERDICT REACHED</div>
            <h2 class="text-3xl text-serif color-correct mb-6">${scene.text}</h2>
            <div class="scene-text mb-8 text-lg">${this.formatText(scene.explanation)}</div>
            
            <div class="ad-placeholder mt-12 bg-secondary rounded-lg p-8 border-dashed">
               <p class="text-xs label mb-2">SPONSORED</p>
               <h4 class="mb-4">Enjoyed this case?</h4>
               <p class="text-sm mb-6 text-muted">Purchase the "Clue Pass" to get hints for your next investigation.</p>
               <button class="btn btn--gold w-full buy-clue-pass">Get Clue Pass ($0.99)</button>
            </div>

            <div class="mt-12 text-center">
               <button class="btn btn--secondary return-to-menu-reveal">Return to Main Menu</button>
            </div>
          </div>
        `
        break
    }

    return `<section class="scene-container px-6" id="scene-${index}" data-index="${index}" data-type="${scene.type}">${content}</section>`
  }

  formatText(text) {
    if (!text) return ''
    return text.split('\n\n').map(p => `<p class="mb-4">${p.replace(/\n/g, '<br>')}</p>`).join('')
  }

  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '0px 0px -20% 0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          
          const index = parseInt(entry.target.dataset.index)
          const scene = this.caseData.scenes[index]

          if (scene.type === 'clue') {
            this.addClueToDossier(scene.clue_name, scene.clue_detail)
          } else if (scene.type === 'suspect_intro') {
            this.addSuspectsToDossier(scene.suspects)
          }

          // Inject Ad Placeholders every 4 narrative scenes
          if (scene.type === 'narrative' && index > 0 && index % 4 === 0) {
             this.injectAd(entry.target)
          }
        }
      })
    }, options)

    document.querySelectorAll('.scene-container').forEach(section => {
      observer.observe(section)
    })
  }

  injectAd(container) {
    if (container.querySelector('.ad-placeholder')) return
    const ad = document.createElement('div')
    ad.className = 'ad-placeholder my-12 animate-in p-6 card--elevated text-center border-dashed'
    ad.innerHTML = `
      <p class="text-xs label mb-2">ADVERTISEMENT</p>
      <p class="mb-4">Detective, are you stuck? Get the <strong>MASTER INVESTIGATOR</strong> bundle.</p>
      <button class="btn btn--secondary btn--sm buy-hints-btn">Buy Hints ($0.99)</button>
    `
    container.appendChild(ad)
    
    ad.querySelector('.buy-hints-btn').onclick = () => {
        this.showModal('Purchase', 'Master Investigator bundle added! ($0.99 charged to your card).')
    }
  }

  addClueToDossier(name, detail) {
    if (this.discoveredClues.find(c => c.name === name)) return
    this.discoveredClues.push({ name, detail })
    this.updateDossierUI()
  }

  addSuspectsToDossier(suspectIds) {
    const solveScene = this.caseData.scenes.find(s => s.type === 'solve')
    suspectIds.forEach(id => {
      if (!this.discoveredSuspects.find(s => s.id === id)) {
        const fullData = solveScene.suspects.find(s => s.id === id)
        if (fullData) {
          this.discoveredSuspects.push(fullData)
        }
      }
    })
    this.updateDossierUI()
  }

  updateDossierUI() {
    const clueList = document.querySelector('#clue-list')
    const suspectList = document.querySelector('#suspect-list')
    
    if (clueList) {
      if (this.discoveredClues.length > 0) {
        clueList.innerHTML = this.discoveredClues.map(clue => `
          <div class="clue-snippet animate-in">
            <strong class="text-gold">${clue.name}</strong>: ${clue.detail}
          </div>
        `).join('')
      }
    }

    if (suspectList) {
      if (this.discoveredSuspects.length > 0) {
        suspectList.innerHTML = this.discoveredSuspects.map(suspect => `
          <div class="card card--elevated flex gap-4 p-4 animate-in cursor-pointer hover-border suspect-row" data-id="${suspect.id}">
            <img src="${this.suspectImages[suspect.id] || '/assets/suspect-3-colleague.png'}" 
                 class="w-16 h-16 object-cover rounded-md" alt="${suspect.name}">
            <div class="flex-1">
              <h4 class="m-0 text-base">${suspect.name}</h4>
              <p class="text-xs text-muted mt-1 italic">Tap for details...</p>
            </div>
          </div>
        `).join('')

        document.querySelectorAll('.suspect-row').forEach(row => {
          row.onclick = () => {
            this.showSuspectDetail(row.dataset.id)
          }
        })
      }
    }
  }

  showSuspectDetail(id) {
    const suspect = this.discoveredSuspects.find(s => s.id === id)
    if (!suspect) return

    const content = document.querySelector('#suspect-detail-content')
    content.innerHTML = `
      <img src="${this.suspectImages[suspect.id] || '/assets/suspect-3-colleague.png'}" class="w-full h-64 object-cover" alt="${suspect.name}">
      <div class="p-6">
        <h2 class="text-2xl text-serif mb-1">${suspect.name}</h2>
        <p class="text-xs label text-red mb-6">Subject Profile</p>
        
        <div class="mb-6">
          <h4 class="text-xs label mb-2">MOTIVE</h4>
          <p class="text-sm leading-relaxed">${suspect.motive}</p>
        </div>

        <div class="mb-6">
          <h4 class="text-xs label mb-2">ALIBI</h4>
          <p class="text-sm leading-relaxed">${suspect.alibi}</p>
        </div>

        <div>
          <h4 class="text-xs label mb-2">SUSPICIOUS DETAIL</h4>
          <p class="text-sm italic color-warning leading-relaxed">${suspect.suspicious_detail}</p>
        </div>
      </div>
    `

    document.querySelector('#suspect-detail-overlay').classList.add('active')
  }

  showModal(title, body) {
    document.querySelector('#modal-title').textContent = title
    document.querySelector('#modal-body').textContent = body
    document.querySelector('#modal-overlay').classList.add('active')
  }

  setupEventListeners() {
    // Nav
    const backBtn = document.querySelector('#back-to-menu')
    if (backBtn) backBtn.onclick = () => this.renderMenu()

    // Dossier
    document.querySelector('#dossier-toggle').onclick = () => {
      document.querySelector('#dossier-overlay').classList.add('active')
      document.body.style.overflow = 'hidden'
    }

    document.querySelector('#close-dossier').onclick = () => {
      document.querySelector('#dossier-overlay').classList.remove('active')
      document.body.style.overflow = ''
    }

    // Solve
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('solve-trigger')) {
        this.openSolveOverlay()
      }
    })

    document.querySelector('#cancel-solve').onclick = () => {
      document.querySelector('#solve-overlay').classList.remove('active')
      document.body.style.overflow = ''
    }

    document.querySelector('#confirm-solve').onclick = () => {
      this.handleAccusation()
    }

    // Purchase
    document.querySelector('#subscribe-btn').onclick = () => {
      this.showModal('Subscription', 'Redirecting to secure payment gateway... (Mock: Subscription for $3.99/mo successful!)')
    }

    // Reveal return & Clue pass
    document.addEventListener('click', (e) => {
       if (e.target.classList.contains('return-to-menu-reveal')) {
          this.renderMenu()
       }
       if (e.target.classList.contains('buy-clue-pass')) {
          this.showModal('Purchase', 'Clue Pass added to your account! ($0.99 charged to your card on file).')
       }
    })

    // Modals
    document.querySelector('#modal-close').onclick = () => {
      document.querySelector('#modal-overlay').classList.remove('active')
    }

    document.querySelector('#close-suspect-detail').onclick = () => {
      document.querySelector('#suspect-detail-overlay').classList.remove('active')
    }
  }

  openSolveOverlay() {
    const overlay = document.querySelector('#solve-overlay')
    const list = document.querySelector('#suspect-choice-list')
    const solveScene = this.caseData.scenes.find(s => s.type === 'solve')
    
    list.innerHTML = solveScene.suspects.map(suspect => `
      <div class="card suspect-option cursor-pointer transition-all hover-border" data-id="${suspect.id}">
        <div class="flex gap-4 items-center">
          <img src="${this.suspectImages[suspect.id] || '/assets/suspect-3-colleague.png'}" 
               class="w-16 h-16 object-cover rounded-md shadow-sm">
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <h4 class="m-0">${suspect.name}</h4>
              <div class="radio-placeholder"></div>
            </div>
            <p class="text-xs mt-1 text-muted line-clamp-1">${suspect.motive.substring(0, 50)}...</p>
          </div>
        </div>
      </div>
    `).join('')

    document.querySelectorAll('.suspect-option').forEach(card => {
      card.onclick = () => {
        document.querySelector('#confirm-solve').disabled = false
        document.querySelectorAll('.suspect-option').forEach(c => c.classList.remove('card--accent'))
        card.classList.add('card--accent')
      }
    })

    overlay.classList.add('active')
    document.body.style.overflow = 'hidden'
  }

  handleAccusation() {
    const selectedElement = document.querySelector('.suspect-option.card--accent')
    const selected = selectedElement ? selectedElement.dataset.id : null
    const solveScene = this.caseData.scenes.find(s => s.type === 'solve')
    
    if (selected === solveScene.correct_suspect_id) {
      document.querySelector('#solve-overlay').classList.remove('active')
      document.body.style.overflow = ''
      
      this.showModal('VERDICT REACHED', 'CORRECT! Your investigative work has led to the apprehension of the killer. Signing final report...')
      
      setTimeout(() => {
        const revealEl = document.querySelector('#reveal-content');
        if (revealEl) {
            revealEl.classList.remove('hidden')
            revealEl.scrollIntoView({ behavior: 'smooth' })
        }
      }, 1000)
    } else {
      this.showModal('INSUFFICIENT EVIDENCE', "The evidence doesn't support this accusation. The suspect has a solid alibi or no motive. Try again.")
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameEngine()
})
