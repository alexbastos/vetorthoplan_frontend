function CasesPreviewShadows() {
  return (
    <>
      <filter height="140%" id="cases-preview-shadow-panel" width="140%" x="-20%" y="-20%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="11.15" result="blur" />
        <feOffset dy="4" in="blur" result="offset" />
        <feFlood floodColor="#000000" floodOpacity="0.04" />
        <feComposite in2="offset" operator="in" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter height="200%" id="cases-preview-shadow-note" width="140%" x="-20%" y="-50%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="18.8" result="blur" />
        <feOffset dy="4" in="blur" result="offset" />
        <feFlood floodColor="#000000" floodOpacity="0.05" />
        <feComposite in2="offset" operator="in" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </>
  )
}

export { CasesPreviewShadows }
