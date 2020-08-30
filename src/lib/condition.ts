// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedFnCall,
         PreparedCondition }  from '../types';
import { isEqualComplexName } from './util';



export function filterZeroLengthCondFn(cond: PreparedCondition): boolean {
    switch (cond.op) {
    case 'true':
        return false;
    case 'not': case 'and': case 'or':
        if (cond.operands.length === 0) {
            return false;
        }
    }

    return true;
}


function filterCondOperands(name: string[], cond: PreparedCondition) {
    cond.operands = cond.operands
    .map(x => {
        switch (typeof x) {
        case 'object':
            if (Array.isArray(x)) {
                return x;
            } else {
                if (x === null) {
                    // NOTE: never reach here.
                    return x;
                }
                switch (x.type) {
                case 'condition':
                    return pruneCondition(name, x);
                default:
                    return x;
                }
            }
        default:
            return x;
        }
    })
    .filter(x => {
        switch (typeof x) {
        case 'object':
            if (x !== null && !Array.isArray(x) && x.type === 'condition') {
                return filterZeroLengthCondFn(x);
            }
        }
        return true;
    });

    return cond;
}


function pruneConditionCheckFncall(name: string[], x: PreparedFnCall): PreparedCondition | null {
    for (const arg of x.args) {
        switch (typeof arg) {
        case 'object':
            if (arg === null) {
                // NOTE: Nothing to do.
            } else {
                switch (arg.type) {
                case 'field':
                    // TODO: Check all arguments' resolver are equal
                    if (! isEqualComplexName(name, arg.name.slice(0, arg.name.length - 1))) {
                        return ({
                            type: 'condition',
                            op: 'true',
                            operands: [],
                        });
                    } else {
                        arg.name = arg.name.slice(arg.name.length - 1);
                    }
                    break;
                case 'fncall':
                    {
                        const tmp = pruneConditionCheckFncall(name, arg);
                        if (tmp) {
                            return tmp;
                        }
                    }
                    break;
                }
            }
            break;
        }
    }
    return null;
}


export function pruneCondition(name: string[], cond: PreparedCondition): PreparedCondition {
    if (cond.operands.length) {
        const x = cond.operands[0];

        switch (typeof x) {
        case 'object':
            if (x === null) {
                // NOTE: never reach here.
                // NOTE: Nothing to do.
            } else if (Array.isArray(x)) {
                // NOTE: Nothing to do. It is data.
            } else {
                switch (x.type) {
                case 'field':
                    if (! isEqualComplexName(name, x.name.slice(0, x.name.length - 1))) {
                        return ({
                            type: 'condition',
                            op: 'true',
                            operands: [],
                        });
                    } else {
                        x.name = x.name.slice(x.name.length - 1);
                    }
                    break;
                case 'fncall':
                    {
                        const tmp = pruneConditionCheckFncall(name, x);
                        if (tmp) {
                            return tmp;
                        }
                    }
                }
            }
            break;
        }
    }

    return filterCondOperands(name, cond);
}


export function flatConditions(
        dest: PreparedCondition[],
        parentOp: 'and' | 'or' | 'not',
        cond: PreparedCondition): void {

    const recurse = (op: typeof parentOp, x: PreparedCondition) => {
        const c: PreparedCondition[] = [];
        flatConditions(c, op, x);
        x.operands = c;
        if ((op === 'and' || op === 'or') && c.length === 1) {
            dest.push(c[0]);
        } else {
            dest.push(x);
        }
    };

    const pushOperands = () => {
        for (const x of cond.operands) {
            switch (typeof x) {
            case 'object':
                if (x === null || Array.isArray(x)) {
                    throw new Error(`Unexpected AST is found.`);
                } else {
                    switch (x.type) {
                    case 'condition':
                        switch (x.op) {
                        case 'and': case 'or': case 'not':
                            if (x.op !== 'not' && x.op === parentOp) {
                                flatConditions(dest, x.op, x);
                            } else {
                                recurse(x.op, x);
                            }
                            break;
                        default:
                            dest.push(x);
                            break;
                        }
                        break;
                    default:
                        throw new Error(`Unexpected AST ${x.type} is found.`);
                    }
                }
                break;
            default:
                throw new Error(`Unexpected AST is found.`);
            }
        }
    };

    switch (cond.op) {
    case 'and': case 'or': case 'not':
        if (cond.op === parentOp) {
            pushOperands();
        } else {
            recurse(cond.op, cond);
        }
        break;
    default:
        dest.push(cond);
        break;
    }
}


function filterIndexFieldCondOperands(cond: PreparedCondition, indexFieldNameI: string) {
    cond.operands = cond.operands
    .map(x => {
        switch (typeof x) {
        case 'object':
            if (Array.isArray(x)) {
                return x;
            } else {
                if (x === null) {
                    // NOTE: never reach here.
                    return x;
                }
                switch (x.type) {
                case 'condition':
                    return pruneNonIndexFieldConditions(x, indexFieldNameI);
                default:
                    return x;
                }
            }
        default:
            return x;
        }
    })
    .filter(x => {
        switch (typeof x) {
        case 'object':
            if (x !== null && !Array.isArray(x) && x.type === 'condition') {
                return filterZeroLengthCondFn(x);
            }
        }
        return true;
    });

    return cond;
}


export function pruneNonIndexFieldConditions(cond: PreparedCondition, indexFieldNameI: string): PreparedCondition {
    if (cond.operands.length) {
        const x = cond.operands[0];

        switch (typeof x) {
        case 'object':
            if (x === null || Array.isArray(x)) {
                return ({
                    type: 'condition',
                    op: 'true',
                    operands: [],
                });
            } else {
                switch (x.type) {
                case 'field':
                    if (x.name[x.name.length - 1].toLowerCase() !== indexFieldNameI) {
                        return ({
                            type: 'condition',
                            op: 'true',
                            operands: [],
                        });
                    }
                    break;
                case 'fncall':
                    return ({
                        type: 'condition',
                        op: 'true',
                        operands: [],
                    });
                }
            }
            break;
        default:
            return ({
                type: 'condition',
                op: 'true',
                operands: [],
            });
        }
    }

    return filterIndexFieldCondOperands(cond, indexFieldNameI);
}
