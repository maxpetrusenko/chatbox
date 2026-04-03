(() => {
  const root = document.querySelector('[data-runtime-dashboard]')
  if (!root) return

  const setText = (selector, value, fallback = 'unknown') => {
    const node = root.querySelector(selector)
    if (!node) return
    node.textContent = value || fallback
  }

  const setList = (selector, items, emptyText) => {
    const list = root.querySelector(selector)
    if (!list) return

    list.innerHTML = ''
    const resolvedItems = items.length ? items : [emptyText]

    resolvedItems.forEach((item) => {
      const li = document.createElement('li')
      li.textContent = item
      list.appendChild(li)
    })
  }

  const parseKeyedBullets = (text) => {
    const entries = new Map()

    text
      .split('\n')
      .map((line) => line.trim())
      .forEach((line) => {
        const match = line.match(/^- ([^:]+):\s*(.*)$/)
        if (!match) return
        entries.set(match[1].trim().toLowerCase(), match[2].trim())
      })

    return entries
  }

  const parseLogBullets = (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())

  const formatRefList = (refs) => {
    if (!refs.length) return 'none'
    if (refs.length === 1) return refs[0]
    return `${refs.length} refs`
  }

  const hydrate = async () => {
    try {
      const [stateResponse, proofResponse, driftResponse, logResponse] = await Promise.all([
        fetch('./state.json'),
        fetch('./proof.md'),
        fetch('./drift.md'),
        fetch('./log.md'),
      ])

      if (!stateResponse.ok || !proofResponse.ok || !driftResponse.ok || !logResponse.ok) {
        throw new Error('runtime files unavailable')
      }

      const [state, proofText, driftText, logText] = await Promise.all([
        stateResponse.json(),
        proofResponse.text(),
        driftResponse.text(),
        logResponse.text(),
      ])

      const proofEntries = parseKeyedBullets(proofText)
      const driftEntries = parseKeyedBullets(driftText)

      setText('[data-runtime-active-stage]', state.active_stage)
      setText('[data-runtime-coordination-status]', state.heartbeats?.coordination?.status)
      setText('[data-runtime-proof-status]', state.proof_status)
      setText('[data-runtime-drift-status]', state.drift_status)
      const blockedStatus = state.blocked?.status
        || (state.heartbeats?.coordination?.blocked ? 'blocked' : state.drift_status || 'clear')
      const blockedReasons = state.blocked?.reasons || state.heartbeats?.drift?.flags || []

      setText('[data-runtime-blocked-status]', blockedStatus, 'unknown')
      setText('[data-runtime-next-move]', state.heartbeats?.coordination?.next_move, 'No next move recorded.')
      setText('[data-runtime-intent]', state.active_intent)
      setText(
        '[data-runtime-coordination-updated]',
        state.heartbeats?.coordination?.last_updated_at,
        'No coordination heartbeat yet.',
      )
      setText('[data-runtime-drift-updated]', state.heartbeats?.drift?.last_updated_at, 'No drift heartbeat yet.')
      setText('[data-runtime-reply-lock]', state.reply_lock?.held ? `held by ${state.reply_lock.owner}` : 'not held')
      setText('[data-runtime-locked-packet]', state.locked_packet_id, 'none')
      setText('[data-runtime-proposal-owner]', state.proposal_token_owner)
      setText('[data-runtime-challenge-owner]', state.challenge_token_owner)
      setText(
        '[data-runtime-blocked-reasons]',
        blockedReasons.length > 0 ? blockedReasons.join('; ') : 'none',
        'none',
      )
      setText('[data-runtime-claude-ref]', state.agent_handoffs?.claude?.prompt_ref, 'missing')
      setText('[data-runtime-codex-ref]', state.agent_handoffs?.codex?.prompt_ref, 'missing')
      setText(
        '[data-runtime-extra-refs]',
        formatRefList(state.agent_handoffs?.extra_refs || []),
        'none',
      )
      setText(
        '[data-runtime-open-disagreements]',
        String((state.open_disagreements || []).length),
        '0',
      )

      setList(
        '[data-runtime-proof-list]',
        [
          `Verified: ${proofEntries.get('verified') || 'none recorded yet'}`,
          `Inferred: ${proofEntries.get('inferred') || 'none recorded yet'}`,
          `Missing: ${proofEntries.get('missing') || 'none recorded yet'}`,
          `Next proof step: ${proofEntries.get('next proof step') || 'not recorded'}`,
        ],
        'No proof entries recorded.',
      )

      setList(
        '[data-runtime-drift-list]',
        [
          `Current status: ${driftEntries.get('current status') || 'unknown'}`,
          `Active mismatches: ${driftEntries.get('active mismatches') || 'none recorded yet'}`,
          `Stale downstream: ${driftEntries.get('stale downstream') || 'none recorded yet'}`,
          `Repair packet: ${driftEntries.get('repair packet') || 'not recorded'}`,
        ],
        'No drift entries recorded.',
      )

      setList('[data-runtime-log-list]', parseLogBullets(logText), 'No runtime log entries recorded.')

      const loadState = root.querySelector('[data-runtime-load-state]')
      if (loadState) {
        loadState.textContent = 'Live read from state.json, proof.md, drift.md, and log.md.'
      }
    }
    catch (error) {
      const loadState = root.querySelector('[data-runtime-load-state]')
      if (loadState) {
        loadState.textContent =
          'Live runtime read failed. Serve this page over HTTP to load the shared runtime files directly.'
      }
    }
  }

  void hydrate()
})()
