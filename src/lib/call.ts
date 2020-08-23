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



export function callScalarFunction(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        field: PreparedFnCall, fnInfo: ScalarQueryFuncInfo, fieldResultType: FieldResultType, record: any): any {

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
            case 'fncall':
                {
                    const argFnNameI = a.fn.toLowerCase();
                    const argFnInfo = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    switch (argFnInfo?.type) {
                    // case 'aggregate':
                    //     break;
                    case 'scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callScalarFunction(ctx, a, argFnInfo, 'any', record);
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callImmediateScalarFunction(ctx, a, argFnInfo, 'any', record);
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
        field: PreparedFnCall, fnInfo: ImmediateScalarQueryFuncInfo, fieldResultType: FieldResultType, record: any | null): any {

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
            case 'fncall':
                {
                    const argFnNameI = a.fn.toLowerCase();
                    const argFnInfo = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    switch (argFnInfo?.type) {
                    // case 'aggregate':
                    //     break;
                    case 'scalar':
                        if (record === null) {
                            throw new Error(`Nested function ${a.fn} is not allowed.`);
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callScalarFunction(ctx, a, argFnInfo, 'any', record);
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callImmediateScalarFunction(ctx, a, argFnInfo, 'any', record);
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
    return fnInfo.fn(ctx, args);
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
            case 'fncall':
                {
                    const argFnNameI = a.fn.toLowerCase();
                    const argFnInfo = ctx.functions.find(x => x.name.toLowerCase() === argFnNameI);
                    switch (argFnInfo?.type) {
                    // case 'aggregate':
                    //     break;
                    // case 'scalar':
                    //     break;
                    // case 'immediate-scalar':
                    //     break;
                    default:
                        throw new Error(`Nested function ${a.fn} is not allowed.`);
                    }
                    return null;
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
