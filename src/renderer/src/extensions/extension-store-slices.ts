import type { StateCreator } from 'zustand'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type { ExtensionStoreState, RendererExtension } from './renderer-extension-contract'

type SliceArgs = Parameters<StateCreator<ExtensionStoreState, [], [], object>>

type SliceOf<E> = E extends { createSlice: (...args: never[]) => infer S } ? S : never

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
  i: infer I
) => void
  ? I
  : never

// Intersection of every installed slice; an empty list (or one without slices) adds nothing.
export type RendererExtensionSlices<L extends readonly RendererExtension[]> = [
  SliceOf<L[number]>
] extends [never]
  ? object
  : UnionToIntersection<SliceOf<L[number]>>

type InstalledExtensionSlices = RendererExtensionSlices<typeof INSTALLED_RENDERER_EXTENSIONS>

// Collapses to never on a key collision with core state, so `pnpm tc` fails.
export type ExtensionSlicesDisjointFrom<Core> = [
  Extract<keyof InstalledExtensionSlices, keyof Core>
] extends [never]
  ? InstalledExtensionSlices
  : never

export function rendererExtensionSlices<const L extends readonly RendererExtension[]>(
  extensions: L,
  ...args: SliceArgs
): RendererExtensionSlices<L> {
  const state: Record<string, unknown> = {}
  const owners = new Map<string, string>()
  for (const extension of extensions) {
    if (!extension.createSlice) {
      continue
    }
    for (const [key, value] of Object.entries(extension.createSlice(...args))) {
      const owner = owners.get(key)
      if (owner !== undefined) {
        throw new Error(
          `Renderer extension "${extension.id}" slice key "${key}" is already owned by "${owner}"`
        )
      }
      owners.set(key, extension.id)
      state[key] = value
    }
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: state holds exactly the merged keys of every extension slice, which is what RendererExtensionSlices<L> intersects.
  return state as RendererExtensionSlices<L>
}

export function createExtensionSlices(...args: SliceArgs): InstalledExtensionSlices {
  return rendererExtensionSlices(INSTALLED_RENDERER_EXTENSIONS, ...args)
}
