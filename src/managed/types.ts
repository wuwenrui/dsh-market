/** Browser-safe managed market records. */
export type ManagedSource = 'owned' | 'community'

/** Exact prebuilt archive published by this product and verified by digest. */
export interface ManagedArtifact {
  url: string
  sha256: string
  size: number
}

/** How an approved community release is obtained. */
export interface ManagedInstall {
  kind: 'npm' | 'tarball'
  target: string
  sha256?: string
  size?: number
}

export interface ManagedRelease {
  id: string
  packageName: string
  name: string
  description: string
  category: string
  version: string
  hostVersions: string[]
  /** Whether this product publishes the artifact or opened an upstream package. */
  source: ManagedSource
  /** Present for owned releases only. */
  artifact?: ManagedArtifact
  /** Present for community releases only. */
  install?: ManagedInstall
}

/** One signed catalog is the single distribution point for both tiers. */
export interface ManagedCatalog {
  schemaVersion: 1
  revision: number
  issuedAt: string
  expiresAt: string
  /** Owned releases followed by the community releases this product opened. */
  plugins: ManagedRelease[]
}
export interface CatalogTrust {
  catalogUrl: string
  publicKey: string
  artifactOrigin: string
  hostVersion: string
}
