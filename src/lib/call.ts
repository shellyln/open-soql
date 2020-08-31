// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { FieldResultType,
         PreparedFnCall,
         ResolverContext,
         ScalarQueryFuncInfo,
         ImmediateScalarQueryFuncInfo,
         AggregateQueryFuncInfo } from '../types';
import { getObjectValue }         from './util';
import { nestedFnInfoCache,
         memoizedFnCache }        from './cache';



export function callScalarFunction(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        field: PreparedFnCall, fnInfo: ScalarQueryFuncInfo, fieldResultType: FieldResultType,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        record: any, groupedRecs: any[] | null): any {

    const args = field.args.map(a => {
        switch (typeof a) {
        case 'object':
            if (a === null) {
                return a;
            }
            switch (a.type) {
            case 'field':
                {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    let z = getObjectValue(record, a.name[a.name.length - 1]);
                    switch (fieldResultType) {
                    case 'date': case 'datetime':
                        z = new Date(z).getTime();
                        break;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return z;
                }
            case 'date': case 'datetime':
                switch (fieldResultType) {
                case 'date': case 'datetime':
                    return new Date(a.value).getTime();
                default:
                    return a.value;
                }
            case 'parameter':
                {
                    if (! Object.prototype.hasOwnProperty.call(ctx.params, a.name)) {
                        throw new Error(`Parameter '${a.name}' is not found.`);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const z = ctx.params![a.name] ?? null;
                    if (z === null) {
                        return null;
                    }
                    switch (fieldResultType) {
                    case 'date': case 'datetime':
                        if (Array.isArray(z)) {
                            throw new Error(`Parameter '${a.name}' should be string or number.`);
                        }
                        // NOTE: it is not type safe!
                        return new Date(z as any).getTime();
                    default:
                        return z;
                    }
                }
            case 'fncall':
                {
                    let argFnInfoTmp = nestedFnInfoCache.get(a);
                    if (! argFnInfoTmp) {
                        const argFnNameI = a.fn.toLowerCase();
                        argFnInfoTmp = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    }
                    const argFnInfo = argFnInfoTmp;

                    switch (argFnInfo?.type) {
                    case 'aggregate':
                        if (! groupedRecs) {
                            throw new Error(`Nested function ${a.fn} is not allowed.`);
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callAggregateFunction(ctx, a, argFnInfo, 'any', groupedRecs);
                    case 'scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callScalarFunction(ctx, a, argFnInfo, 'any', record, groupedRecs);
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callImmediateScalarFunction(ctx, a, argFnInfo, 'any', record, groupedRecs);
                    default:
                        throw new Error(`Nested function ${a.fn} is not allowed.`);
                    }
                }
            default:
                return a;
            }
        default:
            return a;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fnInfo.fn(ctx, args, record);
}


export function callImmediateScalarFunction(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        field: PreparedFnCall, fnInfo: ImmediateScalarQueryFuncInfo, fieldResultType: FieldResultType,
        record: any | null, groupedRecs: any[] | null): any {

    const cached = memoizedFnCache.get(field.args);
    if (cached) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return cached.value;
    }

    let hasNonImmediate = false;
    const args = field.args.map(a => {
        switch (typeof a) {
        case 'object':
            if (a === null) {
                return a;
            }
            switch (a.type) {
            case 'field':
                throw new Error(`Immediate scalar function should not refer the field (${a.name.join('.')}).`);
            case 'date': case 'datetime':
                switch (fieldResultType) {
                case 'date': case 'datetime':
                    return new Date(a.value).getTime();
                default:
                    return a.value;
                }
            case 'parameter':
                {
                    hasNonImmediate = true;

                    if (! Object.prototype.hasOwnProperty.call(ctx.params, a.name)) {
                        throw new Error(`Parameter '${a.name}' is not found.`);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const z = ctx.params![a.name] ?? null;
                    if (z === null) {
                        return null;
                    }
                    switch (fieldResultType) {
                    case 'date': case 'datetime':
                        if (Array.isArray(z)) {
                            throw new Error(`Parameter '${a.name}' should be string or number.`);
                        }
                        // NOTE: it is not type safe!
                        return new Date(z as any).getTime();
                    default:
                        return z;
                    }
                }
            case 'fncall':
                {
                    if (groupedRecs !== null || record !== null) {
                        hasNonImmediate = true;
                    }

                    let argFnInfoTmp = nestedFnInfoCache.get(a);
                    if (! argFnInfoTmp) {
                        const argFnNameI = a.fn.toLowerCase();
                        argFnInfoTmp = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    }
                    const argFnInfo = argFnInfoTmp;

                    switch (argFnInfo?.type) {
                    case 'aggregate':
                        if (groupedRecs === null) {
                            throw new Error(`Nested function ${a.fn} is not allowed.`);
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callAggregateFunction(ctx, a, argFnInfo, 'any', groupedRecs);
                    case 'scalar':
                        if (record === null) {
                            throw new Error(`Nested function ${a.fn} is not allowed.`);
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callScalarFunction(ctx, a, argFnInfo, 'any', record, groupedRecs);
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callImmediateScalarFunction(ctx, a, argFnInfo, 'any', record, groupedRecs);
                    default:
                        throw new Error(`Nested function ${a.fn} is not allowed.`);
                    }
                }
            default:
                return a;
            }
        default:
            return a;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const ret = fnInfo.fn(ctx, args);

    if (! hasNonImmediate) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        memoizedFnCache.set(field.args, { value: ret });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


export function callAggregateFunction(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        field: PreparedFnCall, fnInfo: AggregateQueryFuncInfo, fieldResultType: FieldResultType, records: any[]): any {

    const args = field.args.map(a => {
        switch (typeof a) {
        case 'object':
            if (a === null) {
                return a;
            }
            switch (a.type) {
            case 'field':
                {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    let z = records.map(w => getObjectValue(w, a.name[a.name.length - 1]));
                    switch (fieldResultType) {
                    case 'date': case 'datetime':
                        z = z.map(w => new Date(w).getTime());
                        break;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return z;
                }
            case 'date': case 'datetime':
                switch (fieldResultType) {
                case 'date': case 'datetime':
                    return new Date(a.value).getTime();
                default:
                    return a.value;
                }
            case 'parameter':
                {
                    if (! Object.prototype.hasOwnProperty.call(ctx.params, a.name)) {
                        throw new Error(`Parameter '${a.name}' is not found.`);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const z = ctx.params![a.name] ?? null;
                    if (z === null) {
                        return null;
                    }
                    switch (fieldResultType) {
                    case 'date': case 'datetime':
                        if (Array.isArray(z)) {
                            throw new Error(`Parameter '${a.name}' should be string or number.`);
                        }
                        // NOTE: it is not type safe!
                        return new Date(z as any).getTime();
                    default:
                        return z;
                    }
                }
            case 'fncall':
                {
                    let argFnInfoTmp = nestedFnInfoCache.get(a);
                    if (! argFnInfoTmp) {
                        const argFnNameI = a.fn.toLowerCase();
                        argFnInfoTmp = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    }
                    const argFnInfo = argFnInfoTmp;

                    switch (argFnInfo?.type) {
                    case 'scalar':
                        {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            const z = records.map(w => callScalarFunction(ctx, a, argFnInfo, 'any', w, records));
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            return z;
                        }
                    case 'immediate-scalar':
                        {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            const z = records.map(w => callImmediateScalarFunction(ctx, a, argFnInfo, 'any', w, records));
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            return z;
                        }
                    default:
                        throw new Error(`Nested function ${a.fn} is not allowed.`);
                    }
                }
            default:
                return a;
            }
        default:
            return a;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fnInfo.fn(ctx, args, records);
}


export function getGroupFieldTrueCaseName(groupFields: Map<string, string>, name: string): string | null {
    if (groupFields.has(name)) {
        const trueCaseName = groupFields.get(name);
        if (trueCaseName) {
            return trueCaseName;
        }
    }
    return null;
}


export function isScalarFnCallable(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        groupFields: Map<string, string>, args: PreparedFnCall['args']): boolean {

    for (const a of args) {
        switch (typeof a) {
        case 'object':
            switch (a?.type) {
            case 'field':
                {
                    const trueCaseName = getGroupFieldTrueCaseName(groupFields, a.name[a.name.length - 1]);
                    if (! trueCaseName) {
                        return false;
                    }
                }
                break;
            case 'fncall':
                {
                    const argFnNameI = a.fn.toLowerCase();
                    const argFnInfo = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    switch (argFnInfo?.type) {
                    case 'scalar':
                        if (! isScalarFnCallable(ctx, groupFields, a.args)) {
                            return false;
                        }
                    }
                }
                break;
            }
            break;
        }
    }
    return true;
}
