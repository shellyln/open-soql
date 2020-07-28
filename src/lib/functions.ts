// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryFuncInfo } from '../types';



export const fnInfo_count: QueryFuncInfo = {
    type: 'aggregate',
    name: 'count',
    fn: (ctx, args, records) => {
        if (args.length === 0) {
            return records.length;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                return arg.filter(r => (r === null || r === void 0) ? false : true).length;
            }
            throw new Error(`Argument of function "count" should be field.`);
        }
    },
};


export const fnInfo_count_distinct: QueryFuncInfo = {
    type: 'aggregate',
    name: 'count_distinct',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => (r === null || r === void 0) ? false : true)
                    .map(x => JSON.stringify(x));
                return new Set<string>(w).size;
            }
        }
        throw new Error(`Argument of function "count_distinct" should be field.`);
    },
};


export const fnInfo_sum: QueryFuncInfo = {
    type: 'aggregate',
    name: 'sum',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => (typeof r === 'number' && !Number.isNaN(r)) ? true : false);
                if (w.length) {
                    return w.reduce((a, b) => (a as number) + (b as number));
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "sum" should be field.`);
    },
};


export const fnInfo_avg: QueryFuncInfo = {
    type: 'aggregate',
    name: 'avg',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => (typeof r === 'number' && !Number.isNaN(r)) ? true : false);
                if (w.length) {
                    return (w.reduce((a, b) => (a as number) + (b as number)) as number) / w.length;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "avg" should be field.`);
    },
};


export const fnInfo_max: QueryFuncInfo = {
    type: 'aggregate',
    name: 'max',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => ((typeof r === 'number' && !Number.isNaN(r)) || typeof r === 'string') ? true : false);
                if (w.length) {
                    return w.reduce((a, b) => (a as number | string) > (b as number | string) ? a : b);
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "max" should be field.`);
    },
};


export const fnInfo_min: QueryFuncInfo = {
    type: 'aggregate',
    name: 'min',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => ((typeof r === 'number' && !Number.isNaN(r)) || typeof r === 'string') ? true : false);
                if (w.length) {
                    return w.reduce((a, b) => (a as number | string) < (b as number | string) ? a : b);
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "min" should be field.`);
    },
};
