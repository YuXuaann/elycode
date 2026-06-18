import * as contest from "./contest";

// todo: export type ContestPlatform = 'Codeforces' | 'AtCoder' | 'LeetCode' | 'HackerRank' | 'CodeChef' | undefined;
export type Platform = 'Codeforces' | undefined; // for now, we only support Codeforces
type QuestionType = 'normal' | 'interactive';

export class Meta {
    createdTime: Date = new Date(0);
    platform: Platform = undefined;
    id = '';         // unique identifier for the contest, e.g., "cf-2231" = "Codeforces Round 1099 (Div. 2)"
    name = '';       // human-readable name of the contest
    startTime: Date = new Date(0);
    endTime: Date = new Date(0);
}

export class Sample {
    constructor(
        public input: string,
        public output: string,
    ) { }
}

class Commit {
    timestamp: Date = new Date(0);
    code = '';
    result = ''; //! todo, contains result & error message if any & time taken & memory used
}

export class Statics {
    accepted = false;
    historys: Commit[] = [];
    points?: string;
    rank?: number;
}

export class Question {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly desription: string,
        public readonly type: QuestionType,
        public samples: Sample[],
        public statics: Statics,
    ) { }
}

export class Record {
    constructor(
        public contests: contest.Contest[]
    ) { }
}