import * as contest from "./contest";

// todo: export type ContestPlatform = 'Codeforces' | 'AtCoder' | 'LeetCode' | 'HackerRank' | 'CodeChef' | undefined;
export enum Platform {
    Codeforces = 'Codeforces',
    Unknown = ''
}
type QuestionType = 'normal' | 'interactive';

export class Meta {
    createdTime = '';
    platform: Platform = Platform.Unknown;
    id = '';         // unique identifier for the contest, e.g., "cf-2231" = "Codeforces Round 1099 (Div. 2)"
    name = '';       // human-readable name of the contest
    startTime = '';
    endTime = '';
}

export class Sample {
    constructor(
        public input: string,
        public output: string,
    ) { }
}

export class Commit {
    contestId = '';
    questionId = '';
    timestamp = '';
    code = '';
    verdict = '';
    passedTestCount = 0;
    timeConsumedMillis = 0;
    memoryConsumedBytes = 0;
}

export function passed(commit: Commit): boolean {
    return commit.verdict === 'OK' ||
        commit.verdict === 'Ok' ||
        commit.verdict === 'ok' ||
        commit.verdict === 'Accept' ||
        commit.verdict === 'Accepted' ||
        commit.verdict === 'accept' ||
        commit.verdict === 'accepted' ||
        commit.verdict === 'pass' ||
        commit.verdict === 'passeed';
}

export class Statistics {
    accepted = false;
    historys: Commit[] = [];
    points?: string;
    rank?: number;
}

export function update(statistics: Statistics, commit: Commit) {
    const exists = statistics.historys.some((history) => history.timestamp === commit.timestamp);
    if (exists) {
        return;
    }

    statistics.historys.push(commit);
    if (passed(commit)) {
        statistics.accepted = true;
    }
}

export class Question {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly desription: string,
        public readonly type: QuestionType,
        public samples: Sample[],
        public statistics: Statistics,
        public readonly formatInput?: string,
        public readonly formatOutput?: string,
        public readonly hint?: string,
    ) { }
}

export class Record {
    constructor(
        public contests: contest.Contest[]
    ) { }
}