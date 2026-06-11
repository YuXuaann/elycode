import * as meta from './meta';
import * as func from './func';

/**
 * Contract that any online contest platform must implement to plug into Elycode.
 *
 * @export
 * @interface Contest
 */
export interface Contest {
    /**
     * Registers this contest implementation to Elycode. (can not be static in interface, but should be implemented as static in every contest)
     * You should construct a dummy instance of this instance and call the register function below.
     * 
     * @type {void}
     * @memberof Contest
     */
    // static { ... }

    /**
     * Create a new contest instance by the given URL path.
     *
     * @param {string} pathname
     * @return {*}  {Promise<Contest>}
     * @memberof Contest
     */
    create(pathname: string): Promise<Contest>;

    /**
     * Return this contest's metadata.
     *
     * @type {meta.Meta}
     * @memberof Contest
     */
    meta: meta.Meta;

    /**
     * Return this contest's questions.
     *
     * @type {meta.Question[]}
     * @memberof Contest
     */
    questions: meta.Question[];
}

export const availableFactories = new Map<ReadonlySet<string>, (path: string) => Promise<Contest | undefined>>();
export const availableContests = new Map<meta.Platform, (data: unknown) => Contest | undefined>();

export function register(hosts: ReadonlySet<string>, contest: Contest, transfer: (data: unknown) => Contest | undefined): void {
    availableFactories.set(hosts, contest.create);
    availableContests.set(contest.meta.platform, transfer);
}

export const loadFromLocal = func.loadFromLocal;
export const loadFromURL = func.loadFromURL;
export const saveToLocal = func.saveToLocal;
export type Question = meta.Question;