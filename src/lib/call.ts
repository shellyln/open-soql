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



// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function callScalarFunction(ctx: ResolverContext, field: PreparedFnCall, fnInfo: ScalarQueryFuncInfo, fieldResultType: FieldResultType, record: any): any {
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


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function callImmediateScalarFunction(ctx: ResolverContext, field: PreparedFnCall, fnInfo: ImmediateScalarQueryFuncInfo, fieldResultType: FieldResultType): any {
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


export function callAggregateFunction(ctx: ResolverContext, field: PreparedFnCall, fnInfo: AggregateQueryFuncInfo, fieldResultType: FieldResultType, records: any[]): any {
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
