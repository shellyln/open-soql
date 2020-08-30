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
