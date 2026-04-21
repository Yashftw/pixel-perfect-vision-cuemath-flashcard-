const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL = 36500;

export type Rating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy
export type CardStateType = 'new' | 'learning' | 'review' | 'relearning';

export interface CardState {
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    state: CardStateType;
    due_date: Date;
    last_review: Date | null;
}

export interface ReviewResult {
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    state: CardStateType;
    due_date: Date;
    last_review: Date;
    interval_days: number;
}

function forgettingCurve(elapsed: number, stability: number): number {
    return Math.pow(1 + elapsed / (9 * stability), -1);
}

function initStability(rating: Rating): number {
    return Math.max(W[rating - 1], 0.1);
}

function initDifficulty(rating: Rating): number {
    return Math.min(Math.max(W[4] - W[5] * (rating - 3), 1), 10);
}

function nextDifficulty(d: number, rating: Rating): number {
    return Math.min(Math.max(d - W[6] * (rating - 3), 1), 10);
}

function nextRecallStability(d: number, s: number, r: number, rating: Rating): number {
    const hardPenalty = rating === 2 ? W[15] : 1;
    const easyBonus = rating === 4 ? W[16] : 1;
    return s * (
        Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp((1 - r) * W[10]) - 1) *
        hardPenalty *
        easyBonus
    );
}

function nextForgetStability(d: number, s: number, r: number): number {
    return (
        W[11] *
        Math.pow(d, -W[12]) *
        (Math.pow(s + 1, W[13]) - 1) *
        Math.exp((1 - r) * W[14])
    );
}

function intervalFromStability(stability: number): number {
    const interval = stability * Math.log(REQUEST_RETENTION) / Math.log(0.9);
    return Math.min(Math.max(Math.round(interval), 1), MAX_INTERVAL);
}

export function reviewCard(card: CardState, rating: Rating): ReviewResult {
    const now = new Date();
    let { stability, difficulty, reps, lapses, state } = card;
    let interval = 1;

    if (state === 'new') {
        stability = initStability(rating);
        difficulty = initDifficulty(rating);
        reps = 1;
        if (rating === 1) {
            state = 'learning';
            interval = 0;
        } else if (rating === 2) {
            state = 'learning';
            interval = 1;
        } else {
            state = 'review';
            interval = intervalFromStability(stability);
        }

    } else if (state === 'learning' || state === 'relearning') {
        if (rating === 1) {
            interval = 0;
        } else if (rating === 2) {
            interval = 1;
        } else {
            stability = initStability(rating);
            state = 'review';
            interval = intervalFromStability(stability);
            reps += 1;
        }

    } else if (state === 'review') {
        const elapsed = card.last_review
            ? (now.getTime() - card.last_review.getTime()) / (1000 * 60 * 60 * 24)
            : 1;
        const retrievability = forgettingCurve(elapsed, stability);
        difficulty = nextDifficulty(difficulty, rating);

        if (rating === 1) {
            stability = nextForgetStability(difficulty, stability, retrievability);
            state = 'relearning';
            lapses += 1;
            interval = 0;
        } else {
            stability = nextRecallStability(difficulty, stability, retrievability, rating);
            interval = intervalFromStability(stability);
            reps += 1;
        }
    }

    const due = new Date(now);
    if (interval === 0) {
        due.setMinutes(due.getMinutes() + 10);
    } else {
        due.setDate(due.getDate() + interval);
    }

    return {
        stability: Math.max(stability, 0.1),
        difficulty: Math.min(Math.max(difficulty, 1), 10),
        reps,
        lapses,
        state,
        due_date: due,
        last_review: now,
        interval_days: interval,
    };
}