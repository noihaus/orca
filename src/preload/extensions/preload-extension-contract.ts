export type PreloadExtension<K extends string = string, A = unknown> = { key: K; api: A }

// Maps an installed list to its `window.api` additions; an empty list adds nothing.
export type PreloadExtensionApis<L extends readonly PreloadExtension[]> = {
  [E in L[number] as E['key']]: E['api']
}
