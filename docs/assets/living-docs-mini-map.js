(() => {
  const main = document.querySelector('main.page')
  if (!main) return

  const headings = [...main.querySelectorAll('section .section-head h2')]
  if (headings.length < 2) return

  const slugify = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `section-${slugify(heading.textContent || `section-${index + 1}`)}`
    }
  })

  const nav = document.createElement('aside')
  nav.className = 'ld-mini-map card panel'
  nav.innerHTML = '<div class="ld-mini-map-head"><span class="eyebrow">Mini Map</span><h2>On this page</h2><p class="muted">Jump fast. Keep approval speed.</p></div><div class="ld-mini-map-list"></div>'

  const list = nav.querySelector('.ld-mini-map-list')

  headings.forEach((heading, index) => {
    const section = heading.closest('section')
    const eyebrow = section?.querySelector('.section-head .eyebrow')?.textContent?.trim() || `Section ${index + 1}`
    const item = document.createElement('a')
    item.href = `#${heading.id}`
    item.className = 'ld-mini-map-item'
    item.dataset.target = heading.id
    item.innerHTML = `<span class="ld-mini-map-step">${index + 1}</span><span class="ld-mini-map-copy"><small>${eyebrow}</small><strong>${heading.textContent?.trim() || ''}</strong></span>`
    list.appendChild(item)
  })

  const hero = main.querySelector('section')
  if (hero) hero.insertAdjacentElement('afterend', nav)
  else main.prepend(nav)

  document.body.classList.add('ld-map-ready')
  const mq = window.matchMedia('(min-width: 1380px)')
  const applyMode = () => document.body.classList.toggle('ld-map-float', mq.matches)
  applyMode()
  if (mq.addEventListener) mq.addEventListener('change', applyMode)
  else mq.addListener(applyMode)

  const items = [...nav.querySelectorAll('.ld-mini-map-item')]
  const byId = new Map(items.map((item) => [item.dataset.target, item]))
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const item = byId.get(entry.target.id)
        if (!item || !entry.isIntersecting) return
        items.forEach((candidate) => candidate.classList.remove('active'))
        item.classList.add('active')
      })
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: [0.2, 0.4, 0.6] },
  )

  headings.forEach((heading) => observer.observe(heading))
  if (items[0]) items[0].classList.add('active')
})()
