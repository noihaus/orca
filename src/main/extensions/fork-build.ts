// Fork builds must not self-update to upstream releases; opt in only via env.
export const FORK_AUTO_UPDATE_ENABLED = process.env.ORCA_ENABLE_AUTO_UPDATE === '1'
