window.DECENT_CONFIG = {
  appName: 'Jolly Sandbox',
  subtitle: 'Practice before production',
  chain: null,
  ens: { enabled: false },
  theme: { 'bg-1': '#0d203b', 'bg-2': '#214d67', accent: '#a5e8ff', 'accent-2': '#baadff' },
  ipfsAdapter: { version: 1, label: 'Sandbox rehearsal', capabilities: {}, getStatus: async () => ({}) },
  about: {
    title: 'About Jolly Sandbox',
    summary: 'A historical Producer portal and a local-only course ledger rehearsal.',
    sections: [
      { title: 'Course rehearsal', body: 'Synthetic checkpoints are held in memory and disappear on refresh. The optional preflight is read-only and cannot submit course evidence.' },
      { title: 'Privacy and storage', body: 'Do not publish student information. IPFS backup, replication and rewards are unavailable; choosing a provider does not verify storage. UCAN authorization is not implemented.' },
      { title: 'Wallet boundaries', body: 'Connecting is optional and never grants a role. The historical Producer portal is separate from the course rehearsal; transactions require their own wallet confirmation.' }
    ]
  },
  links: [{ label: 'Source', url: 'https://github.com/TheJollyLaMa/JollySandbox' }]
};
