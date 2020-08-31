// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedFnCall,
         PreparedCondition,
         ResolverContext,
         PreparedAtomValue,
         PreparedParameterizedValue,
         SqlDialect }         from '../types';
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


function getParameterValueDenyArray(
        ctx: Pick<ResolverContext, 'params'>, x: PreparedParameterizedValue):
        PreparedAtomValue {

    if (! Object.prototype.hasOwnProperty.call(ctx.params, x.name)) {
        throw new Error(`Parameter '${x.name}' is not found.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const z = ctx.params![x.name] ?? null;
    if (Array.isArray(z)) {
        throw new Error(`Parameter '${x.name}' items should be atom.`);
    }
    return z;
}


function getParameterValueAllowArray(
        ctx: Pick<ResolverContext, 'params'>, x: PreparedParameterizedValue):
        PreparedAtomValue | PreparedAtomValue[] {

    if (! Object.prototype.hasOwnProperty.call(ctx.params, x.name)) {
        throw new Error(`Parameter '${x.name}' is not found.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const z = ctx.params![x.name] ?? null;
    if (Array.isArray(z)) {
        return z;
    }
    return z;
}


function filterIndexFieldCondOperands(
        ctx: Pick<ResolverContext, 'params'>,
        cond: PreparedCondition, indexFieldNamesI: string[]) {

    cond.operands = cond.operands
    .map(x => {
        switch (typeof x) {
        case 'object':
            if (Array.isArray(x)) {
                return x.map(w => {
                    if (w !== null && typeof w === 'object' && w.type === 'parameter') {
                        return getParameterValueDenyArray(ctx, w);
                    } else {
                        return w;
                    }
                });
            } else {
                if (x === null) {
                    // NOTE: never reach here.
                    return x;
                }
                switch (x.type) {
                case 'condition':
                    return pruneNonIndexFieldConditions(ctx, x, indexFieldNamesI);
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


export function pruneNonIndexFieldConditions(
        ctx: Pick<ResolverContext, 'params'>,
        cond: PreparedCondition, indexFieldNamesI: string[]): PreparedCondition {

    if (cond.operands.length) {
        {
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
                        if (! indexFieldNamesI.includes(x.name[x.name.length - 1].toLowerCase())) {
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

        {
            const y = cond.operands[1];
            switch (typeof y) {
            case 'object':
                if (y === null || Array.isArray(y)) {
                    // NOTE: Nothing to do.
                } else {
                    switch (y.type) {
                    case 'fncall': case 'subquery':
                        return ({
                            type: 'condition',
                            op: 'true',
                            operands: [],
                        });
                    case 'parameter':
                        return filterIndexFieldCondOperands(ctx, {
                            type: 'condition',
                            op: cond.op,
                            operands: [
                                cond.operands[0],
                                getParameterValueAllowArray(ctx, y),
                                ...cond.operands.slice(2),
                            ],
                        }, indexFieldNamesI);
                    }
                }
                break;
            }
        }
    }

    return filterIndexFieldCondOperands(ctx, cond, indexFieldNamesI);
}


export function getSqlConditionStringImpl(
        ctx: Pick<ResolverContext, 'params'>,
        cond: PreparedCondition, dialect: SqlDialect): string {

    switch (cond.op) {
    case 'not':
        return (
            // NOTE: It is unsafe, but compiler do not generate invalid condition tree.
            //       `x` should be `PreparedCondition`.
            `(not ${getSqlConditionStringImpl(ctx, cond.operands[0] as PreparedCondition, dialect)})`
        );
    case 'and': case 'or':
        return (
            `(${cond.operands
                // NOTE: It is unsafe, but compiler do not generate invalid condition tree.
                //       `x` should be `PreparedCondition`.
                .map(x => getSqlConditionStringImpl(ctx, x as PreparedCondition, dialect))
                .join(` ${cond.op} `)})`
        );
    case 'true': case 'includes': case 'excludes':
        return '(1=1)';
    }

    let notSupported = false;

    const getArrayValue: (x: Array<PreparedAtomValue | PreparedParameterizedValue>) => string = (x) => {
        return (
            x.map(w => {
                if (w === null) {
                    return 'null';
                } else {
                    switch (typeof w) {
                    case 'object':
                        switch (w.type) {
                        case 'date': case 'datetime':
                            return `'${w.value}'`;
                        case 'parameter':
                            return getEscapedParamValue(w, false);
                        default:
                            notSupported = true;
                            return '';
                        }
                    case 'string':
                        return `'${dialect.escapeString(w)}'`;
                    default:
                        return w.toString();
                    }
                }
            }).join(',')
        );
    };

    const getEscapedParamValue = (x: PreparedParameterizedValue, allowArray: boolean) => {
        const z = (allowArray ? getParameterValueAllowArray : getParameterValueDenyArray)(ctx, x);
        if (z === null) {
            return 'null';
        } else {
            switch (typeof z) {
            case 'object':
                if (Array.isArray(z)) {
                    return `(${getArrayValue(z)})`;
                } else {
                    return `'${z.value}'`;
                }
            case 'string':
                return `'${dialect.escapeString(z)}'`;
            default:
                return String(z);
            }
        }
    };

    const operands = cond.operands.map(x => {
        switch (typeof x) {
        case 'object':
            if (Array.isArray(x)) {
                return `(${getArrayValue(x)})`;
            } else {
                if (x === null) {
                    return 'null';
                } else {
                    switch (x.type) {
                    case 'field':
                        return dialect.fieldName(x.name[x.name.length - 1]);
                    case 'date': case 'datetime':
                        return `'${x.value}'`;
                    case 'parameter':
                        return getEscapedParamValue(x, true);
                    default:
                        notSupported = true;
                        return '';
                    }
                }
            }
        case 'string':
            return `'${dialect.escapeString(x)}'`;
        default:
            return x.toString();
        }
    });

    if (notSupported) {
        return '(1=1)';
    } else {
        return `${String(operands[0])} ${cond.op} ${String(operands[1])}`;
    }
}
