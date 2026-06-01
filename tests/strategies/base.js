export class Strategy {
    constructor(name) {
        this.name = name;
    }

    execute(engine, state) {
        throw new Error('Strategy.execute() must be implemented');
    }

    onGameStart(engine, state) {}

    onGameEnd(engine, state, result) {}
}

export function createStrategy(name, executeFn) {
    return {
        name,
        execute: executeFn,
        onGameStart: () => {},
        onGameEnd: () => {}
    };
}