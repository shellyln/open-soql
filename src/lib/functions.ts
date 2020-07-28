// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryFuncInfo }   from '../types';
import { DatePattern,
         DateTimePattern } from './util';



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


export const fnInfo_calendar_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_month',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCMonth() + 1;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCMonth() + 1;
                }
            }
        }
        throw new Error(`Argument of function "calendar_month" should be field.`);
    },
};


export const fnInfo_calendar_quarter: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_quarter',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return (new Date(arg.value).getUTCMonth() % 4) + 1;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return (new Date(arg).getUTCMonth() % 4) + 1;
                }
            }
        }
        throw new Error(`Argument of function "calendar_quarter" should be field.`);
    },
};


export const fnInfo_calendar_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_year',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCFullYear();
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCFullYear();
                }
            }
        }
        throw new Error(`Argument of function "calendar_year" should be field.`);
    },
};


export const fnInfo_day_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_month',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCDate();
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCDate();
                }
            }
        }
        throw new Error(`Argument of function "day_in_month" should be field.`);
    },
};


export const fnInfo_day_in_week: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_week',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCDay() + 1;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCDay() + 1;
                }
            }
        }
        throw new Error(`Argument of function "day_in_week" should be field.`);
    },
};


export const fnInfo_day_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_year',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            return 0;
        }
        throw new Error(`Argument of function "day_in_year" should be field.`);
    },
};


export const fnInfo_day_only: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_only',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).toISOString().split('T')[0];
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).toISOString().split('T')[0];
                }
            }
        }
        throw new Error(`Argument of function "day_only" should be field.`);
    },
};


export const fnInfo_hour_in_day: QueryFuncInfo = {
    type: 'scalar',
    name: 'hour_in_day',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // TODO: Nothing to do. (throw error)
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCHours();
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCHours();
                }
            }
        }
        throw new Error(`Argument of function "hour_in_day" should be field.`);
    },
};


export const fnInfo_week_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_month',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            return 0;
        }
        throw new Error(`Argument of function "week_in_month" should be field.`);
    },
};


export const fnInfo_week_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_year',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            return 0;
        }
        throw new Error(`Argument of function "week_in_year" should be field.`);
    },
};
