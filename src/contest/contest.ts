import * as meta from './meta';
import * as func from './func';

/**
 * @fileoverview Core contract for contest integrations.
 * Elycode is designed for horizontal extensibility. To plug in a new contest platform:
 * 1. Implement the `Contest` interface and provide a static entry point (for example a static block)
 *    that calls `register` with:
 *    - the set of URL hosts supported by your platform
 *    - the platform metadata (`meta.Meta`)
 *    - a transfer function (`(data: unknown) => Contest | undefined`) that restores serialized state
 * 2. Import your implementation in this file so the module executes and registration side-effects run.
 *
 * Example:
 * ```ts
 * import './codeforces';
 * import './atcoder';
 * ```
 */

/**
 * Contract every contest integration must satisfy.
 *
 * Implementers should supply a static registration hook that constructs a lightweight placeholder
 * instance and calls {@link register} so Elycode knows which hosts map to the platform and how to
 * revive serialized state.
 */
export interface Contest {
    /**
     * Create a fully populated contest instance for the given URL path.
     */
    // static { ... }

    /**
     * Instantiate contest metadata and questions from a remote source.
     */
    create(pathname: string): Promise<Contest>;

    /**
     * Metadata describing the contest (identifier, name, schedule, etc.).
     */
    meta: meta.Meta;

    /**
     * Collection of questions belonging to the contest.
     */
    questions: meta.Question[];
}

export const availableFactories = new Map<ReadonlySet<string>, (path: string) => Promise<Contest | undefined>>();
export const availableContests = new Map<meta.Platform, (data: unknown) => Contest | undefined>();


/**
 * Registers a contest implementation so Elycode can look it up by host and revive persisted data.
 *
 * @param hosts Hosts that uniquely identify the platform.
 * @param contest A lightweight instance that exposes the `create` factory.
 * @param transfer A function that converts serialized payloads back into `Contest` instances.
 */
export function register(hosts: ReadonlySet<string>, contest: Contest, transfer: (data: unknown) => Contest | undefined): void {
    console.log(`Registering contest for hosts: ${[...hosts].join(', ')}`);
    availableFactories.set(hosts, contest.create);
    availableContests.set(contest.meta.platform, transfer);
}

export const loadFromLocal = func.loadFromLocal;
export const loadFromURL = func.loadFromURL;
export const saveToLocal = func.saveToLocal;
export type Question = meta.Question;

// Register built-in contest implementations.
import './codeforces';