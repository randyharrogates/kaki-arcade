// @kaki/netcode: placeholder until its first issue lands. Nothing is exported yet.
//
// The transport carries the messages defined in @kaki/protocol (docs/ARCHITECTURE.md §2). This
// type-only import keeps that one real cross-package reference in the tree, so every clean
// `pnpm verify` proves that a package can depend on another without a build step first.
import type {} from '@kaki/protocol';

export {};
