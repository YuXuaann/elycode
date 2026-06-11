import * as contest from '../contest/contest';
import * as serializer from './serializer';
import * as func from './func';

export class Notebook {
    private questions: Map<string, contest.Question>;

    constructor(
        questions: contest.Question[],
    ) {
        this.questions = new Map(questions.map((q) => [q.id, q]));
    }

    generate(questionId: string): serializer.RawNotebook {
        const question = this.questions.get(questionId);
        const cells = question?.samples.map((sample, i) => func.generateCellsBySample(i + 1, sample)).flat() ?? [];
        return { '#sym': 'RawNotebook', cells };
    }
}