// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedFnCall,
         ResolverContext,
         ScalarQueryFuncInfo,
         ImmediateScalarQueryFuncInfo,
         AggregateQueryFuncInfo } from '../types';
import { getObjectValue }         from './util';



// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function callScalarFunction(ctx: ResolverContext, field: PreparedFnCall, fnInfo: ScalarQueryFuncInfo, record: any): any {
    const args = field.args.map(a => {
        switch (typeof a) {
        case 'object':
            switch (a.type) {
            case 'field':
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return getObjectValue(record, a.name[a.name.length - 1]);
            case 'date':
                return a.value; // TODO:
            case 'datetime':
                return a.value; // TODO:
            }
        default:
            return a;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fnInfo.fn(ctx, args, record); // TODO:
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function callImmediateScalarFunction(ctx: ResolverContext, field: PreparedFnCall, fnInfo: ImmediateScalarQueryFuncInfo): any {
    const args = field.args.map(a => {
        switch (typeof a) {
        case 'object':
            switch (a.type) {
            case 'field':
                throw new Error(`Immediate scalar function should not refer the field (${a.name.join('.')}).`);
            case 'date':
                return a.value; // TODO:
            case 'datetime':
                return a.value; // TODO:
            }
        default:
            return a;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fnInfo.fn(ctx, args); // TODO:
}


export function callAggregateFunction(ctx: ResolverContext, field: PreparedFnCall, fnInfo: AggregateQueryFuncInfo, records: any[]): any {
    const args = field.args.map(a => {
        switch (typeof a) {
        case 'object':
            switch (a.type) {
            case 'field':
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return records.map(w => getObjectValue(w, a.name[a.name.length - 1]));
            case 'date':
                return a.value; // TODO:
            case 'datetime':
                return a.value; // TODO:
            }
        default:
            return a;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fnInfo.fn(ctx, args, records); // TODO:
}
